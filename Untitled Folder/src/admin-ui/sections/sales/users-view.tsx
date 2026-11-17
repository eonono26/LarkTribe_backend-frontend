'use client';

import { useState, useEffect } from 'react';

import Card from '@mui/material/Card';
import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
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
import { useAsync, useDebounced } from '@/admin-ui/hooks/use-async';
import { dateOnly } from '@/admin-ui/utils/format';
import { Label } from '@/admin-ui/components/label';
import { Iconify } from '@/admin-ui/components/iconify';
import { Page } from '@/admin-ui/components/page-header';
import { DataTable } from '@/admin-ui/components/data-table';
import { RowActions } from '@/admin-ui/components/row-actions';
import { TableToolbar } from '@/admin-ui/components/table-toolbar';
import { useToast } from '@/admin-ui/components/feedback';
import { useAdminAuth } from '@/admin-ui/auth/admin-auth';

import type { AdminUser } from '@/lib/admin-types';
import type { Column } from '@/admin-ui/components/data-table';

// ----------------------------------------------------------------------

const ROLE_COLOR = { admin: 'error', vendor: 'info', driver: 'warning', customer: 'default' } as const;

export function UsersView() {
  const toast = useToast();
  const { user: me } = useAdminAuth();
  const [role, setRole] = useState('');
  const [active, setActive] = useState('');
  const [search, setSearch] = useState('');
  const q = useDebounced(search);
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState(20);
  const [ordering, setOrdering] = useState('-date_joined');
  const [editing, setEditing] = useState<AdminUser | 'new' | null>(null);

  const list = useAsync(() => adminApi.users.list({ page: page + 1, page_size: rows, role, is_active: active, search: q, ordering }), [page, rows, role, active, q, ordering]);
  useEffect(() => { setPage(0); }, [role, active, q, rows, ordering]);

  const toggleActive = async (u: AdminUser) => {
    try { await adminApi.users.update(u.id, { is_active: !u.is_active }); toast.success(u.is_active ? 'Account deactivated.' : 'Account reactivated.'); list.reload(); }
    catch (e) { toast.error(errorMessage(e)); }
  };

  const columns: Column<AdminUser>[] = [
    {
      id: 'user', label: 'User', sortKey: 'username',
      render: (u) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar src={u.profile_picture_url ?? undefined}>{u.username.charAt(0).toUpperCase()}</Avatar>
          <Box>
            <Typography variant="subtitle2">{[u.first_name, u.last_name].filter(Boolean).join(' ') || u.username}</Typography>
            <Typography variant="caption" color="text.secondary">@{u.username}</Typography>
          </Box>
        </Box>
      ),
    },
    { id: 'contact', label: 'Contact', render: (u) => (<><Typography variant="body2">{u.email || '—'}</Typography><Typography variant="caption" color="text.secondary">{u.phone}</Typography></>) },
    { id: 'role', label: 'Role', render: (u) => <Label color={ROLE_COLOR[u.role]}>{u.role}</Label> },
    { id: 'orders', label: 'Orders', sortKey: 'orders_count', align: 'center', render: (u) => u.orders_count },
    { id: 'joined', label: 'Joined', sortKey: 'date_joined', render: (u) => dateOnly(u.date_joined) },
    { id: 'seen', label: 'Last sign-in', sortKey: 'last_login', render: (u) => dateOnly(u.last_login) },
    { id: 'status', label: 'Status', render: (u) => <Label color={u.is_active ? 'success' : 'error'}>{u.is_active ? 'Active' : 'Deactivated'}</Label> },
    {
      id: 'actions', label: '', align: 'right', width: 56,
      render: (u) => (
        <RowActions actions={[
          { label: 'Edit', icon: 'solar:pen-bold', onClick: () => setEditing(u) },
          { label: u.is_active ? 'Deactivate' : 'Reactivate', icon: u.is_active ? 'solar:close-circle-bold' : 'solar:check-circle-bold', hidden: u.id === me?.id, color: u.is_active ? 'error' : undefined, onClick: () => toggleActive(u) },
        ]} />
      ),
    },
  ];

  return (
    <Page
      title="Customers & staff"
      subtitle="Everyone with an account. Admins created here can sign in to both the admin panel and the store."
      action={<Button variant="contained" color="inherit" startIcon={<Iconify icon="mingcute:add-line" />} onClick={() => setEditing('new')}>New user</Button>}
    >
      {list.error && <Alert severity="error" sx={{ mb: 3 }}>{list.error}</Alert>}
      <Card>
        <TableToolbar search={search} onSearch={setSearch} placeholder="Name, username, email, phone…">
          <TextField select size="small" label="Role" value={role} onChange={(e) => setRole(e.target.value)} sx={{ minWidth: 150 }}>
            <MenuItem value="">All roles</MenuItem>
            {['customer', 'vendor', 'driver', 'admin'].map((r) => <MenuItem key={r} value={r} sx={{ textTransform: 'capitalize' }}>{r}</MenuItem>)}
          </TextField>
          <TextField select size="small" label="Status" value={active} onChange={(e) => setActive(e.target.value)} sx={{ minWidth: 150 }}>
            <MenuItem value="">Any</MenuItem><MenuItem value="true">Active</MenuItem><MenuItem value="false">Deactivated</MenuItem>
          </TextField>
        </TableToolbar>
        <DataTable columns={columns} rows={list.data?.results ?? []} rowKey={(u) => u.id} loading={list.loading} total={list.data?.count ?? 0}
          page={page} rowsPerPage={rows} onPageChange={setPage} onRowsPerPageChange={setRows} ordering={ordering} onOrderingChange={setOrdering}
          onRowClick={(u) => setEditing(u)} emptyText="No users match these filters." />
      </Card>
      {editing && <UserDialog user={editing === 'new' ? null : editing} isSelf={editing !== 'new' && editing.id === me?.id} onClose={(changed) => { setEditing(null); if (changed) list.reload(); }} />}
    </Page>
  );
}

