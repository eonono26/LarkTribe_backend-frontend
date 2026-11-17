'use client';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Card from '@mui/material/Card';
import Tabs from '@mui/material/Tabs';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Switch from '@mui/material/Switch';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import FormControlLabel from '@mui/material/FormControlLabel';

import { adminApi, ApiError, errorMessage } from '@/lib/admin-api';
import { useAsync } from '@/admin-ui/hooks/use-async';
import { dateTime } from '@/admin-ui/utils/format';
import { Label } from '@/admin-ui/components/label';
import { Iconify } from '@/admin-ui/components/iconify';
import { Page } from '@/admin-ui/components/page-header';
import { DataTable } from '@/admin-ui/components/data-table';
import { RowActions } from '@/admin-ui/components/row-actions';
import { useToast, useConfirm } from '@/admin-ui/components/feedback';

import type { Coupon, Campaign, ShowcaseVideo } from '@/lib/admin-types';
import type { Column } from '@/admin-ui/components/data-table';

// ----------------------------------------------------------------------

const toLocalInput = (iso?: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};
const fromLocalInput = (v: string) => (v ? new Date(v).toISOString() : null);

function fieldErrors(err: unknown): Record<string, string> {
  const fe: Record<string, string> = {};
  if (err instanceof ApiError && err.data && typeof err.data === 'object') {
    Object.entries(err.data as Record<string, unknown>).forEach(([k, v]) => { fe[k] = Array.isArray(v) ? String(v[0]) : String(v); });
  }
  return fe;
}

export function PromotionsView() {
  const [tab, setTab] = useState<'coupons' | 'campaigns' | 'videos'>('coupons');
  return (
    <Page title="Promotions" subtitle="Discount codes, homepage campaigns and showcase videos.">
      <Card>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 2.5, boxShadow: (t) => `inset 0 -2px 0 0 ${t.vars.palette.divider}` }}>
          <Tab value="coupons" label="Coupons" />
          <Tab value="campaigns" label="Campaigns & banners" />
          <Tab value="videos" label="Showcase videos" />
        </Tabs>
        {tab === 'coupons' && <CouponsTab />}
        {tab === 'campaigns' && <CampaignsTab />}
        {tab === 'videos' && <VideosTab />}
      </Card>
    </Page>
  );
}

function Toolbar({ label, onAdd }: { label: string; onAdd: () => void }) {
  return (
    <Box sx={{ p: 2.5, display: 'flex', justifyContent: 'flex-end' }}>
      <Button variant="contained" color="inherit" startIcon={<Iconify icon="mingcute:add-line" />} onClick={onAdd}>{label}</Button>
    </Box>
  );
}

// ---------------------------------------------------------------- coupons

