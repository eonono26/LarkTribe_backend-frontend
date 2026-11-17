'use client';

import { useState, useMemo, useEffect } from 'react';
import dynamic from 'next/dynamic';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Card from '@mui/material/Card';
import Tabs from '@mui/material/Tabs';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';

import { adminApi, errorMessage } from '@/lib/admin-api';
import { useAsync } from '@/admin-ui/hooks/use-async';
import { kes, dateTime, titleCase } from '@/admin-ui/utils/format';
import { Label } from '@/admin-ui/components/label';
import { Page } from '@/admin-ui/components/page-header';
import { DataTable } from '@/admin-ui/components/data-table';
import { StatusLabel } from '@/admin-ui/components/status-label';
import { TableToolbar } from '@/admin-ui/components/table-toolbar';
import { useToast } from '@/admin-ui/components/feedback';

import type { Driver, Delivery } from '@/lib/admin-types';
import type { Column } from '@/admin-ui/components/data-table';

const AdminDispatchMap = dynamic(() => import('@/components/AdminDispatchMap'), { ssr: false });

// ----------------------------------------------------------------------

export function DispatchView() {
  const toast = useToast();
  const [tab, setTab] = useState<'deliveries' | 'drivers'>('deliveries');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState(20);
  const [assigning, setAssigning] = useState<Delivery | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [driverForm, setDriverForm] = useState({
    first_name: '', last_name: '', username: '', account_email: '', password: '',
    phone: '', vehicle_type: 'bike', vehicle_plate: '',
  });

  const deliveries = useAsync(() => adminApi.delivery.deliveries(), []);
  const drivers = useAsync(() => adminApi.delivery.drivers(), []);

  useEffect(() => {
    const timer = setInterval(() => {
      deliveries.reload();
      drivers.reload();
    }, 8000);
    return () => clearInterval(timer);
  }, [deliveries.reload, drivers.reload]);

  const all = deliveries.data ?? [];
  const statuses = useMemo(() => Array.from(new Set(all.map((d) => d.status))), [all]);
  const shown = status ? all.filter((d) => d.status === status) : all;
  const unassigned = all.filter((d) => d.status === 'unassigned').length;

  const dCols: Column<Delivery>[] = [
    { id: 'o', label: 'Order', render: (d) => (<><Typography variant="subtitle2">{d.order_number}</Typography><Typography variant="caption" color="text.secondary">{d.item_count} item{d.item_count === 1 ? '' : 's'} · {kes(d.order_total)}</Typography></>) },
    { id: 'c', label: 'Customer', render: (d) => (<><Typography variant="body2">{d.shipping_name}</Typography><Typography variant="caption" color="text.secondary">{d.shipping_phone}</Typography></>) },
    { id: 'a', label: 'Drop-off', render: (d) => <Typography variant="body2" sx={{ maxWidth: 240 }}>{d.dropoff_label || d.shipping_city}</Typography> },
    { id: 'dr', label: 'Driver', render: (d) => (d.driver ? d.driver.name : <Typography variant="body2" color="text.disabled">Not assigned</Typography>) },
    { id: 'cr', label: 'Created', render: (d) => dateTime(d.created_at) },
    { id: 's', label: 'Status', render: (d) => <StatusLabel value={d.status} /> },
    {
      id: 'x', label: '', align: 'right', width: 130,
      render: (d) => !['delivered', 'cancelled', 'failed'].includes(d.status) && (
        <Button size="small" variant={d.driver ? 'outlined' : 'contained'} color="inherit" onClick={(e) => { e.stopPropagation(); setAssigning(d); }}>{d.driver ? 'Reassign' : 'Assign'}</Button>
      ),
    },
  ];

  const drCols: Column<Driver>[] = [
    { id: 'n', label: 'Driver', render: (d) => (<><Typography variant="subtitle2">{d.name}</Typography><Typography variant="caption" color="text.secondary">{d.phone || d.email}</Typography></>) },
    { id: 'v', label: 'Vehicle', render: (d) => `${titleCase(d.vehicle_type || '—')}${d.vehicle_plate ? ` · ${d.vehicle_plate}` : ''}` },
    { id: 'l', label: 'Active jobs', align: 'center', render: (d) => d.active_delivery_count },
    { id: 'r', label: 'Rating', render: (d) => Number(d.rating_avg).toFixed(1) },
    { id: 'o', label: 'Availability', render: (d) => <Label color={d.is_online ? 'success' : 'default'}>{d.is_online ? 'Online' : 'Offline'}</Label> },
    { id: 's', label: 'Account', render: (d) => <Label color={d.is_active ? 'success' : 'error'}>{d.is_active ? 'Active' : 'Disabled'}</Label> },
  ];

  const createDriver = async () => {
    setCreating(true);
    try {
      await adminApi.delivery.createDriver(driverForm);
      toast.success('Driver account created. Share the login details securely with the driver.');
      setCreateOpen(false);
      setDriverForm({ first_name: '', last_name: '', username: '', account_email: '', password: '', phone: '', vehicle_type: 'bike', vehicle_plate: '' });
      drivers.reload();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setCreating(false);
    }
  };

  const assign = async (driverId: number) => {
    if (!assigning) return;
    try { await adminApi.delivery.assign(assigning.id, driverId); toast.success('Driver assigned.'); setAssigning(null); deliveries.reload(); drivers.reload(); }
    catch (e) { toast.error(errorMessage(e)); }
  };

  return (
    <Page title="Dispatch" subtitle="Assign drivers to deliveries and see who is available.">
      {(deliveries.error || drivers.error) && <Alert severity="error" sx={{ mb: 3 }}>{deliveries.error || drivers.error}</Alert>}
      <Card>
        <Tabs value={tab} onChange={(_, v) => { setTab(v); setPage(0); }} sx={{ px: 2.5, boxShadow: (t) => `inset 0 -2px 0 0 ${t.vars.palette.divider}` }}>
          <Tab value="deliveries" label="Deliveries" iconPosition="end" icon={<Label color={unassigned ? 'warning' : 'default'}>{unassigned} unassigned</Label>} />
          <Tab value="drivers" label="Drivers" iconPosition="end" icon={<Label>{drivers.data?.length ?? 0}</Label>} />
        </Tabs>
        {tab === 'drivers' && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 2 }}>
            <Button variant="contained" color="inherit" onClick={() => setCreateOpen(true)}>Add delivery driver</Button>
          </Box>
        )}
        {tab === 'deliveries' ? (
          <>
            <Box sx={{ height: { xs: 280, md: 380 }, m: 2, mb: 0, overflow: 'hidden', borderRadius: 2, border: 1, borderColor: 'divider' }}>
              <AdminDispatchMap drivers={drivers.data ?? []} deliveries={all} />
            </Box>
            <TableToolbar search="" onSearch={() => {}} left={<Typography variant="subtitle2" color="text.secondary">{shown.length} deliveries</Typography>}>
              <TextField select size="small" label="Status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(0); }} sx={{ minWidth: 180 }}>
                <MenuItem value="">All statuses</MenuItem>{statuses.map((s) => <MenuItem key={s} value={s}>{titleCase(s)}</MenuItem>)}
              </TextField>
            </TableToolbar>
            <DataTable columns={dCols} rows={shown.slice(page * rows, page * rows + rows)} rowKey={(d) => d.id} loading={deliveries.loading} total={shown.length}
              page={page} rowsPerPage={rows} onPageChange={setPage} onRowsPerPageChange={(n) => { setRows(n); setPage(0); }} emptyText="No deliveries yet." />
          </>
        ) : (
          <DataTable columns={drCols} rows={drivers.data ?? []} rowKey={(d) => d.id} loading={drivers.loading} total={drivers.data?.length ?? 0}
            page={0} rowsPerPage={100} onPageChange={() => {}} onRowsPerPageChange={() => {}} emptyText="No drivers yet. Select “Add delivery driver” to create a driver login and profile." />
        )}
      </Card>

      <Dialog open={createOpen} onClose={() => !creating && setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create delivery driver</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2, mt: 1 }}>This creates a driver login and an approved driver profile. Give the password to the driver securely.</Alert>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, pt: 1 }}>
            <TextField label="First name" value={driverForm.first_name} onChange={(e) => setDriverForm({ ...driverForm, first_name: e.target.value })} required />
            <TextField label="Last name" value={driverForm.last_name} onChange={(e) => setDriverForm({ ...driverForm, last_name: e.target.value })} required />
            <TextField label="Username" value={driverForm.username} onChange={(e) => setDriverForm({ ...driverForm, username: e.target.value })} required />
            <TextField label="Email" type="email" value={driverForm.account_email} onChange={(e) => setDriverForm({ ...driverForm, account_email: e.target.value })} />
            <TextField label="Temporary password (8+ characters)" type="password" value={driverForm.password} onChange={(e) => setDriverForm({ ...driverForm, password: e.target.value })} required />
            <TextField label="Phone number" value={driverForm.phone} onChange={(e) => setDriverForm({ ...driverForm, phone: e.target.value })} required />
            <TextField select label="Vehicle" value={driverForm.vehicle_type} onChange={(e) => setDriverForm({ ...driverForm, vehicle_type: e.target.value })}>
              <MenuItem value="bicycle">Bicycle</MenuItem><MenuItem value="bike">Motorbike</MenuItem><MenuItem value="car">Car</MenuItem><MenuItem value="van">Van</MenuItem>
            </TextField>
            <TextField label="Vehicle plate (optional)" value={driverForm.vehicle_plate} onChange={(e) => setDriverForm({ ...driverForm, vehicle_plate: e.target.value })} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button color="inherit" onClick={() => setCreateOpen(false)} disabled={creating}>Cancel</Button>
          <Button variant="contained" color="inherit" onClick={createDriver} disabled={creating || !driverForm.first_name.trim() || !driverForm.username.trim() || driverForm.password.length < 8 || !driverForm.phone.trim()}>
            {creating ? 'Creating…' : 'Create driver'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!assigning} onClose={() => setAssigning(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Assign driver · {assigning?.order_number}</DialogTitle>
        <DialogContent>
          {(drivers.data ?? []).filter((d) => d.is_active).length === 0 ? (
            <Alert severity="info">There are no active drivers yet. Register a driver first.</Alert>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, pt: 1 }}>
              {(drivers.data ?? []).filter((d) => d.is_active).sort((a, b) => Number(b.is_online) - Number(a.is_online) || a.active_delivery_count - b.active_delivery_count).map((d) => (
                <Button key={d.id} color="inherit" variant="outlined" onClick={() => assign(d.id)} sx={{ justifyContent: 'space-between', py: 1.25 }}>
                  <span>{d.name}</span>
                  <Box component="span" sx={{ display: 'flex', gap: 1 }}><Label color={d.is_online ? 'success' : 'default'}>{d.is_online ? 'Online' : 'Offline'}</Label><Label>{d.active_delivery_count} active</Label></Box>
                </Button>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions><Button color="inherit" onClick={() => setAssigning(null)}>Cancel</Button></DialogActions>
      </Dialog>
    </Page>
  );
}
