'use client';

import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Drawer from '@mui/material/Drawer';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';

import { adminApi, errorMessage } from '@/lib/admin-api';
import { useAsync, useDebounced } from '@/admin-ui/hooks/use-async';
import { kes, dateTime } from '@/admin-ui/utils/format';
import { Iconify } from '@/admin-ui/components/iconify';
import { Page } from '@/admin-ui/components/page-header';
import { DataTable } from '@/admin-ui/components/data-table';
import { StatusLabel } from '@/admin-ui/components/status-label';
import { TableToolbar } from '@/admin-ui/components/table-toolbar';
import { useToast, useConfirm } from '@/admin-ui/components/feedback';

import type { AdminOrder } from '@/lib/admin-types';
import type { Column } from '@/admin-ui/components/data-table';

// ----------------------------------------------------------------------

export function OrdersView() {
  const [status, setStatus] = useState('');
  const [payment, setPayment] = useState('');
  const [search, setSearch] = useState('');
  const q = useDebounced(search);
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState(20);
  const [ordering, setOrdering] = useState('-created_at');
  const [openId, setOpenId] = useState<number | null>(null);

  const lookups = useAsync(() => adminApi.lookups(), []);
  const list = useAsync(
    () => adminApi.orders.list({ page: page + 1, page_size: rows, status, payment_method: payment, search: q, ordering }),
    [page, rows, status, payment, q, ordering]
  );
  useEffect(() => { setPage(0); }, [status, payment, q, rows, ordering]);
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('open');
    if (id) setOpenId(Number(id));
  }, []);

  const columns: Column<AdminOrder>[] = [
    { id: 'no', label: 'Order', render: (o) => <Typography variant="subtitle2">{o.order_number}</Typography> },
    {
      id: 'customer', label: 'Customer',
      render: (o) => (<><Typography variant="body2">{o.customer.name}</Typography><Typography variant="caption" color="text.secondary">{o.customer.is_guest ? 'Guest · ' : ''}{o.customer.email || o.shipping_phone}</Typography></>),
    },
    { id: 'date', label: 'Placed', sortKey: 'created_at', render: (o) => dateTime(o.created_at) },
    { id: 'items', label: 'Items', align: 'center', render: (o) => o.items_count },
    { id: 'pay', label: 'Payment', render: (o) => o.payment_method_display },
    { id: 'total', label: 'Total', sortKey: 'total', align: 'right', render: (o) => <Typography variant="subtitle2">{kes(o.total)}</Typography> },
    { id: 'status', label: 'Status', sortKey: 'status', render: (o) => <StatusLabel value={o.status} label={o.status_display} /> },
  ];

  return (
    <Page title="Orders" subtitle="Every order placed in the store. Click one to see items and update its status.">
      {list.error && <Alert severity="error" sx={{ mb: 3 }}>{list.error}</Alert>}
      <Card>
        <TableToolbar search={search} onSearch={setSearch} placeholder="Order #, customer, phone, email…">
          <TextField select size="small" label="Status" value={status} onChange={(e) => setStatus(e.target.value)} sx={{ minWidth: 170 }}>
            <MenuItem value="">All statuses</MenuItem>
            {(lookups.data?.order_statuses ?? []).map((s) => <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>)}
          </TextField>
          <TextField select size="small" label="Payment" value={payment} onChange={(e) => setPayment(e.target.value)} sx={{ minWidth: 170 }}>
            <MenuItem value="">All methods</MenuItem>
            {(lookups.data?.payment_methods ?? []).map((s) => <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>)}
          </TextField>
        </TableToolbar>
        <DataTable
          columns={columns} rows={list.data?.results ?? []} rowKey={(o) => o.id} loading={list.loading}
          total={list.data?.count ?? 0} page={page} rowsPerPage={rows} onPageChange={setPage} onRowsPerPageChange={setRows}
          ordering={ordering} onOrderingChange={setOrdering} onRowClick={(o) => setOpenId(o.id)} emptyText="No orders match these filters."
        />
      </Card>
      <OrderDrawer id={openId} statuses={lookups.data?.order_statuses ?? []} onClose={() => setOpenId(null)} onChanged={list.reload} />
    </Page>
  );
}