function CouponsTab() {
  const toast = useToast();
  const confirm = useConfirm();
  const [editing, setEditing] = useState<Coupon | 'new' | null>(null);
  const list = useAsync(() => adminApi.coupons.list({ page_size: 200 }), []);

  const remove = async (c: Coupon) => {
    if (!(await confirm({ title: `Delete coupon ${c.code}?`, confirmLabel: 'Delete', destructive: true }))) return;
    try { await adminApi.coupons.remove(c.id); toast.success('Coupon deleted.'); list.reload(); } catch (e) { toast.error(errorMessage(e)); }
  };

  const columns: Column<Coupon>[] = [
    { id: 'code', label: 'Code', render: (c) => <Typography variant="subtitle2" sx={{ fontFamily: 'monospace' }}>{c.code}</Typography> },
    { id: 'off', label: 'Discount', render: (c) => (c.percent_off ? `${c.percent_off}% off` : c.amount_off ? `KES ${Number(c.amount_off).toLocaleString()} off` : '—') },
    { id: 'until', label: 'Valid until', render: (c) => (c.valid_until ? dateTime(c.valid_until) : 'No expiry') },
    { id: 'public', label: 'Visibility', render: (c) => <Label color={c.is_public ? 'info' : 'default'}>{c.is_public ? 'Public' : 'Private'}</Label> },
    { id: 'active', label: 'Status', render: (c) => <Label color={c.active ? 'success' : 'default'}>{c.active ? 'Active' : 'Disabled'}</Label> },
    { id: 'a', label: '', align: 'right', width: 56, render: (c) => <RowActions actions={[{ label: 'Edit', icon: 'solar:pen-bold', onClick: () => setEditing(c) }, { label: 'Delete', icon: 'solar:trash-bin-trash-bold', color: 'error', dividerBefore: true, onClick: () => remove(c) }]} /> },
  ];

  return (
    <>
      <Toolbar label="New coupon" onAdd={() => setEditing('new')} />
      {list.error && <Alert severity="error" sx={{ mx: 2.5, mb: 2 }}>{list.error}</Alert>}
      <DataTable columns={columns} rows={list.data?.results ?? []} rowKey={(c) => c.id} loading={list.loading} total={list.data?.count ?? 0} page={0} rowsPerPage={200} onPageChange={() => {}} onRowsPerPageChange={() => {}} onRowClick={(c) => setEditing(c)} emptyText="No coupons yet." />
      {editing && <CouponDialog coupon={editing === 'new' ? null : editing} onClose={(ch) => { setEditing(null); if (ch) list.reload(); }} />}
    </>
  );
}

function CouponDialog({ coupon, onClose }: { coupon: Coupon | null; onClose: (changed: boolean) => void }) {
  const toast = useToast();
  const [f, setF] = useState({ code: coupon?.code ?? '', kind: coupon?.amount_off ? 'amount' : 'percent', value: String(coupon?.percent_off ?? coupon?.amount_off ?? ''), valid_until: toLocalInput(coupon?.valid_until), active: coupon?.active ?? true, is_public: coupon?.is_public ?? false });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: unknown) => { setF((s) => ({ ...s, [k]: v })); setErrors((e) => ({ ...e, [k]: '' })); };

  const save = async () => {
    const e: Record<string, string> = {};
    if (!f.code.trim()) e.code = 'Required';
    if (!(Number(f.value) > 0)) e.value = 'Enter a value above 0.';
    if (f.kind === 'percent' && Number(f.value) > 100) e.value = 'A percentage can’t exceed 100.';
    if (Object.keys(e).length) { setErrors(e); return; }
    setSaving(true);
    try {
      const body = { code: f.code.trim().toUpperCase(), percent_off: f.kind === 'percent' ? Number(f.value) : null, amount_off: f.kind === 'amount' ? f.value : null, valid_until: fromLocalInput(f.valid_until), active: f.active, is_public: f.is_public };
      if (coupon) await adminApi.coupons.update(coupon.id, body); else await adminApi.coupons.create(body);
      toast.success(coupon ? 'Coupon updated.' : 'Coupon created.'); onClose(true);
    } catch (err) { setErrors(fieldErrors(err)); toast.error(errorMessage(err)); } finally { setSaving(false); }
  };

  return (
    <Dialog open onClose={() => onClose(false)} maxWidth="sm" fullWidth>
      <DialogTitle>{coupon ? 'Edit coupon' : 'New coupon'}</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 1, display: 'grid', gap: 2.5, gridTemplateColumns: 'repeat(2, 1fr)' }}>
          <TextField required label="Code" value={f.code} onChange={(e) => set('code', e.target.value)} sx={{ gridColumn: 'span 2' }} error={!!errors.code} helperText={errors.code || 'Customers type this at checkout, e.g. WELCOME10'} />
          <TextField select label="Discount type" value={f.kind} onChange={(e) => set('kind', e.target.value)}>
            <MenuItem value="percent">Percentage</MenuItem><MenuItem value="amount">Fixed amount (KES)</MenuItem>
          </TextField>
          <TextField required type="number" label={f.kind === 'percent' ? 'Percent off' : 'KES off'} value={f.value} onChange={(e) => set('value', e.target.value)} error={!!errors.value || !!errors.percent_off || !!errors.amount_off} helperText={errors.value || errors.percent_off || errors.amount_off} />
          <TextField type="datetime-local" label="Valid until" value={f.valid_until} onChange={(e) => set('valid_until', e.target.value)} slotProps={{ inputLabel: { shrink: true } }} helperText="Leave empty for no expiry." sx={{ gridColumn: 'span 2' }} />
          <FormControlLabel control={<Switch checked={f.active} onChange={(e) => set('active', e.target.checked)} />} label="Active" />
          <FormControlLabel control={<Switch checked={f.is_public} onChange={(e) => set('is_public', e.target.checked)} />} label="Show in customers' coupon list" />
        </Box>
      </DialogContent>
      <DialogActions><Button color="inherit" onClick={() => onClose(false)}>Cancel</Button><Button variant="contained" color="inherit" loading={saving} onClick={save}>{coupon ? 'Save' : 'Create'}</Button></DialogActions>
    </Dialog>
  );
}

