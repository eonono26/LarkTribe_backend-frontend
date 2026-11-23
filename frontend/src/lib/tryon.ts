import { API_URL, API_BASE_URL } from "./config";
import { getToken } from "./auth";

export class TryOnNotConfiguredError extends Error {
  constructor() {
    super("AI try-on is not enabled yet.");
  }
}

export interface SavedLook {
  id: string;
  productId: number | string;
  productName: string;
  productSlug?: string;
  color?: string;
  /** Small JPEG data URL (local copy) or absolute URL (account copy). */
  image: string;
  savedAt: number;
}

export interface SizeAdvice {
  size: string | null;
  exact?: boolean;
  detail?: string;
  note?: string;
}

const LOCAL_KEY = "lt_saved_looks";
const MAX_LOCAL_LOOKS = 12;

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** Ask the backend to render `garment` on the shopper's photo. Photo is not stored server-side. */
export async function generateLook(opts: {
  photo: Blob;
  productId: number | string;
  color?: string;
  signal?: AbortSignal;
}): Promise<Blob> {
  const form = new FormData();
  form.append("photo", opts.photo, "photo.jpg");
  form.append("product_id", String(opts.productId));
  form.append("consent", "true");
  if (opts.color) form.append("color", opts.color);
  const res = await fetch(`${API_URL}/ai/try-on/`, {
    method: "POST",
    body: form,
    headers: authHeaders(),
    signal: opts.signal,
  });
  if (res.status === 503) throw new TryOnNotConfiguredError();
  if (!res.ok) {
    let detail = "We couldn't create this look. Please try again.";
    try {
      const body = await res.json();
      if (body?.detail) detail = String(body.detail);
    } catch { /* keep default */ }
    throw new Error(detail);
  }
  return res.blob();
}

export async function fetchSizeAdvice(params: {
  productId: number | string;
  heightCm?: number;
  weightKg?: number;
  ageYears?: number;
}): Promise<SizeAdvice> {
  const q = new URLSearchParams({ product_id: String(params.productId) });
  if (params.heightCm) q.set("height_cm", String(params.heightCm));
  if (params.weightKg) q.set("weight_kg", String(params.weightKg));
  if (params.ageYears) q.set("age_years", String(params.ageYears));
  const res = await fetch(`${API_URL}/ai/size-recommendation/?${q}`);
  if (!res.ok) throw new Error("Size guidance is unavailable right now.");
  return res.json();
}

/** Shrink a blob to a small JPEG data URL so saved looks stay light in localStorage. */
export function blobToThumb(blob: Blob, maxSide = 480): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.8));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read the image."));
    };
    img.src = url;
  });
}

function readLocal(): SavedLook[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    return raw ? (JSON.parse(raw) as SavedLook[]) : [];
  } catch {
    return [];
  }
}

function writeLocal(looks: SavedLook[]) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(looks.slice(0, MAX_LOCAL_LOOKS)));
  } catch { /* storage full or blocked: saving is best effort */ }
}

/** Saved looks: the signed-in shopper's account looks, else this device's. */
export async function listSavedLooks(): Promise<SavedLook[]> {
  if (getToken()) {
    try {
      const res = await fetch(`${API_URL}/ai/saved-looks/`, { headers: authHeaders() });
      if (res.ok) {
        const rows = (await res.json()) as Array<{
          id: number; product: number; product_name: string; product_slug: string;
          color: string; image_url: string; created_at: string;
        }>;
        return rows.map((r) => ({
          id: `srv-${r.id}`,
          productId: r.product,
          productName: r.product_name,
          productSlug: r.product_slug,
          color: r.color,
          image: r.image_url.startsWith("http") ? r.image_url : `${API_BASE_URL}${r.image_url}`,
          savedAt: new Date(r.created_at).getTime(),
        }));
      }
    } catch { /* fall through to device copy */ }
  }
  return readLocal();
}

export async function saveLook(look: Omit<SavedLook, "id" | "savedAt" | "image">, blob: Blob): Promise<void> {
  if (getToken()) {
    const form = new FormData();
    form.append("product", String(look.productId));
    form.append("color", look.color || "");
    form.append("image", blob, "look.jpg");
    const res = await fetch(`${API_URL}/ai/saved-looks/`, { method: "POST", body: form, headers: authHeaders() });
    if (res.ok) return;
  }
  const image = await blobToThumb(blob);
  writeLocal([{ ...look, image, id: `loc-${Date.now()}`, savedAt: Date.now() }, ...readLocal()]);
}

export async function deleteSavedLook(id: string): Promise<void> {
  if (id.startsWith("srv-")) {
    await fetch(`${API_URL}/ai/saved-looks/${id.slice(4)}/`, { method: "DELETE", headers: authHeaders() });
    return;
  }
  writeLocal(readLocal().filter((l) => l.id !== id));
}
