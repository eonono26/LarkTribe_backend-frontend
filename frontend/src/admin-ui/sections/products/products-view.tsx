'use client';

import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Card from '@mui/material/Card';
import Tabs from '@mui/material/Tabs';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';

import { adminApi, errorMessage } from '@/lib/admin-api';
import { useAsync, useDebounced } from '@/admin-ui/hooks/use-async';
import { kes } from '@/admin-ui/utils/format';
import { Label } from '@/admin-ui/components/label';
import { Iconify } from '@/admin-ui/components/iconify';
import { useRouter } from '@/admin-ui/routes/hooks';
import { Page } from '@/admin-ui/components/page-header';
import { DataTable } from '@/admin-ui/components/data-table';
import { RowActions } from '@/admin-ui/components/row-actions';
import { StatusLabel } from '@/admin-ui/components/status-label';
import { TableToolbar } from '@/admin-ui/components/table-toolbar';
import { useToast, useConfirm } from '@/admin-ui/components/feedback';

import type { AdminProduct } from '@/lib/admin-types';
import type { Column } from '@/admin-ui/components/data-table';

// ----------------------------------------------------------------------

const TABS = [
  { value: '', label: 'All', key: 'total' },
  { value: 'active', label: 'Active', key: 'active' },
  { value: 'pending', label: 'Pending review', key: 'pending' },
  { value: 'draft', label: 'Draft', key: 'draft' },
  { value: 'rejected', label: 'Rejected', key: 'rejected' },
] as const;

