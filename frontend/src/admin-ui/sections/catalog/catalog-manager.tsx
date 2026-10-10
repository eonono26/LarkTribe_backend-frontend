'use client';

import { useRef, useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Switch from '@mui/material/Switch';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import FormControlLabel from '@mui/material/FormControlLabel';
import CircularProgress from '@mui/material/CircularProgress';

import { ApiError, errorMessage } from '@/lib/admin-api';
import { useAsync, useDebounced } from '@/admin-ui/hooks/use-async';
import { Label } from '@/admin-ui/components/label';
import { Iconify } from '@/admin-ui/components/iconify';
import { Page } from '@/admin-ui/components/page-header';
import { DataTable } from '@/admin-ui/components/data-table';
import { RowActions } from '@/admin-ui/components/row-actions';
import { TableToolbar } from '@/admin-ui/components/table-toolbar';
import { useToast, useConfirm } from '@/admin-ui/components/feedback';

import type { MediaItem, Page as Paged, Lookups } from '@/lib/admin-types';
import type { Column } from '@/admin-ui/components/data-table';

// ----------------------------------------------------------------------

export type FieldDef = {
  name: string;
  label: string;
  type?: 'text' | 'number' | 'textarea' | 'select' | 'switch';
  required?: boolean;
  helper?: string;
  /** Options for `select`; receives the current form so options can depend on other fields. */
  options?: (form: Record<string, any>, lookups: Lookups | null) => { value: string | number; label: string }[];
  half?: boolean;
};

type Row = { id: number; name: string; slug: string; is_active: boolean; media: MediaItem[]; image_url: string | null; product_count: number };

export type ManagerConfig<R extends Row> = {
  title: string;
  subtitle: string;
  noun: string; // "department"
  fields: FieldDef[];
  defaults: Record<string, any>;
  api: {
    list: (p?: any) => Promise<Paged<R>>;
    create: (d: unknown) => Promise<R>;
    update: (id: number, d: unknown) => Promise<R>;
    remove: (id: number) => Promise<void>;
    addMedia: (id: number, f: File, primary?: boolean) => Promise<MediaItem[]>;
    deleteMedia: (id: number, mid: number) => Promise<MediaItem[]>;
    setPrimaryMedia: (id: number, mid: number) => Promise<MediaItem[]>;
  };
  /** Extra table columns shown between the name and the counts. */
  extraColumns?: Column<R>[];
  /** Optional list filter rendered in the toolbar, sent as a query param. */
  filter?: { param: string; label: string; options: (lookups: Lookups | null) => { value: string | number; label: string }[] };
  /** Convert a row into form values. */
  toForm: (r: R) => Record<string, any>;
  /** Optional file input sent with the form (e.g. brand logo). */
  fileField?: { name: string; label: string };
  lookups?: () => Promise<Lookups>;
};

export function CatalogManager<R extends Row>({ config }: { config: ManagerConfig<R> }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [search, setSearch] = useState('');
  const q = useDebounced(search);
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState(20);
  const [editing, setEditing] = useState<R | 'new' | null>(null);

  const lookups = useAsync(() => (config.lookups ? config.lookups() : Promise.resolve(null)), []);
  const list = useAsync(
    () => config.api.list({ page: page + 1, page_size: rows, search: q, ...(config.filter && filter ? { [config.filter.param]: filter } : {}) }),
    [page, rows, q, filter]
  );
  useEffect(() => { setPage(0); }, [q, rows, filter]);

  const remove = async (r: R) => {
    if (!(await confirm({ title: `Delete ${config.noun} “${r.name}”?`, message: 'This cannot be undone.', confirmLabel: 'Delete', destructive: true }))) return;
    try { await config.api.remove(r.id); toast.success(`${config.noun[0].toUpperCase()}${config.noun.slice(1)} deleted.`); list.reload(); lookups.reload(); } catch (e) { toast.error(errorMessage(e)); }
  };

  const columns: Column<R>[] = [
    {
      id: 'name', label: 'Name',
      render: (r) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar variant="rounded" src={r.image_url ?? undefined} sx={{ width: 44, height: 44 }}>{r.name.charAt(0)}</Avatar>
          <Box>
            <Typography variant="subtitle2">{r.name}</Typography>
            <Typography variant="caption" color="text.secondary">/{r.slug}</Typography>
          </Box>
        </Box>
      ),
    },
    ...(config.extraColumns ?? []),
    { id: 'products', label: 'Products', render: (r) => r.product_count },
    { id: 'active', label: 'Status', render: (r) => <Label color={r.is_active ? 'success' : 'default'}>{r.is_active ? 'Active' : 'Hidden'}</Label> },
    {
      id: 'actions', label: '', align: 'right', width: 56,
      render: (r) => (
        <RowActions actions={[
          { label: 'Edit', icon: 'solar:pen-bold', onClick: () => setEditing(r) },
          { label: 'Delete', icon: 'solar:trash-bin-trash-bold', color: 'error', dividerBefore: true, onClick: () => remove(r) },
        ]} />
      ),
    },
  ];

  return (
    <Page
      title={config.title}
      subtitle={config.subtitle}
      action={<Button variant="contained" color="inherit" startIcon={<Iconify icon="mingcute:add-line" />} onClick={() => setEditing('new')}>New {config.noun}</Button>}
    >
      {list.error && <Alert severity="error" sx={{ mb: 3 }}>{list.error}</Alert>}
      <Card>
        <TableToolbar search={search} onSearch={setSearch} placeholder={`Search ${config.title.toLowerCase()}…`}>
          {config.filter && (
            <TextField select size="small" label={config.filter.label} value={filter} onChange={(e) => setFilter(e.target.value)} sx={{ minWidth: 200 }}>
              <MenuItem value="">All</MenuItem>
              {config.filter.options(lookups.data).map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
            </TextField>
          )}
        </TableToolbar>
        <DataTable
          columns={columns}
          rows={list.data?.results ?? []}
          rowKey={(r) => r.id}
          loading={list.loading}
          total={list.data?.count ?? 0}
          page={page}
          rowsPerPage={rows}
          onPageChange={setPage}
          onRowsPerPageChange={setRows}
          onRowClick={(r) => setEditing(r)}
          emptyText={`No ${config.title.toLowerCase()} found.`}
        />
      </Card>

      {editing && (
        <EditDialog
          config={config}
          lookups={lookups.data}
          row={editing === 'new' ? null : editing}
          onClose={(changed) => { setEditing(null); if (changed) { list.reload(); lookups.reload(); } }}
        />
      )}
    </Page>
  );
}

// ----------------------------------------------------------------------

function EditDialog<R extends Row>({ config, lookups, row, onClose }: { config: ManagerConfig<R>; lookups: Lookups | null; row: R | null; onClose: (changed: boolean) => void }) {
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<Record<string, any>>(row ? config.toForm(row) : config.defaults);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [changed, setChanged] = useState(false);
  const [rowId, setRowId] = useState<number | null>(row?.id ?? null);
  const [media, setMedia] = useState<MediaItem[]>(row?.media ?? []);
  const [pending, setPending] = useState<File[]>([]);
  const [extraFile, setExtraFile] = useState<File | null>(null);
  const [mediaBusy, setMediaBusy] = useState(false);

  const set = (k: string, v: any) => { setForm((f) => ({ ...f, [k]: v })); setErrors((e) => { const n = { ...e }; delete n[k]; return n; }); };

  const buildBody = () => {
    const body: Record<string, any> = {};
    config.fields.forEach((f) => {
      let v = form[f.name];
      if (f.type === 'number') v = v === '' || v === null ? null : Number(v);
      if (f.type === 'select' && v === '') v = null;
      body[f.name] = v;
    });
    if (extraFile && config.fileField) {
      const fd = new FormData();
      Object.entries(body).forEach(([k, v]) => { if (v !== null && v !== undefined) fd.append(k, String(v)); });
      fd.append(config.fileField.name, extraFile);
      return fd;
    }
    return body;
  };

  const save = async () => {
    const missing: Record<string, string> = {};
    config.fields.forEach((f) => { if (f.required && (form[f.name] === '' || form[f.name] === null || form[f.name] === undefined)) missing[f.name] = 'Required'; });
    if (Object.keys(missing).length) { setErrors(missing); return; }
    setSaving(true);
    try {
      const saved = rowId ? await config.api.update(rowId, buildBody()) : await config.api.create(buildBody());
      setChanged(true);
      if (!rowId && pending.length) {
        for (let i = 0; i < pending.length; i += 1) await config.api.addMedia(saved.id, pending[i], i === 0); // eslint-disable-line no-await-in-loop
      }
      toast.success(`${config.noun[0].toUpperCase()}${config.noun.slice(1)} ${rowId ? 'updated' : 'created'}.`);
      onClose(true);
    } catch (e) {
      if (e instanceof ApiError && e.data && typeof e.data === 'object') {
        const fe: Record<string, string> = {};
        Object.entries(e.data as Record<string, unknown>).forEach(([k, v]) => { fe[k] = Array.isArray(v) ? String(v[0]) : String(v); });
        setErrors(fe);
      }
      toast.error(errorMessage(e));
    } finally { setSaving(false); }
  };

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    const list = Array.from(files);
    if (list.some((f) => f.size > 5 * 1024 * 1024)) { toast.error('Images must be 5 MB or smaller.'); return; }
    if (!rowId) { setPending((p) => [...p, ...list]); return; }
    setMediaBusy(true);
    try {
      let m = media;
      for (let i = 0; i < list.length; i += 1) m = await config.api.addMedia(rowId, list[i], false); // eslint-disable-line no-await-in-loop
      setMedia(m); setChanged(true);
    } catch (e) { toast.error(errorMessage(e)); } finally { setMediaBusy(false); if (fileRef.current) fileRef.current.value = ''; }
  };

  const mediaAct = async (fn: () => Promise<MediaItem[]>) => {
    setMediaBusy(true);
    try { setMedia(await fn()); setChanged(true); } catch (e) { toast.error(errorMessage(e)); } finally { setMediaBusy(false); }
  };

  return (
    <Dialog open onClose={() => onClose(changed)} maxWidth="sm" fullWidth>
      <DialogTitle>{row ? `Edit ${config.noun}` : `New ${config.noun}`}</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 1, display: 'grid', gap: 2.5, gridTemplateColumns: 'repeat(2, 1fr)' }}>
          {config.fields.map((f) => {
            const span = f.half ? 'span 1' : 'span 2';
            if (f.type === 'switch') {
              return (
                <Box key={f.name} sx={{ gridColumn: span }}>
                  <FormControlLabel control={<Switch checked={!!form[f.name]} onChange={(e) => set(f.name, e.target.checked)} />} label={f.label} />
                  {f.helper && <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', ml: 6 }}>{f.helper}</Typography>}
                </Box>
              );
            }
            const opts = f.type === 'select' ? f.options?.(form, lookups) ?? [] : [];
            return (
              <TextField
                key={f.name}
                sx={{ gridColumn: span }}
                select={f.type === 'select'}
                multiline={f.type === 'textarea'}
                minRows={f.type === 'textarea' ? 3 : undefined}
                type={f.type === 'number' ? 'number' : 'text'}
                required={f.required}
                label={f.label}
                value={form[f.name] ?? ''}
                onChange={(e) => set(f.name, e.target.value)}
                error={!!errors[f.name]}
                helperText={errors[f.name] || f.helper}
              >
                {f.type === 'select' && [
                  !f.required && <MenuItem key="__none" value="">None</MenuItem>,
                  ...opts.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>),
                ]}
              </TextField>
            );
          })}
        </Box>

        {config.fileField && (
          <Box sx={{ mt: 2.5 }}>
            <Button component="label" variant="outlined" color="inherit" startIcon={<Iconify icon="solar:upload-minimalistic-bold" />}>
              {extraFile ? extraFile.name : config.fileField.label}
              <input hidden type="file" accept="image/*" onChange={(e) => setExtraFile(e.target.files?.[0] ?? null)} />
            </Button>
          </Box>
        )}

        <Typography variant="subtitle2" sx={{ mt: 3, mb: 1.5 }}>Images</Typography>
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          {media.map((m) => (
            <Box key={m.id} sx={{ position: 'relative', width: 96, height: 96, borderRadius: 1.5, overflow: 'hidden', border: (t) => `1px solid ${t.vars.palette.divider}` }}>
              {m.file && (m.media_type === 'video'
                ? <Box component="video" src={m.file} sx={{ width: 1, height: 1, objectFit: 'cover' }} />
                : <Box component="img" src={m.file} alt="" sx={{ width: 1, height: 1, objectFit: 'cover' }} />)}
              {m.is_primary && <Label color="primary" sx={{ position: 'absolute', bottom: 4, left: 4 }}>Main</Label>}
              <Box sx={{ position: 'absolute', top: 2, right: 2, display: 'flex', flexDirection: 'column' }}>
                {!m.is_primary && <IconButton size="small" title="Make main" disabled={mediaBusy} sx={{ bgcolor: 'background.paper', mb: 0.25 }} onClick={() => mediaAct(() => config.api.setPrimaryMedia(rowId!, m.id))}><Iconify icon="solar:star-bold" width={16} /></IconButton>}
                <IconButton size="small" title="Remove" disabled={mediaBusy} sx={{ bgcolor: 'background.paper', color: 'error.main' }} onClick={() => mediaAct(() => config.api.deleteMedia(rowId!, m.id))}><Iconify icon="solar:trash-bin-trash-bold" width={16} /></IconButton>
              </Box>
            </Box>
          ))}
          {pending.map((f, i) => (
            <Box key={i} sx={{ position: 'relative', width: 96, height: 96, borderRadius: 1.5, overflow: 'hidden', border: (t) => `1px dashed ${t.vars.palette.divider}` }}>
              <Box component="img" src={URL.createObjectURL(f)} alt="" sx={{ width: 1, height: 1, objectFit: 'cover', opacity: 0.8 }} />
              <IconButton size="small" sx={{ position: 'absolute', top: 2, right: 2, bgcolor: 'background.paper' }} onClick={() => setPending(pending.filter((_, j) => j !== i))}><Iconify icon="mingcute:close-line" width={16} /></IconButton>
            </Box>
          ))}
          <Box component="button" type="button" disabled={mediaBusy} onClick={() => fileRef.current?.click()}
            sx={{ width: 96, height: 96, borderRadius: 1.5, border: (t) => `1px dashed ${t.vars.palette.text.disabled}`, bgcolor: 'transparent', color: 'text.secondary', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', '&:hover': { bgcolor: 'action.hover' } }}>
            {mediaBusy ? <CircularProgress size={22} /> : <Iconify icon="solar:gallery-add-bold" width={28} />}
          </Box>
          <input ref={fileRef} hidden type="file" accept="image/*,video/*" multiple onChange={(e) => upload(e.target.files)} />
        </Box>
        {!rowId && pending.length > 0 && <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'text.secondary' }}>Uploaded when you save.</Typography>}
      </DialogContent>
      <DialogActions>
        <Button color="inherit" onClick={() => onClose(changed)}>Cancel</Button>
        <Button variant="contained" color="inherit" onClick={save} loading={saving}>{row ? 'Save changes' : 'Create'}</Button>
      </DialogActions>
    </Dialog>
  );
}
