'use client';

import { useRef, useMemo, useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Switch from '@mui/material/Switch';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import CardHeader from '@mui/material/CardHeader';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Autocomplete from '@mui/material/Autocomplete';
import DialogTitle from '@mui/material/DialogTitle';
import InputAdornment from '@mui/material/InputAdornment';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import FormControlLabel from '@mui/material/FormControlLabel';
import CircularProgress from '@mui/material/CircularProgress';

import { adminApi, ApiError, errorMessage } from '@/lib/admin-api';
import { useAsync } from '@/admin-ui/hooks/use-async';
import { Iconify } from '@/admin-ui/components/iconify';
import { useRouter } from '@/admin-ui/routes/hooks';
import { Page } from '@/admin-ui/components/page-header';
import { StatusLabel } from '@/admin-ui/components/status-label';
import { useToast, useConfirm } from '@/admin-ui/components/feedback';

import type { AdminProduct, ProductImage, ProductVariant } from '@/lib/admin-types';

// ----------------------------------------------------------------------

type Form = {
  name: string; sku: string; description: string; featuresText: string; materials: string; care_instructions: string;
  price: string; compare_at_price: string; stock: string; status: string; is_featured: boolean;
  vendor: number | ''; category: number | ''; brand: number | ''; gender: string; age_groups: number[];
};

const EMPTY: Form = {
  name: '', sku: '', description: '', featuresText: '', materials: '', care_instructions: '', price: '', compare_at_price: '',
  stock: '0', status: 'active', is_featured: false, vendor: '', category: '', brand: '', gender: 'unisex', age_groups: [],
};

const fromProduct = (p: AdminProduct): Form => ({
  name: p.name, sku: p.sku, description: p.description, featuresText: (p.features ?? []).join('\n'), materials: p.materials,
  care_instructions: p.care_instructions, price: p.price, compare_at_price: p.compare_at_price ?? '', stock: String(p.stock),
  status: p.status, is_featured: p.is_featured, vendor: p.vendor, category: p.category, brand: p.brand ?? '', gender: p.gender, age_groups: p.age_groups,
});

export function ProductFormView({ productId }: { productId?: number }) {
  const isNew = productId === undefined;
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();

  const lookups = useAsync(() => adminApi.lookups(), []);
  const product = useAsync(() => (isNew ? Promise.resolve(null) : adminApi.products.get(productId!)), [productId]);

  const [form, setForm] = useState<Form>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [pending, setPending] = useState<PendingPhoto[]>([]);
  const [pendingVariants, setPendingVariants] = useState<PendingVariant[]>([]);
  const [images, setImages] = useState<ProductImage[]>([]);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (product.data) {
      setForm(fromProduct(product.data));
      setImages(product.data.images);
      setVariants(product.data.variants);
    }
  }, [product.data]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k]) setErrors((e) => { const n = { ...e }; delete n[k]; return n; });
  };

  const lk = lookups.data;
  const categoryOption = useMemo(() => lk?.categories.find((c) => c.id === form.category) ?? null, [lk, form.category]);
  const err = (k: string) => ({ error: !!errors[k], helperText: errors[k] });

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Give the product a name.';
    if (!form.sku.trim()) e.sku = 'SKU is required and must be unique.';
    if (!form.description.trim()) e.description = 'Add a description.';
    if (!form.vendor) e.vendor = 'Choose which vendor sells this.';
    if (!form.category) e.category = 'Choose a category.';
    if (!(Number(form.price) > 0)) e.price = 'Enter a price above 0.';
    if (form.compare_at_price && Number(form.compare_at_price) <= Number(form.price)) e.compare_at_price = 'Must be higher than the price.';
    if (!(Number(form.stock) >= 0) || form.stock === '') e.stock = 'Enter 0 or more.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const payload = () => ({
    name: form.name.trim(), sku: form.sku.trim(), description: form.description, materials: form.materials, care_instructions: form.care_instructions,
    features: form.featuresText.split('\n').map((s) => s.trim()).filter(Boolean),
    price: form.price, compare_at_price: form.compare_at_price || null, stock: Number(form.stock),
    status: form.status, is_featured: form.is_featured, vendor: form.vendor, category: form.category,
    brand: form.brand === '' ? null : form.brand, gender: form.gender, age_groups: form.age_groups,
  });

  const save = async () => {
    if (!validate()) { toast.error('Please fix the highlighted fields.'); return; }
    setSaving(true);
    try {
      if (isNew) {
        const created = await adminApi.products.create(payload());
        // Variants first (so colours exist), then each photo in the order it was added -
        // the first photo of a colour becomes that colour's primary automatically.
        let variantsFailed = 0;
        let photosFailed = 0;
        for (const v of pendingVariants) {
          try { await adminApi.products.addVariant(created.id, { size: v.size, color: v.color, stock: v.stock }); } catch { variantsFailed += 1; }
        }
        for (const ph of pending) {
          try { await adminApi.products.uploadImages(created.id, [ph.file], { color: ph.color, view: ph.view }); } catch { photosFailed += 1; }
        }
        if (variantsFailed || photosFailed) {
          toast.error(`Product created, but ${[variantsFailed && `${variantsFailed} variant(s)`, photosFailed && `${photosFailed} photo(s)`].filter(Boolean).join(' and ')} could not be saved. Add them on the next screen.`);
        } else toast.success('Product created.');
        router.replace(`/admin/products/${created.id}`);
      } else {
        const updated = await adminApi.products.update(productId!, payload());
        setImages(updated.images);
        setVariants(updated.variants);
        toast.success('Changes saved.');
        product.setData(updated);
      }
    } catch (e) {
      if (e instanceof ApiError && e.data && typeof e.data === 'object') {
        const fe: Record<string, string> = {};
        Object.entries(e.data as Record<string, unknown>).forEach(([k, v]) => { fe[k === 'features' ? 'featuresText' : k] = Array.isArray(v) ? String(v[0]) : String(v); });
        setErrors(fe);
      }
      toast.error(errorMessage(e));
    } finally { setSaving(false); }
  };

  const moderate = async (kind: 'approve' | 'reject') => {
    try {
      const updated = kind === 'approve' ? await adminApi.products.approve(productId!) : await adminApi.products.reject(productId!, reason);
      toast.success(kind === 'approve' ? 'Approved — the product is live.' : 'Rejected. The vendor was notified.');
      setRejectOpen(false); setReason('');
      product.setData(updated);
    } catch (e) { toast.error(errorMessage(e)); }
  };

  const remove = async () => {
    if (!(await confirm({ title: 'Delete this product?', message: 'This permanently removes the product and its photos.', confirmLabel: 'Delete', destructive: true }))) return;
    try { await adminApi.products.remove(productId!); toast.success('Product deleted.'); router.replace('/admin/products'); } catch (e) { toast.error(errorMessage(e)); }
  };

  if (!isNew && product.loading && !product.data) {
    return <Page title="Edit product"><Box sx={{ py: 10, display: 'flex', justifyContent: 'center' }}><CircularProgress /></Box></Page>;
  }
  if (!isNew && product.error) {
    return <Page title="Edit product" crumbs={[{ label: 'Products', href: '/admin/products' }, { label: 'Not found' }]}><Alert severity="error">{product.error}</Alert></Page>;
  }

  const current = product.data;

  return (
    <Page
      title={isNew ? 'New product' : form.name || 'Edit product'}
      crumbs={[{ label: 'Products', href: '/admin/products' }, { label: isNew ? 'New' : 'Edit' }]}
      action={
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          {!isNew && <Button color="error" onClick={remove}>Delete</Button>}
          <Button variant="contained" color="inherit" onClick={save} loading={saving}>{isNew ? 'Create product' : 'Save changes'}</Button>
        </Box>
      }
    >
      {!isNew && current?.status === 'pending' && (
        <Alert severity="warning" sx={{ mb: 3 }} action={
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button size="small" color="success" variant="contained" onClick={() => moderate('approve')}>Approve</Button>
            <Button size="small" color="error" variant="outlined" onClick={() => setRejectOpen(true)}>Reject…</Button>
          </Box>
        }>
          This product is waiting for review by {current.vendor_name}&apos;s moderator (you).
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Card>
              <CardHeader title="1 · Details" />
              <Box sx={{ p: 3, pt: 2.5, display: 'flex', flexDirection: 'column', gap: 3 }}>
                <TextField required label="Product name" value={form.name} onChange={(e) => set('name', e.target.value)} {...err('name')} />
                <TextField required multiline minRows={4} label="Description" value={form.description} onChange={(e) => set('description', e.target.value)} {...err('description')} />
                <TextField multiline minRows={3} label="Key features" value={form.featuresText} onChange={(e) => set('featuresText', e.target.value)}
                  helperText={errors.featuresText || 'One feature per line — shown as bullet points on the product page.'} error={!!errors.featuresText} />
                <Grid container spacing={3}>
                  <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth label="Materials" value={form.materials} onChange={(e) => set('materials', e.target.value)} placeholder="e.g. 100% organic cotton" /></Grid>
                  <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth label="Care instructions" value={form.care_instructions} onChange={(e) => set('care_instructions', e.target.value)} placeholder="e.g. Machine wash cold" /></Grid>
                </Grid>
              </Box>
            </Card>

            <VariantsCard
              productId={productId} variants={variants} setVariants={setVariants}
              pendingVariants={pendingVariants} setPendingVariants={setPendingVariants}
            />

            <ImagesCard
              productId={productId}
              images={images}
              variants={variants}
              pendingVariants={pendingVariants}
              setImages={setImages}
              pending={pending}
              setPending={setPending}
            />
          </Box>
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Card>
              <CardHeader title="Visibility" action={!isNew && current ? <StatusLabel value={current.status} /> : undefined} />
              <Box sx={{ p: 3, pt: 2.5, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField select label="Status" value={form.status} onChange={(e) => set('status', e.target.value)}
                  helperText="Only Active products appear in the store.">
                  {(lk?.product_statuses ?? [{ value: 'active', label: 'Active' }]).map((s) => <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>)}
                </TextField>
                <FormControlLabel control={<Switch checked={form.is_featured} onChange={(e) => set('is_featured', e.target.checked)} />} label="Featured on the storefront" />
              </Box>
            </Card>

            <Card>
              <CardHeader title="Organisation" />
              <Box sx={{ p: 3, pt: 2.5, display: 'flex', flexDirection: 'column', gap: 3 }}>
                <TextField select required label="Vendor" value={form.vendor} onChange={(e) => set('vendor', Number(e.target.value))} {...err('vendor')}>
                  {(lk?.vendors ?? []).map((v) => <MenuItem key={v.id} value={v.id}>{v.store_name}{v.status !== 'approved' ? ` (${v.status})` : ''}</MenuItem>)}
                </TextField>
                <Autocomplete
                  options={lk?.categories ?? []}
                  value={categoryOption}
                  groupBy={(o) => o.label.split(' › ')[0]}
                  getOptionLabel={(o) => o.label.split(' › ').slice(1).join(' › ') || o.label}
                  isOptionEqualToValue={(a, b) => a.id === b.id}
                  onChange={(_, v) => set('category', v ? v.id : '')}
                  renderInput={(params) => <TextField {...params} required label="Category" {...err('category')} />}
                />
                <TextField select label="Brand" value={form.brand} onChange={(e) => set('brand', e.target.value === '' ? '' : Number(e.target.value))}>
                  <MenuItem value="">No brand</MenuItem>
                  {(lk?.brands ?? []).map((b) => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
                </TextField>
                <TextField select label="Gender" value={form.gender} onChange={(e) => set('gender', e.target.value)}>
                  {(lk?.genders ?? [{ value: 'unisex', label: 'Unisex' }]).map((g) => <MenuItem key={g.value} value={g.value}>{g.label}</MenuItem>)}
                </TextField>
                <Autocomplete
                  multiple
                  options={lk?.age_groups ?? []}
                  value={(lk?.age_groups ?? []).filter((a) => form.age_groups.includes(a.id))}
                  getOptionLabel={(o) => o.name}
                  isOptionEqualToValue={(a, b) => a.id === b.id}
                  onChange={(_, v) => set('age_groups', v.map((x) => x.id))}
                  renderTags={(v, getProps) => v.map((o, i) => { const { key, ...p } = getProps({ index: i }); return <Chip key={key} size="small" label={o.name} {...p} />; })}
                  renderInput={(params) => <TextField {...params} label="Age groups" />}
                />
              </Box>
            </Card>

            <Card>
              <CardHeader title="Pricing & inventory" />
              <Box sx={{ p: 3, pt: 2.5, display: 'flex', flexDirection: 'column', gap: 3 }}>
                <TextField required type="number" label="Price" value={form.price} onChange={(e) => set('price', e.target.value)}
                  slotProps={{ input: { startAdornment: <InputAdornment position="start">KES</InputAdornment> }, htmlInput: { min: 0, step: '0.01' } }} {...err('price')} />
                <TextField type="number" label="Compare-at price" value={form.compare_at_price} onChange={(e) => set('compare_at_price', e.target.value)}
                  slotProps={{ input: { startAdornment: <InputAdornment position="start">KES</InputAdornment> }, htmlInput: { min: 0, step: '0.01' } }}
                  error={!!errors.compare_at_price} helperText={errors.compare_at_price || 'Optional. The crossed-out “was” price that shows a discount.'} />
                <TextField required type="number" label="Stock" value={form.stock} onChange={(e) => set('stock', e.target.value)} slotProps={{ htmlInput: { min: 0 } }} {...err('stock')} />
                <TextField required label="SKU" value={form.sku} onChange={(e) => set('sku', e.target.value)} error={!!errors.sku} helperText={errors.sku || 'Unique code, e.g. WMN-DRS-001'} />
              </Box>
            </Card>
          </Box>
        </Grid>
      </Grid>

      <Dialog open={rejectOpen} onClose={() => setRejectOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Reject product</DialogTitle>
        <DialogContent>
          <TextField autoFocus fullWidth multiline minRows={3} label="Reason (sent to the vendor)" value={reason} onChange={(e) => setReason(e.target.value)} sx={{ mt: 1 }} />
        </DialogContent>
        <DialogActions>
          <Button color="inherit" onClick={() => setRejectOpen(false)}>Cancel</Button>
          <Button color="error" variant="contained" disabled={!reason.trim()} onClick={() => moderate('reject')}>Reject</Button>
        </DialogActions>
      </Dialog>
    </Page>
  );
}

// ----------------------------------------------------------------------

// Photos / variants chosen on the New-product screen, uploaded right after the product is created.
type PendingPhoto = { file: File; color: string; view: ProductImage['view'] };
type PendingVariant = { size: string; color: string; stock: number };

const VIEW_OPTIONS: { value: ProductImage['view']; label: string }[] = [
  { value: 'front', label: 'Front' },
  { value: 'back', label: 'Back' },
  { value: 'side', label: 'Side' },
  { value: 'detail', label: 'Detail' },
  { value: 'other', label: 'Other' },
];

const colorKey = (c: string) => (c || '').trim().toLowerCase();
const galleryOrder = (a: ProductImage, b: ProductImage) =>
  Number(b.is_primary) - Number(a.is_primary) || a.order - b.order || a.id - b.id;

function ImagesCard({ productId, images, variants, pendingVariants, setImages, pending, setPending }: {
  productId?: number; images: ProductImage[]; variants: ProductVariant[]; pendingVariants: PendingVariant[];
  setImages: (i: ProductImage[]) => void; pending: PendingPhoto[]; setPending: (p: PendingPhoto[]) => void;
}) {
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [color, setColor] = useState('');
  const [view, setView] = useState<ProductImage['view']>('front');
  const isNew = productId === undefined;
  const previews = useMemo(() => pending.map((p) => URL.createObjectURL(p.file)), [pending]);
  useEffect(() => () => previews.forEach(URL.revokeObjectURL), [previews]);

  const variantColors = useMemo(
    () => [...new Set((isNew ? pendingVariants : variants).map((v) => v.color.trim()).filter(Boolean))],
    [isNew, variants, pendingVariants],
  );

  // One gallery per colour: variant colours first (even if still empty), then any
  // colour that only exists on photos, then general shots. On the New screen the
  // "photos" are the staged ones, shown the same way.
  type Tile = { key: string; url: string | null; alt: string; view: ProductImage['view']; image?: ProductImage; pendingIndex?: number; color: string };
  const groups = useMemo(() => {
    const tiles: Tile[] = isNew
      ? pending.map((p, i) => ({ key: `p${i}`, url: previews[i], alt: '', view: p.view, pendingIndex: i, color: p.color }))
      : [...images].sort(galleryOrder).map((i) => ({ key: `i${i.id}`, url: i.url, alt: i.alt_text, view: i.view, image: i, color: i.color }));
    const map = new Map<string, { color: string; items: Tile[] }>();
    variantColors.forEach((c) => map.set(colorKey(c), { color: c, items: [] }));
    tiles.filter((t) => t.color).forEach((t) => {
      const k = colorKey(t.color);
      if (!map.has(k)) map.set(k, { color: t.color, items: [] });
      map.get(k)!.items.push(t);
    });
    const list = [...map.values()];
    const general = tiles.filter((t) => !t.color);
    if (general.length) list.push({ color: '', items: general });
    return list;
  }, [isNew, images, pending, previews, variantColors]);

  const pick = async (files: FileList | null) => {
    if (!files?.length) return;
    const list = Array.from(files);
    const tooBig = list.find((f) => f.size > 5 * 1024 * 1024);
    if (tooBig) { toast.error(`“${tooBig.name}” is over 5 MB.`); return; }
    if (isNew) {
      setPending([...pending, ...list.map((file) => ({ file, color: color.trim(), view }))]);
      if (input.current) input.current.value = '';
      return;
    }
    setBusy(true);
    try {
      // The first photo of a colour becomes its primary automatically (server-side).
      setImages(await adminApi.products.uploadImages(productId!, list, { color: color.trim(), view }));
      toast.success(`${list.length} photo${list.length > 1 ? 's' : ''} added${color.trim() ? ` to ${color.trim()}` : ''}.`);
    } catch (e) { toast.error(errorMessage(e)); } finally { setBusy(false); if (input.current) input.current.value = ''; }
  };

  const act = async (fn: () => Promise<ProductImage[]>, ok?: string) => {
    setBusy(true);
    try { setImages(await fn()); if (ok) toast.success(ok); } catch (e) { toast.error(errorMessage(e)); } finally { setBusy(false); }
  };

  // Swap a photo with its neighbour inside its colour gallery, then renumber
  // the gallery 0..n so display order is unambiguous.
  const move = async (items: ProductImage[], index: number, dir: -1 | 1) => {
    const next = [...items];
    [next[index], next[index + dir]] = [next[index + dir], next[index]];
    setBusy(true);
    try {
      let latest = images;
      for (let n = 0; n < next.length; n += 1) {
        if (next[n].order !== n) latest = await adminApi.products.updateImage(productId!, next[n].id, { order: n });
      }
      setImages(latest);
    } catch (e) { toast.error(errorMessage(e)); } finally { setBusy(false); }
  };

  const noColours = variantColors.length === 0;

  return (
    <Card>
      <CardHeader
        title="3 · Photos by colour"
        subheader="Shoppers who pick a colour see only that colour's photos: the primary photo first, then the other angles in order."
      />
      <Box sx={{ p: 3, pt: 1 }}>
        {noColours && (
          <Alert severity="info" sx={{ mb: 2 }}>
            No colours yet. Add colours in step 2 above to give each colour its own photos. Photos added now are general and shown for every colour.
          </Alert>
        )}

        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'flex-start', mb: 3 }}>
          <Autocomplete
            freeSolo size="small" options={variantColors} inputValue={color} onInputChange={(_, v) => setColor(v)}
            sx={{ width: 220 }}
            renderInput={(params) => <TextField {...params} label="Colour" helperText={noColours ? 'General photo' : 'Choose which colour these photos show'} />}
          />
          <TextField select size="small" label="Angle" value={view} onChange={(e) => setView(e.target.value as ProductImage['view'])} sx={{ width: 140 }}>
            {VIEW_OPTIONS.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
          </TextField>
          <Button variant="contained" color="inherit" disabled={busy} onClick={() => input.current?.click()}
            startIcon={busy ? <CircularProgress size={18} /> : <Iconify icon="solar:gallery-add-bold" />} sx={{ height: 40 }}>
            Add photos
          </Button>
        </Box>

        {groups.map((g) => (
          <Box key={g.color || '__general'} sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <Typography variant="subtitle2">{g.color || 'General photos'}</Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>{g.items.length} photo{g.items.length === 1 ? '' : 's'}</Typography>
            </Box>
            {g.items.length === 0 ? (
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>No photos for this colour yet — choose “{g.color}” above and add some.</Typography>
            ) : (
              <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
                {g.items.map((t, i) => {
                  const img = t.image;
                  const items = g.items.map((x) => x.image).filter((x): x is ProductImage => !!x);
                  const isPrimary = img ? img.is_primary : i === 0;
                  return (
                    <Box key={t.key}>
                      <Box sx={{ position: 'relative', borderRadius: 1.5, overflow: 'hidden', border: (th) => `1px ${img ? 'solid' : 'dashed'} ${th.vars.palette.divider}`, aspectRatio: '3 / 4', bgcolor: 'background.neutral' }}>
                        {t.url && <Box component="img" src={t.url} alt={t.alt} sx={{ width: 1, height: 1, objectFit: 'cover', opacity: img ? 1 : 0.85 }} />}
                        {isPrimary && <Chip size="small" color="primary" label="Primary" sx={{ position: 'absolute', top: 8, left: 8 }} />}
                        <Chip size="small" label={img ? `#${i + 1}` : 'Saves on create'} sx={{ position: 'absolute', bottom: 8, left: 8, bgcolor: 'background.paper' }} />
                        <Box sx={{ position: 'absolute', top: 4, right: 4, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                          {img && !img.is_primary && (
                            <IconButton size="small" title="Make primary for this colour" disabled={busy} sx={{ bgcolor: 'background.paper', '&:hover': { bgcolor: 'background.paper' } }}
                              onClick={() => act(() => adminApi.products.setPrimaryImage(productId!, img.id), 'Primary photo updated.')}>
                              <Iconify icon="solar:star-bold" width={18} />
                            </IconButton>
                          )}
                          <IconButton size="small" title="Remove photo" disabled={busy} sx={{ bgcolor: 'background.paper', color: 'error.main', '&:hover': { bgcolor: 'background.paper' } }}
                            onClick={() => (img
                              ? act(() => adminApi.products.deleteImage(productId!, img.id), 'Photo removed.')
                              : setPending(pending.filter((_, j) => j !== t.pendingIndex)))}>
                            <Iconify icon="solar:trash-bin-trash-bold" width={18} />
                          </IconButton>
                        </Box>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.75 }}>
                        <TextField
                          select size="small" fullWidth value={t.view} disabled={busy} aria-label="Angle"
                          onChange={(e) => {
                            const v = e.target.value as ProductImage['view'];
                            if (img) act(() => adminApi.products.updateImage(productId!, img.id, { view: v }));
                            else setPending(pending.map((p, j) => (j === t.pendingIndex ? { ...p, view: v } : p)));
                          }}
                        >
                          {VIEW_OPTIONS.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
                        </TextField>
                        {img && (
                          <>
                            <IconButton size="small" title="Move earlier" disabled={busy || i === 0 || img.is_primary || items[i - 1]?.is_primary} onClick={() => move(items, i, -1)}>
                              <Iconify icon="eva:arrow-ios-back-fill" width={18} />
                            </IconButton>
                            <IconButton size="small" title="Move later" disabled={busy || i === items.length - 1 || img.is_primary} onClick={() => move(items, i, 1)}>
                              <Iconify icon="eva:arrow-ios-forward-fill" width={18} />
                            </IconButton>
                          </>
                        )}
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            )}
          </Box>
        ))}

        <input ref={input} hidden type="file" accept="image/*" multiple onChange={(e) => pick(e.target.files)} />
        <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
          {isNew
            ? 'Photos are uploaded when you create the product. '
            : 'Changes to photos are saved immediately. '}
          Tip: add the Front view first — it becomes the colour&apos;s primary. JPG/PNG/WebP, up to 5 MB each.
        </Typography>
      </Box>
    </Card>
  );
}

function VariantsCard({ productId, variants, setVariants, pendingVariants, setPendingVariants }: {
  productId?: number; variants: ProductVariant[]; setVariants: (v: ProductVariant[]) => void;
  pendingVariants: PendingVariant[]; setPendingVariants: (v: PendingVariant[]) => void;
}) {
  const toast = useToast();
  const isNew = productId === undefined;
  const [draft, setDraft] = useState({ size: '', color: '', stock: '0' });
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<ProductVariant[]>, ok?: string) => {
    setBusy(true);
    try { setVariants(await fn()); if (ok) toast.success(ok); } catch (e) { toast.error(errorMessage(e)); } finally { setBusy(false); }
  };

  const addDraft = async () => {
    const entry = { size: draft.size.trim(), color: draft.color.trim(), stock: Number(draft.stock) || 0 };
    if (isNew) setPendingVariants([...pendingVariants, entry]);
    else await run(() => adminApi.products.addVariant(productId!, entry), 'Variant added.');
    setDraft({ size: '', color: draft.color, stock: '0' }); // keep the colour: usually the next row is another size
  };

  const draftRow = (
    <Box sx={{ mt: 1, pt: 2, borderTop: (t) => `1px dashed ${t.vars.palette.divider}`, display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
      <TextField size="small" label="Colour" value={draft.color} onChange={(e) => setDraft({ ...draft, color: e.target.value })} sx={{ width: 140 }} />
      <TextField size="small" label="Size" value={draft.size} onChange={(e) => setDraft({ ...draft, size: e.target.value })} sx={{ width: 110 }} />
      <TextField size="small" type="number" label="Stock" value={draft.stock} onChange={(e) => setDraft({ ...draft, stock: e.target.value })} sx={{ width: 100 }} slotProps={{ htmlInput: { min: 0 } }} />
      <Button variant="outlined" color="inherit" disabled={busy || (!draft.size.trim() && !draft.color.trim())} startIcon={<Iconify icon="mingcute:add-line" />} onClick={addDraft}>
        Add colour / size
      </Button>
    </Box>
  );

  return (
    <Card>
      <CardHeader
        title="2 · Colours & sizes"
        subheader="One row per colour + size, each with its own stock. The colours you add here are the ones you can add photos for in step 3."
      />
      <Box sx={{ p: 3, pt: 2.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {isNew ? (
          <>
            {pendingVariants.map((v, i) => (
              <Box key={`${v.color}-${v.size}-${i}`} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <TextField size="small" label="Colour" value={v.color} sx={{ width: 140 }} slotProps={{ input: { readOnly: true } }} />
                <TextField size="small" label="Size" value={v.size} sx={{ width: 110 }} slotProps={{ input: { readOnly: true } }} />
                <TextField size="small" label="Stock" value={v.stock} sx={{ width: 100 }} slotProps={{ input: { readOnly: true } }} />
                <IconButton color="error" onClick={() => setPendingVariants(pendingVariants.filter((_, j) => j !== i))}><Iconify icon="solar:trash-bin-trash-bold" /></IconButton>
              </Box>
            ))}
            {!pendingVariants.length && <Typography variant="body2" sx={{ color: 'text.secondary' }}>No colours or sizes yet — the product will be sold as a single option. They are saved when you create the product.</Typography>}
          </>
        ) : (
          <>
            {variants.map((v) => (
              <Box key={v.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <TextField size="small" label="Colour" defaultValue={v.color} sx={{ width: 140 }} onBlur={(e) => e.target.value !== v.color && run(() => adminApi.products.updateVariant(productId!, v.id, { color: e.target.value }))} />
                <TextField size="small" label="Size" defaultValue={v.size} sx={{ width: 110 }} onBlur={(e) => e.target.value !== v.size && run(() => adminApi.products.updateVariant(productId!, v.id, { size: e.target.value }))} />
                <TextField size="small" type="number" label="Stock" defaultValue={v.stock} sx={{ width: 100 }} slotProps={{ htmlInput: { min: 0 } }}
                  onBlur={(e) => Number(e.target.value) !== v.stock && run(() => adminApi.products.updateVariant(productId!, v.id, { stock: Number(e.target.value) }), 'Stock updated.')} />
                <IconButton color="error" disabled={busy} onClick={() => run(() => adminApi.products.deleteVariant(productId!, v.id), 'Variant removed.')}><Iconify icon="solar:trash-bin-trash-bold" /></IconButton>
              </Box>
            ))}
            {!variants.length && <Typography variant="body2" sx={{ color: 'text.secondary' }}>No variants yet — the product is sold as a single option.</Typography>}
          </>
        )}
        {draftRow}
      </Box>
    </Card>
  );
}