// -------------------------------------------------------------- campaigns

const PLACEMENTS = [['homepage_banner', 'Homepage banner'], ['category_banner', 'Category banner'], ['email', 'Email blast'], ['push', 'Push notification']];
const STYLES = [['hero', 'Hero (large image + headline)'], ['strip', 'Strip (thin announcement bar)'], ['split', 'Split (image beside text)'], ['countdown', 'Countdown (flash sale)'], ['card', 'Card (compact tile)']];

function CampaignsTab() {
  const toast = useToast();
  const confirm = useConfirm();
  const [editing, setEditing] = useState<Campaign | 'new' | null>(null);
  const list = useAsync(() => adminApi.campaigns.list({ page_size: 200 }), []);

  const remove = async (c: Campaign) => {
    if (!(await confirm({ title: `Delete “${c.title}”?`, confirmLabel: 'Delete', destructive: true }))) return;
    try { await adminApi.campaigns.remove(c.id); toast.success('Campaign deleted.'); list.reload(); } catch (e) { toast.error(errorMessage(e)); }
  };

  const columns: Column<Campaign>[] = [
    {
      id: 't', label: 'Campaign',
      render: (c) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ width: 72, height: 44, borderRadius: 1, flexShrink: 0, bgcolor: c.background_color || 'background.neutral', backgroundImage: c.image ? `url(${c.image})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center' }} />
          <Box><Typography variant="subtitle2">{c.title}</Typography>{c.is_ai_generated && <Label color="info">AI</Label>}</Box>
        </Box>
      ),
    },
    { id: 'p', label: 'Placement', render: (c) => `${PLACEMENTS.find((p) => p[0] === c.placement)?.[1] ?? c.placement} · ${c.style}` },
    { id: 'w', label: 'Runs', render: (c) => (<><Typography variant="body2">{dateTime(c.starts_at)}</Typography><Typography variant="caption" color="text.secondary">{c.ends_at ? `until ${dateTime(c.ends_at)}` : 'no end date'}</Typography></>) },
    { id: 's', label: 'Status', render: (c) => (c.is_live ? <Label color="success">Live</Label> : c.active ? <Label color="warning">Scheduled / ended</Label> : <Label>Off</Label>) },
    { id: 'a', label: '', align: 'right', width: 56, render: (c) => <RowActions actions={[{ label: 'Edit', icon: 'solar:pen-bold', onClick: () => setEditing(c) }, { label: 'Delete', icon: 'solar:trash-bin-trash-bold', color: 'error', dividerBefore: true, onClick: () => remove(c) }]} /> },
  ];

  return (
    <>
      <Toolbar label="New campaign" onAdd={() => setEditing('new')} />
      {list.error && <Alert severity="error" sx={{ mx: 2.5, mb: 2 }}>{list.error}</Alert>}
      <DataTable columns={columns} rows={list.data?.results ?? []} rowKey={(c) => c.id} loading={list.loading} total={list.data?.count ?? 0} page={0} rowsPerPage={200} onPageChange={() => {}} onRowsPerPageChange={() => {}} onRowClick={(c) => setEditing(c)} emptyText="No campaigns yet." />
      {editing && <CampaignDialog campaign={editing === 'new' ? null : editing} onClose={(ch) => { setEditing(null); if (ch) list.reload(); }} />}
    </>
  );
}

function CampaignDialog({ campaign, onClose }: { campaign: Campaign | null; onClose: (changed: boolean) => void }) {
  const toast = useToast();
  const lookups = useAsync(() => adminApi.lookups(), []);
  const coupons = useAsync(() => adminApi.coupons.list({ page_size: 200 }), []);
  const [f, setF] = useState({
    title: campaign?.title ?? '', description: campaign?.description ?? '', placement: campaign?.placement ?? 'homepage_banner', style: campaign?.style ?? 'hero',
    background_color: campaign?.background_color ?? '', cta_label: campaign?.cta_label ?? 'Shop now', link_url: campaign?.link_url ?? '',
    department: campaign?.department ?? '', coupon: campaign?.coupon ?? '', active: campaign?.active ?? true,
    starts_at: toLocalInput(campaign?.starts_at ?? new Date().toISOString()), ends_at: toLocalInput(campaign?.ends_at),
  });
  const [file, setFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: unknown) => { setF((s) => ({ ...s, [k]: v })); setErrors((e) => ({ ...e, [k]: '' })); };

  const save = async () => {
    if (!f.title.trim()) { setErrors({ title: 'Required' }); return; }
    setSaving(true);
    try {
      const base = { ...f, department: f.department === '' ? null : f.department, coupon: f.coupon === '' ? null : f.coupon, starts_at: fromLocalInput(f.starts_at), ends_at: fromLocalInput(f.ends_at) };
      let body: unknown = base;
      if (file) {
        const fd = new FormData();
        Object.entries(base).forEach(([k, v]) => fd.append(k, v === null || v === undefined ? '' : String(v)));
        fd.append('image', file);
        body = fd;
      }
      if (campaign) await adminApi.campaigns.update(campaign.id, body); else await adminApi.campaigns.create(body);
      toast.success(campaign ? 'Campaign updated.' : 'Campaign created.'); onClose(true);
    } catch (err) { setErrors(fieldErrors(err)); toast.error(errorMessage(err)); } finally { setSaving(false); }
  };

  const ep = (k: string) => ({ error: !!errors[k], helperText: errors[k] });
  return (
    <Dialog open onClose={() => onClose(false)} maxWidth="md" fullWidth>
      <DialogTitle>{campaign ? 'Edit campaign' : 'New campaign'}</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 1, display: 'grid', gap: 2.5, gridTemplateColumns: 'repeat(2, 1fr)' }}>
          <TextField required label="Headline" value={f.title} onChange={(e) => set('title', e.target.value)} sx={{ gridColumn: 'span 2' }} {...ep('title')} />
          <TextField multiline minRows={2} label="Supporting text" value={f.description} onChange={(e) => set('description', e.target.value)} sx={{ gridColumn: 'span 2' }} />
          <TextField select label="Where it appears" value={f.placement} onChange={(e) => set('placement', e.target.value)}>{PLACEMENTS.map(([v, l]) => <MenuItem key={v} value={v}>{l}</MenuItem>)}</TextField>
          <TextField select label="Style" value={f.style} onChange={(e) => set('style', e.target.value)}>{STYLES.map(([v, l]) => <MenuItem key={v} value={v}>{l}</MenuItem>)}</TextField>
          <TextField label="Button text" value={f.cta_label} onChange={(e) => set('cta_label', e.target.value)} />
          <TextField label="Background colour" value={f.background_color} onChange={(e) => set('background_color', e.target.value)} placeholder="#111827" helperText="Optional hex colour" />
          <TextField label="Link URL" value={f.link_url} onChange={(e) => set('link_url', e.target.value)} placeholder="/women or https://…" helperText={errors.link_url || 'Where the button goes. Optional if a department is chosen.'} error={!!errors.link_url} />
          <TextField select label="Link to department" value={f.department} onChange={(e) => set('department', e.target.value)}>
            <MenuItem value="">None</MenuItem>{(lookups.data?.departments ?? []).map((d) => <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>)}
          </TextField>
          <TextField select label="Attach coupon" value={f.coupon} onChange={(e) => set('coupon', e.target.value)}>
            <MenuItem value="">None</MenuItem>{(coupons.data?.results ?? []).map((c) => <MenuItem key={c.id} value={c.id}>{c.code}</MenuItem>)}
          </TextField>
          <Box><Button component="label" variant="outlined" color="inherit" startIcon={<Iconify icon="solar:upload-minimalistic-bold" />}>{file ? file.name : campaign?.image ? 'Replace image' : 'Upload image'}<input hidden type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></Button></Box>
          <TextField type="datetime-local" label="Starts" value={f.starts_at} onChange={(e) => set('starts_at', e.target.value)} slotProps={{ inputLabel: { shrink: true } }} {...ep('starts_at')} />
          <TextField type="datetime-local" label="Ends" value={f.ends_at} onChange={(e) => set('ends_at', e.target.value)} slotProps={{ inputLabel: { shrink: true } }} helperText={errors.ends_at || 'Leave empty to run until switched off.'} error={!!errors.ends_at} />
          <FormControlLabel control={<Switch checked={f.active} onChange={(e) => set('active', e.target.checked)} />} label="Active" />
        </Box>
      </DialogContent>
      <DialogActions><Button color="inherit" onClick={() => onClose(false)}>Cancel</Button><Button variant="contained" color="inherit" loading={saving} onClick={save}>{campaign ? 'Save' : 'Create'}</Button></DialogActions>
    </Dialog>
  );
}

// ----------------------------------------------------------------- videos

function VideosTab() {
  const toast = useToast();
  const confirm = useConfirm();
  const [editing, setEditing] = useState<ShowcaseVideo | 'new' | null>(null);
  const list = useAsync(() => adminApi.videos.list({ page_size: 200 }), []);

  const remove = async (v: ShowcaseVideo) => {
    if (!(await confirm({ title: `Delete “${v.title}”?`, confirmLabel: 'Delete', destructive: true }))) return;
    try { await adminApi.videos.remove(v.id); toast.success('Video deleted.'); list.reload(); } catch (e) { toast.error(errorMessage(e)); }
  };

  const columns: Column<ShowcaseVideo>[] = [
    { id: 't', label: 'Video', render: (v) => (<Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}><Box component="video" src={v.video_url ?? undefined} poster={v.thumbnail_url ?? undefined} muted sx={{ width: 64, height: 64, borderRadius: 1, objectFit: 'cover', bgcolor: 'background.neutral' }} /><Typography variant="subtitle2">{v.title}</Typography></Box>) },
    { id: 'c', label: 'Button', render: (v) => v.cta_label },
    { id: 'o', label: 'Order', render: (v) => v.order },
    { id: 's', label: 'Status', render: (v) => <Label color={v.active ? 'success' : 'default'}>{v.active ? 'Shown' : 'Hidden'}</Label> },
    { id: 'a', label: '', align: 'right', width: 56, render: (v) => <RowActions actions={[{ label: 'Edit', icon: 'solar:pen-bold', onClick: () => setEditing(v) }, { label: 'Delete', icon: 'solar:trash-bin-trash-bold', color: 'error', dividerBefore: true, onClick: () => remove(v) }]} /> },
  ];

  return (
    <>
      <Toolbar label="New video" onAdd={() => setEditing('new')} />
      {list.error && <Alert severity="error" sx={{ mx: 2.5, mb: 2 }}>{list.error}</Alert>}
      <DataTable columns={columns} rows={list.data?.results ?? []} rowKey={(v) => v.id} loading={list.loading} total={list.data?.count ?? 0} page={0} rowsPerPage={200} onPageChange={() => {}} onRowsPerPageChange={() => {}} onRowClick={(v) => setEditing(v)} emptyText="No videos yet." />
      {editing && <VideoDialog video={editing === 'new' ? null : editing} onClose={(ch) => { setEditing(null); if (ch) list.reload(); }} />}
    </>
  );
}

function VideoDialog({ video, onClose }: { video: ShowcaseVideo | null; onClose: (changed: boolean) => void }) {
  const toast = useToast();
  const lookups = useAsync(() => adminApi.lookups(), []);
  const [f, setF] = useState({ title: video?.title ?? '', cta_label: video?.cta_label ?? 'Shop now', link_url: video?.link_url ?? '', department: video?.department ?? '', order: String(video?.order ?? 0), active: video?.active ?? true });
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumb, setThumb] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: unknown) => { setF((s) => ({ ...s, [k]: v })); setErrors((e) => ({ ...e, [k]: '' })); };

  const save = async () => {
    const e: Record<string, string> = {};
    if (!f.title.trim()) e.title = 'Required';
    if (!video && !videoFile) e.video = 'Choose a video file.';
    if (Object.keys(e).length) { setErrors(e); return; }
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries({ ...f, department: f.department === '' ? '' : f.department }).forEach(([k, v]) => fd.append(k, String(v)));
      if (videoFile) fd.append('video', videoFile);
      if (thumb) fd.append('thumbnail', thumb);
      if (video) await adminApi.videos.update(video.id, fd); else await adminApi.videos.create(fd);
      toast.success(video ? 'Video updated.' : 'Video added.'); onClose(true);
    } catch (err) { setErrors(fieldErrors(err)); toast.error(errorMessage(err)); } finally { setSaving(false); }
  };

  return (
    <Dialog open onClose={() => onClose(false)} maxWidth="sm" fullWidth>
      <DialogTitle>{video ? 'Edit video' : 'New showcase video'}</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 1, display: 'grid', gap: 2.5, gridTemplateColumns: 'repeat(2, 1fr)' }}>
          <TextField required label="Title" value={f.title} onChange={(e) => set('title', e.target.value)} sx={{ gridColumn: 'span 2' }} error={!!errors.title} helperText={errors.title} />
          <Box sx={{ gridColumn: 'span 2', display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
            <Button component="label" variant="outlined" color={errors.video ? 'error' : 'inherit'} startIcon={<Iconify icon="solar:upload-minimalistic-bold" />}>{videoFile ? videoFile.name : video ? 'Replace video' : 'Upload video *'}<input hidden type="file" accept="video/*" onChange={(e) => setVideoFile(e.target.files?.[0] ?? null)} /></Button>
            <Button component="label" variant="outlined" color="inherit" startIcon={<Iconify icon="solar:gallery-add-bold" />}>{thumb ? thumb.name : 'Thumbnail (optional)'}<input hidden type="file" accept="image/*" onChange={(e) => setThumb(e.target.files?.[0] ?? null)} /></Button>
            {errors.video && <Typography variant="caption" color="error">{errors.video}</Typography>}
          </Box>
          <TextField label="Button text" value={f.cta_label} onChange={(e) => set('cta_label', e.target.value)} />
          <TextField type="number" label="Display order" value={f.order} onChange={(e) => set('order', e.target.value)} />
          <TextField label="Link URL" value={f.link_url} onChange={(e) => set('link_url', e.target.value)} />
          <TextField select label="Or link to department" value={f.department} onChange={(e) => set('department', e.target.value)}>
            <MenuItem value="">None</MenuItem>{(lookups.data?.departments ?? []).map((d) => <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>)}
          </TextField>
          <FormControlLabel control={<Switch checked={f.active} onChange={(e) => set('active', e.target.checked)} />} label="Shown on the storefront" />
        </Box>
      </DialogContent>
      <DialogActions><Button color="inherit" onClick={() => onClose(false)}>Cancel</Button><Button variant="contained" color="inherit" loading={saving} onClick={save}>{video ? 'Save' : 'Add video'}</Button></DialogActions>
    </Dialog>
  );
}