function OrderDrawer({ id, statuses, onClose, onChanged }: { id: number | null; statuses: { value: string; label: string }[]; onClose: () => void; onChanged: () => void }) {
  const toast = useToast();
  const confirm = useConfirm();
  const { data: order, loading, error, setData } = useAsync(() => (id ? adminApi.orders.get(id) : Promise.resolve(null)), [id]);
  const [next, setNext] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (order) setNext(order.status); }, [order]);

  const update = async () => {
    if (!order || next === order.status) return;
    if (['cancelled', 'refunded'].includes(next) && !(await confirm({ title: `Mark order ${order.order_number} as ${next}?`, message: 'The customer will be notified.', confirmLabel: 'Yes, update', destructive: true }))) return;
    setBusy(true);
    try { setData(await adminApi.orders.setStatus(order.id, next)); toast.success('Order status updated. The customer was notified.'); onChanged(); }
    catch (e) { toast.error(errorMessage(e)); } finally { setBusy(false); }
  };

  return (
    <Drawer anchor="right" open={id !== null} onClose={onClose} slotProps={{ paper: { sx: { width: { xs: 1, sm: 520 } } } }}>
      {loading && !order && <Box sx={{ p: 6, display: 'flex', justifyContent: 'center' }}><CircularProgress /></Box>}
      {error && <Alert severity="error" sx={{ m: 3 }}>{error}</Alert>}
      {order && (
        <>
          <Box sx={{ p: 3, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <Box>
              <Typography variant="h6">{order.order_number}</Typography>
              <Typography variant="caption" color="text.secondary">{dateTime(order.created_at)}</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <StatusLabel value={order.status} label={order.status_display} />
              <IconButton onClick={onClose}><Iconify icon="mingcute:close-line" /></IconButton>
            </Box>
          </Box>
          <Divider />
          <Box sx={{ p: 3, overflow: 'auto', flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
              <TextField select size="small" label="Change status" value={next} onChange={(e) => setNext(e.target.value)} sx={{ flexGrow: 1 }}>
                {statuses.map((s) => <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>)}
              </TextField>
              <Button variant="contained" color="inherit" disabled={busy || next === order.status} onClick={update}>Update</Button>
            </Box>

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Customer</Typography>
              <Typography variant="body2">{order.customer.name}{order.customer.is_guest ? ' (guest)' : ''}</Typography>
              <Typography variant="body2" color="text.secondary">{order.customer.email || '—'}</Typography>
            </Box>
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Delivery</Typography>
              <Typography variant="body2">{order.shipping_name} · {order.shipping_phone}</Typography>
              <Typography variant="body2" color="text.secondary">{order.shipping_address}, {order.shipping_city}</Typography>
            </Box>
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Payment</Typography>
              <Typography variant="body2">{order.payment_method_display}{order.mpesa_receipt ? ` · receipt ${order.mpesa_receipt}` : ''}</Typography>
              {order.coupon_code && <Typography variant="body2" color="text.secondary">Coupon {order.coupon_code}</Typography>}
            </Box>

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1.5 }}>Items ({order.items_count})</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {(order.items ?? []).map((i) => (
                  <Box key={i.id} sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    <Avatar variant="rounded" src={i.product_image ?? undefined} sx={{ width: 56, height: 56 }}>{i.product_name.charAt(0)}</Avatar>
                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                      <Typography variant="body2" noWrap>{i.product_name}</Typography>
                      <Typography variant="caption" color="text.secondary">{i.variant_label || 'Standard'} · {kes(i.unit_price)} × {i.quantity}</Typography>
                    </Box>
                    <Typography variant="subtitle2">{kes(i.subtotal)}</Typography>
                  </Box>
                ))}
              </Box>
            </Box>

            <Divider sx={{ borderStyle: 'dashed' }} />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {[
                ['Subtotal', order.subtotal], ['Shipping', order.shipping_fee],
                ...(Number(order.discount_total) ? [['Discounts', `-${order.discount_total}`]] : []),
                ...(Number(order.member_discount_total) ? [['Member discount', `-${order.member_discount_total}`]] : []),
              ].map(([k, v]) => (
                <Box key={k} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">{k}</Typography>
                  <Typography variant="body2">{String(v).startsWith('-') ? `-${kes(String(v).slice(1))}` : kes(v)}</Typography>
                </Box>
              ))}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 1 }}>
                <Typography variant="subtitle1">Total</Typography>
                <Typography variant="subtitle1">{kes(order.total)}</Typography>
              </Box>
            </Box>
          </Box>
        </>
      )}
    </Drawer>
  );
}