export function ProductsView() {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();

  const [status, setStatus] = useState('');
  const [department, setDepartment] = useState('');
  const [search, setSearch] = useState('');
  const q = useDebounced(search);
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState(20);
  const [ordering, setOrdering] = useState('-created_at');
  const [selected, setSelected] = useState<(number | string)[]>([]);
  const [rejecting, setRejecting] = useState<number[] | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  // ?status=pending deep link (from the dashboard)
  useEffect(() => {
    const s = new URLSearchParams(window.location.search).get('status');
    if (s) setStatus(s);
  }, []);

  const stats = useAsync(() => adminApi.products.stats(), []);
  const lookups = useAsync(() => adminApi.lookups(), []);
  const list = useAsync(
    () => adminApi.products.list({ page: page + 1, page_size: rows, status, department, search: q, ordering }),
    [page, rows, status, department, q, ordering]
  );

  useEffect(() => { setPage(0); setSelected([]); }, [status, department, q, rows, ordering]);

  const refresh = useCallback(() => { list.reload(); stats.reload(); }, [list, stats]);

  const approve = async (ids: number[]) => {
    setBusy(true);
    try {
      if (ids.length === 1) await adminApi.products.approve(ids[0]);
      else await adminApi.products.bulkStatus(ids, 'active');
      toast.success(ids.length === 1 ? 'Product approved and live.' : `${ids.length} products approved.`);
      setSelected([]);
      refresh();
    } catch (e) { toast.error(errorMessage(e)); } finally { setBusy(false); }
  };

  const reject = async () => {
    if (!rejecting) return;
    setBusy(true);
    try {
      if (rejecting.length === 1) await adminApi.products.reject(rejecting[0], reason);
      else await adminApi.products.bulkStatus(rejecting, 'rejected', reason);
      toast.success(`${rejecting.length === 1 ? 'Product' : `${rejecting.length} products`} rejected. The vendor was notified.`);
      setRejecting(null); setReason(''); setSelected([]);
      refresh();
    } catch (e) { toast.error(errorMessage(e)); } finally { setBusy(false); }
  };

  const remove = async (p: AdminProduct) => {
    if (!(await confirm({ title: `Delete “${p.name}”?`, message: 'This permanently removes the product and its photos.', confirmLabel: 'Delete', destructive: true }))) return;
    try {
      await adminApi.products.remove(p.id);
      toast.success('Product deleted.');
      refresh();
    } catch (e) { toast.error(errorMessage(e)); }
  };

  const columns: Column<AdminProduct>[] = [
    {
      id: 'name', label: 'Product', sortKey: 'name',
      render: (p) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar variant="rounded" src={p.primary_image ?? undefined} sx={{ width: 48, height: 48 }}>{p.name.charAt(0)}</Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle2" noWrap sx={{ maxWidth: 260 }}>{p.name}</Typography>
            <Typography variant="caption" color="text.secondary">{p.sku}</Typography>
          </Box>
        </Box>
      ),
    },
    { id: 'vendor', label: 'Vendor', render: (p) => p.vendor_name },
    {
      id: 'category', label: 'Category',
      render: (p) => (<><Typography variant="body2">{p.category_name}</Typography><Typography variant="caption" color="text.secondary">{p.department_name}</Typography></>),
    },
    {
      id: 'price', label: 'Price', sortKey: 'price',
      render: (p) => (
        <>
          <Typography variant="subtitle2">{kes(p.price)}</Typography>
          {p.compare_at_price && <Typography variant="caption" sx={{ color: 'text.disabled', textDecoration: 'line-through' }}>{kes(p.compare_at_price)}</Typography>}
        </>
      ),
    },
    {
      id: 'stock', label: 'Stock', sortKey: 'stock',
      render: (p) => (p.stock === 0 ? <Label color="error">Out of stock</Label> : p.stock <= 5 ? <Label color="warning">{p.stock} left</Label> : p.stock),
    },
    { id: 'status', label: 'Status', sortKey: 'status', render: (p) => <StatusLabel value={p.status} label={p.status === 'pending' ? 'Pending review' : undefined} /> },
    {
      id: 'actions', label: '', align: 'right', width: 56,
      render: (p) => (
        <RowActions
          actions={[
            { label: 'Edit', icon: 'solar:pen-bold', onClick: () => router.push(`/admin/products/${p.id}`) },
            { label: 'Approve', icon: 'solar:check-circle-bold', hidden: p.status === 'active', onClick: () => approve([p.id]) },
            { label: 'Reject…', icon: 'solar:close-circle-bold', hidden: p.status === 'rejected', onClick: () => setRejecting([p.id]) },
            { label: 'Delete', icon: 'solar:trash-bin-trash-bold', color: 'error', dividerBefore: true, onClick: () => remove(p) },
          ]}
        />
      ),
    },
  ];

  const ids = selected.map(Number);

  return (
    <Page
      title="Products"
      subtitle="Create, edit and moderate everything sold in the store."
      action={<Button variant="contained" color="inherit" startIcon={<Iconify icon="mingcute:add-line" />} onClick={() => router.push('/admin/products/new')}>New product</Button>}
    >
      {list.error && <Alert severity="error" sx={{ mb: 3 }}>{list.error}</Alert>}

      <Card>
        <Tabs value={status} onChange={(_, v) => setStatus(v)} sx={{ px: 2.5, boxShadow: (t) => `inset 0 -2px 0 0 ${t.vars.palette.divider}` }}>
          {TABS.map((t) => (
            <Tab key={t.value} value={t.value} label={t.label} iconPosition="end"
              icon={<Label color={t.value === 'pending' && stats.data?.pending ? 'warning' : 'default'}>{stats.data?.[t.key] ?? '–'}</Label>} />
          ))}
        </Tabs>

        <TableToolbar
          search={search}
          onSearch={setSearch}
          placeholder="Search name, SKU, vendor, brand…"
          left={
            ids.length ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                <Typography variant="subtitle1">{ids.length} selected</Typography>
                <Button size="small" variant="contained" color="success" disabled={busy} onClick={() => approve(ids)}>Approve</Button>
                <Button size="small" variant="outlined" color="error" disabled={busy} onClick={() => setRejecting(ids)}>Reject…</Button>
                <Button size="small" color="inherit" disabled={busy}
                  onClick={async () => { try { await adminApi.products.bulkStatus(ids, 'draft'); toast.success('Moved to draft.'); setSelected([]); refresh(); } catch (e) { toast.error(errorMessage(e)); } }}>
                  Set to draft
                </Button>
              </Box>
            ) : undefined
          }
        >
          <TextField select size="small" label="Department" value={department} onChange={(e) => setDepartment(e.target.value)} sx={{ minWidth: 170 }}>
            <MenuItem value="">All departments</MenuItem>
            {lookups.data?.departments.map((d) => <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>)}
          </TextField>
        </TableToolbar>

        <DataTable
          columns={columns}
          rows={list.data?.results ?? []}
          rowKey={(p) => p.id}
          loading={list.loading}
          total={list.data?.count ?? 0}
          page={page}
          rowsPerPage={rows}
          onPageChange={setPage}
          onRowsPerPageChange={setRows}
          ordering={ordering}
          onOrderingChange={setOrdering}
          onRowClick={(p) => router.push(`/admin/products/${p.id}`)}
          selectable
          selected={selected}
          onSelectedChange={setSelected}
          emptyText="No products match these filters."
        />
      </Card>

      <Dialog open={!!rejecting} onClose={() => setRejecting(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Reject {rejecting && rejecting.length > 1 ? `${rejecting.length} products` : 'product'}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>The vendor is notified with your reason, so be specific about what to fix.</Typography>
          <TextField autoFocus fullWidth multiline minRows={3} label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} />
        </DialogContent>
        <DialogActions>
          <Button color="inherit" onClick={() => setRejecting(null)}>Cancel</Button>
          <Button variant="contained" color="error" disabled={busy || !reason.trim()} onClick={reject}>Reject</Button>
        </DialogActions>
      </Dialog>
    </Page>
  );
}
