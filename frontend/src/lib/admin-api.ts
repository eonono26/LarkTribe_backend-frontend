import { authedFetch } from './auth';
import type * as T from './admin-types';

/** Error thrown by every admin call, with the parsed DRF body. */
export class ApiError extends Error {
  status: number;
  data: unknown;
  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

function humanize(data: unknown): string {
  if (typeof data === 'string') return data;
  if (Array.isArray(data)) return data.map(humanize).join(' ');
  if (data && typeof data === 'object') {
    const o = data as Record<string, unknown>;
    if (typeof o.detail === 'string') return o.detail;
    return Object.entries(o)
      .map(([k, v]) => `${k === 'non_field_errors' ? '' : `${k.replace(/_/g, ' ')}: `}${humanize(v)}`)
      .join(' · ');
  }
  return 'Something went wrong.';
}

async function call<R>(path: string, init: RequestInit = {}): Promise<R> {
  try {
    return (await authedFetch(path, init)) as R;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const m = /^API (\d+): ([\s\S]*)$/.exec(msg);
    if (m) {
      let data: unknown = m[2];
      try { data = JSON.parse(m[2]); } catch { /* keep raw text */ }
      const text = typeof data === 'string' && data.trim().startsWith('<') ? `Server error (${m[1]})` : humanize(data);
      throw new ApiError(text, Number(m[1]), data);
    }
    throw new ApiError(msg, 0, null);
  }
}

export function errorMessage(e: unknown, fallback = 'Something went wrong.'): string {
  return e instanceof Error && e.message ? e.message : fallback;
}

const qs = (p?: Record<string, string | number | boolean | undefined | null>) => {
  const u = new URLSearchParams();
  Object.entries(p ?? {}).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') u.set(k, String(v)); });
  const s = u.toString();
  return s ? `?${s}` : '';
};
const json = (method: string, body?: unknown): RequestInit => ({ method, body: body === undefined ? undefined : JSON.stringify(body) });
export type Params = Record<string, string | number | boolean | undefined | null>;

/** Resource with list/get/create/update/remove. Bodies may be JSON objects or FormData. */
function crud<Row>(base: string) {
  const body = (data: unknown, method: string): RequestInit =>
    data instanceof FormData ? { method, body: data } : json(method, data);
  return {
    list: (p?: Params) => call<T.Page<Row>>(`${base}/${qs(p)}`),
    get: (id: number) => call<Row>(`${base}/${id}/`),
    create: (data: unknown) => call<Row>(`${base}/`, body(data, 'POST')),
    update: (id: number, data: unknown) => call<Row>(`${base}/${id}/`, body(data, 'PATCH')),
    remove: (id: number) => call<void>(`${base}/${id}/`, { method: 'DELETE' }),
  };
}

function withMedia(base: string) {
  return {
    addMedia: (id: number, file: File, isPrimary = false) => {
      const fd = new FormData();
      fd.append('file', file);
      if (isPrimary) fd.append('is_primary', 'true');
      return call<T.MediaItem[]>(`${base}/${id}/media/`, { method: 'POST', body: fd });
    },
    deleteMedia: (id: number, mediaId: number) => call<T.MediaItem[]>(`${base}/${id}/media/${mediaId}/`, { method: 'DELETE' }),
    setPrimaryMedia: (id: number, mediaId: number) => call<T.MediaItem[]>(`${base}/${id}/media/${mediaId}/set-primary/`, { method: 'POST' }),
  };
}

const AP = '/admin-panel';
const asList = <R,>(r: T.Page<R> | R[]): R[] => (Array.isArray(r) ? r : r.results);

export const adminApi = {
  overview: (days = 30) => call<T.Overview>(`${AP}/overview/?days=${days}`),
  lookups: () => call<T.Lookups>(`${AP}/lookups/`),

  products: {
    ...crud<T.AdminProduct>(`${AP}/products`),
    stats: () => call<Record<'total' | 'active' | 'pending' | 'draft' | 'rejected' | 'out_of_stock' | 'low_stock', number>>(`${AP}/products/stats/`),
    approve: (id: number) => call<T.AdminProduct>(`${AP}/products/${id}/approve/`, { method: 'POST' }),
    reject: (id: number, reason: string) => call<T.AdminProduct>(`${AP}/products/${id}/reject/`, json('POST', { reason })),
    requestChanges: (id: number, feedback: string) => call<T.AdminProduct>(`${AP}/products/${id}/request-changes/`, json('POST', { feedback })),
    bulkStatus: (ids: number[], status: string, reason?: string) => call<{ updated: number }>(`${AP}/products/bulk-status/`, json('POST', { product_ids: ids, status, reason })),
    uploadImages: (id: number, files: File[], opts: { color?: string; view?: string; primary?: boolean } = {}) => {
      const fd = new FormData();
      files.forEach((f) => fd.append('image', f));
      if (opts.color) fd.append('color', opts.color);
      if (opts.view) fd.append('view', opts.view);
      if (opts.primary) fd.append('is_primary', 'true');
      return call<T.ProductImage[]>(`${AP}/products/${id}/images/`, { method: 'POST', body: fd });
    },
    updateImage: (id: number, imageId: number, data: Partial<T.ProductImage>) => call<T.ProductImage[]>(`${AP}/products/${id}/images/${imageId}/`, json('PATCH', data)),
    deleteImage: (id: number, imageId: number) => call<T.ProductImage[]>(`${AP}/products/${id}/images/${imageId}/`, { method: 'DELETE' }),
    setPrimaryImage: (id: number, imageId: number) => call<T.ProductImage[]>(`${AP}/products/${id}/images/${imageId}/set-primary/`, { method: 'POST' }),
    addVariant: (id: number, v: Partial<T.ProductVariant>) => call<T.ProductVariant[]>(`${AP}/products/${id}/variants/`, json('POST', v)),
    updateVariant: (id: number, vid: number, v: Partial<T.ProductVariant>) => call<T.ProductVariant[]>(`${AP}/products/${id}/variants/${vid}/`, json('PATCH', v)),
    deleteVariant: (id: number, vid: number) => call<T.ProductVariant[]>(`${AP}/products/${id}/variants/${vid}/`, { method: 'DELETE' }),
  },
  departments: { ...crud<T.Department>(`${AP}/departments`), ...withMedia(`${AP}/departments`) },
  categories: { ...crud<T.Category>(`${AP}/categories`), ...withMedia(`${AP}/categories`) },
  brands: { ...crud<T.Brand>(`${AP}/brands`), ...withMedia(`${AP}/brands`) },
  ageGroups: { ...crud<T.AgeGroup>(`${AP}/age-groups`), ...withMedia(`${AP}/age-groups`) },

  orders: {
    list: (p?: Params) => call<T.Page<T.AdminOrder>>(`${AP}/orders/${qs(p)}`),
    get: (id: number) => call<T.AdminOrder>(`${AP}/orders/${id}/`),
    setStatus: (id: number, status: string) => call<T.AdminOrder>(`${AP}/orders/${id}/set-status/`, json('POST', { status })),
  },
  users: crud<T.AdminUser>(`${AP}/users`),

  // ---- existing endpoints reused as they are ----
  vendors: {
    list: (p?: Params) => call<T.Page<T.Vendor> | T.Vendor[]>(`/vendors/admin/${qs(p)}`).then(asList),
    approve: (id: number) => call<T.Vendor>(`/vendors/admin/${id}/approve/`, { method: 'POST' }),
    suspend: (id: number) => call<T.Vendor>(`/vendors/admin/${id}/suspend/`, { method: 'POST' }),
  },
  coupons: { ...crud<T.Coupon>('/promotions/coupons') },
  campaigns: { ...crud<T.Campaign>('/promotions/campaigns') },
  videos: { ...crud<T.ShowcaseVideo>('/promotions/showcase-videos') },
  tickets: {
    list: (p?: Params) => call<T.Page<T.Ticket> | T.Ticket[]>(`/notifications/support-tickets/${qs(p)}`).then(asList),
    reply: (id: number, message: string) => call<unknown>(`/notifications/support-tickets/${id}/reply/`, json('POST', { message })),
    resolve: (id: number) => call<unknown>(`/notifications/support-tickets/${id}/resolve/`, { method: 'POST' }),
  },
  delivery: {
    deliveries: (status?: string) => call<T.Page<T.Delivery> | T.Delivery[]>(`/delivery/admin/deliveries/${qs({ status })}`).then(asList),
    drivers: () => call<T.Page<T.Driver> | T.Driver[]>(`/delivery/admin/drivers/`).then(asList),
    assign: (id: number, driverId: number) => call<T.Delivery>(`/delivery/admin/deliveries/${id}/assign/`, json('POST', { driver_id: driverId })),
  },
  ai: {
    dashboard: () => call<Record<string, any>>('/ai/admin/dashboard/'),
    recompute: () => call<{ updated: number }>('/ai/admin/segments/recompute/', { method: 'POST' }),
    fraud: () => call<T.Page<Record<string, any>> | Record<string, any>[]>('/ai/admin/fraud-signals/').then(asList),
  },
  reports: (days = 30) => call<Record<string, any>>(`/analytics/admin/reports/?days=${days}`),
};