function UserDialog({ user, isSelf, onClose }: { user: AdminUser | null; isSelf: boolean; onClose: (changed: boolean) => void }) {
  const toast = useToast();
  const [f, setF] = useState({
    username: user?.username ?? '', email: user?.email ?? '', first_name: user?.first_name ?? '', last_name: user?.last_name ?? '',
    phone: user?.phone ?? '', role: user?.role ?? 'customer', is_active: user?.is_active ?? true, password: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: unknown) => { setF((s) => ({ ...s, [k]: v })); setErrors((e) => { const n = { ...e }; delete n[k]; return n; }); };

  const save = async () => {
    const e: Record<string, string> = {};
    if (!f.username.trim()) e.username = 'Required';
    if (!user && !f.password) e.password = 'A password is required for new users.';
    if (Object.keys(e).length) { setErrors(e); return; }
    setSaving(true);
    try {
      const body: Record<string, unknown> = { ...f };
      if (!body.password) delete body.password;
      if (user) delete body.username;
      if (user) await adminApi.users.update(user.id, body); else await adminApi.users.create(body);
      toast.success(user ? 'User updated.' : 'User created.');
      onClose(true);
    } catch (err) {
      if (err instanceof ApiError && err.data && typeof err.data === 'object') {
        const fe: Record<string, string> = {};
        Object.entries(err.data as Record<string, unknown>).forEach(([k, v]) => { fe[k] = Array.isArray(v) ? String(v[0]) : String(v); });
        setErrors(fe);
      }
      toast.error(errorMessage(err));
    } finally { setSaving(false); }
  };

  const fieldProps = (k: string) => ({ error: !!errors[k], helperText: errors[k] });

  return (
    <Dialog open onClose={() => onClose(false)} maxWidth="sm" fullWidth>
      <DialogTitle>{user ? `Edit @${user.username}` : 'New user'}</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 1, display: 'grid', gap: 2.5, gridTemplateColumns: 'repeat(2, 1fr)' }}>
          {!user && <TextField required label="Username" value={f.username} onChange={(e) => set('username', e.target.value)} sx={{ gridColumn: 'span 2' }} {...fieldProps('username')} />}
          <TextField label="First name" value={f.first_name} onChange={(e) => set('first_name', e.target.value)} {...fieldProps('first_name')} />
          <TextField label="Last name" value={f.last_name} onChange={(e) => set('last_name', e.target.value)} {...fieldProps('last_name')} />
          <TextField label="Email" value={f.email} onChange={(e) => set('email', e.target.value)} {...fieldProps('email')} />
          <TextField label="Phone" value={f.phone} onChange={(e) => set('phone', e.target.value)} {...fieldProps('phone')} />
          <TextField select label="Role" value={f.role} onChange={(e) => set('role', e.target.value)} disabled={isSelf}
            helperText={errors.role || (isSelf ? "You can't change your own role." : f.role === 'admin' ? 'Admins can manage everything in this panel.' : ' ')} error={!!errors.role}>
            {['customer', 'vendor', 'driver', 'admin'].map((r) => <MenuItem key={r} value={r} sx={{ textTransform: 'capitalize' }}>{r}</MenuItem>)}
          </TextField>
          <TextField type="password" required={!user} label={user ? 'New password' : 'Password'} value={f.password} onChange={(e) => set('password', e.target.value)}
            autoComplete="new-password" helperText={errors.password || (user ? 'Leave blank to keep the current password.' : 'At least 8 characters.')} error={!!errors.password} />
          <Box sx={{ gridColumn: 'span 2' }}>
            <FormControlLabel control={<Switch checked={f.is_active} disabled={isSelf} onChange={(e) => set('is_active', e.target.checked)} />} label="Account active (can sign in)" />
          </Box>
        </Box>
        {f.role === 'vendor' && !user && <Alert severity="info" sx={{ mt: 2 }}>Vendor accounts also need a store profile — they create it when they apply as a vendor.</Alert>}
        {f.role === 'driver' && <Alert severity="info" sx={{ mt: 2 }}>Drivers need a driver profile to appear in Dispatch; they set it up in the driver app.</Alert>}
      </DialogContent>
      <DialogActions>
        <Button color="inherit" onClick={() => onClose(false)}>Cancel</Button>
        <Button variant="contained" color="inherit" onClick={save} loading={saving}>{user ? 'Save changes' : 'Create user'}</Button>
      </DialogActions>
    </Dialog>
  );
}
