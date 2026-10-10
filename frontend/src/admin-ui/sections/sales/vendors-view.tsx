'use client';

import { useState, useMemo } from 'react';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Card from '@mui/material/Card';
import Tabs from '@mui/material/Tabs';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { adminApi, errorMessage } from '@/lib/admin-api';
import { useAsync } from '@/admin-ui/hooks/use-async';
import { dateOnly } from '@/admin-ui/utils/format';
import { Label } from '@/admin-ui/components/label';
import { Page } from '@/admin-ui/components/page-header';
import { DataTable } from '@/admin-ui/components/data-table';
import { StatusLabel } from '@/admin-ui/components/status-label';
import { TableToolbar } from '@/admin-ui/components/table-toolbar';
import { useToast, useConfirm } from '@/admin-ui/components/feedback';

import type { Vendor } from '@/lib/admin-types';
import type { Column } from '@/admin-ui/components/data-table';

// ----------------------------------------------------------------------

export function VendorsView() {
  const toast = useToast();
  const confirm = useConfirm();
  const [tab, setTab] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState(20);
  const [busy, setBusy] = useState<number | null>(null);

  const list = useAsync(() => adminApi.vendors.list(), []);
  const all = list.data ?? [];
  const counts = useMemo(() => ({ '': all.length, pending: all.filter((v) => v.status === 'pending').length, approved: all.filter((v) => v.status === 'approved').length, suspended: all.filter((v) => v.status === 'suspended').length }), [all]);
  const filtered = all.filter((v) => (!tab || v.status === tab) && (!search || `${v.store_name} ${v.username}`.toLowerCase().includes(search.toLowerCase())));

  const act = async (v: Vendor, kind: 'approve' | 'suspend') => {
    if (kind === 'suspend' && !(await confirm({ title: `Suspend ${v.store_name}?`, message: 'Their products stay in the catalog but they cannot manage the store until reinstated.', confirmLabel: 'Suspend', destructive: true }))) return;
    setBusy(v.id);
    try { await adminApi[`vendors`][kind](v.id); toast.success(kind === 'approve' ? `${v.store_name} approved.` : `${v.store_name} suspended.`); list.reload(); }
    catch (e) { toast.error(errorMessage(e)); } finally { setBusy(null); }
  };

  const columns: Column<Vendor>[] = [
    {
      id: 'store', label: 'Store',
      render: (v) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar variant="rounded" src={v.logo ?? undefined}>{v.store_name.charAt(0)}</Avatar>
          <Box><Typography variant="subtitle2">{v.store_name}</Typography><Typography variant="caption" color="text.secondary">/{v.slug}</Typography></Box>
        </Box>
      ),
    },
    { id: 'owner', label: 'Owner', render: (v) => `@${v.username}` },
    { id: 'commission', label: 'Commission', render: (v) => `${Number(v.commission_rate)}%` },
    { id: 'applied', label: 'Applied', render: (v) => dateOnly(v.created_at) },
    { id: 'status', label: 'Status', render: (v) => <StatusLabel value={v.status} /> },
    {
      id: 'actions', label: '', align: 'right', width: 220,
      render: (v) => (
        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
          {v.status !== 'approved' && <Button size="small" variant="contained" color="success" disabled={busy === v.id} onClick={() => act(v, 'approve')}>{v.status === 'suspended' ? 'Reinstate' : 'Approve'}</Button>}
          {v.status !== 'suspended' && <Button size="small" variant="outlined" color="error" disabled={busy === v.id} onClick={() => act(v, 'suspend')}>Suspend</Button>}
        </Box>
      ),
    },
  ];

  return (
    <Page title="Vendors" subtitle="Approve new sellers and suspend problem accounts.">
      {list.error && <Alert severity="error" sx={{ mb: 3 }}>{list.error}</Alert>}
      <Card>
        <Tabs value={tab} onChange={(_, v) => { setTab(v); setPage(0); }} sx={{ px: 2.5, boxShadow: (t) => `inset 0 -2px 0 0 ${t.vars.palette.divider}` }}>
          {([['', 'All'], ['pending', 'Pending'], ['approved', 'Approved'], ['suspended', 'Suspended']] as const).map(([v, l]) => (
            <Tab key={v} value={v} label={l} iconPosition="end" icon={<Label color={v === 'pending' && counts.pending ? 'warning' : 'default'}>{counts[v]}</Label>} />
          ))}
        </Tabs>
        <TableToolbar search={search} onSearch={(s) => { setSearch(s); setPage(0); }} placeholder="Store or owner…" />
        <DataTable columns={columns} rows={filtered.slice(page * rows, page * rows + rows)} rowKey={(v) => v.id} loading={list.loading} total={filtered.length}
          page={page} rowsPerPage={rows} onPageChange={setPage} onRowsPerPageChange={(n) => { setRows(n); setPage(0); }} emptyText="No vendors here." />
      </Card>
    </Page>
  );
}
