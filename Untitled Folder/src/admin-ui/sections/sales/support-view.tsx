'use client';

import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Card from '@mui/material/Card';
import Tabs from '@mui/material/Tabs';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Drawer from '@mui/material/Drawer';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';

import { adminApi, errorMessage } from '@/lib/admin-api';
import { useAsync } from '@/admin-ui/hooks/use-async';
import { dateTime } from '@/admin-ui/utils/format';
import { Label } from '@/admin-ui/components/label';
import { Iconify } from '@/admin-ui/components/iconify';
import { Page } from '@/admin-ui/components/page-header';
import { DataTable } from '@/admin-ui/components/data-table';
import { StatusLabel } from '@/admin-ui/components/status-label';
import { useToast } from '@/admin-ui/components/feedback';

import type { Ticket } from '@/lib/admin-types';
import type { Column } from '@/admin-ui/components/data-table';

// ----------------------------------------------------------------------

export function SupportView() {
  const [tab, setTab] = useState('open');
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState(20);
  const [openId, setOpenId] = useState<number | null>(null);
  const list = useAsync(() => adminApi.tickets.list(), []);

  const all = list.data ?? [];
  const isOpen = (t: Ticket) => t.status === 'open' || t.status === 'in_progress';
  const shown = tab === 'open' ? all.filter(isOpen) : tab === 'done' ? all.filter((t) => !isOpen(t)) : all;
  const open = all.find((t) => t.id === openId) ?? null;

  const columns: Column<Ticket>[] = [
    { id: 's', label: 'Subject', render: (t) => (<><Typography variant="subtitle2">{t.subject}</Typography><Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block', maxWidth: 360 }}>{t.message}</Typography></>) },
    { id: 'u', label: 'Customer', render: (t) => t.user_name },
    { id: 'r', label: 'Replies', align: 'center', render: (t) => t.replies.length },
    { id: 'd', label: 'Opened', render: (t) => dateTime(t.created_at) },
    { id: 'st', label: 'Status', render: (t) => <StatusLabel value={t.status} /> },
  ];

  return (
    <Page title="Support" subtitle="Customer tickets. Replies are sent to the customer as notifications.">
      {list.error && <Alert severity="error" sx={{ mb: 3 }}>{list.error}</Alert>}
      <Card>
        <Tabs value={tab} onChange={(_, v) => { setTab(v); setPage(0); }} sx={{ px: 2.5, boxShadow: (t) => `inset 0 -2px 0 0 ${t.vars.palette.divider}` }}>
          <Tab value="open" label="Needs reply" iconPosition="end" icon={<Label color={all.filter(isOpen).length ? 'warning' : 'default'}>{all.filter(isOpen).length}</Label>} />
          <Tab value="done" label="Resolved" />
          <Tab value="all" label="All" />
        </Tabs>
        <DataTable columns={columns} rows={shown.slice(page * rows, page * rows + rows)} rowKey={(t) => t.id} loading={list.loading} total={shown.length}
          page={page} rowsPerPage={rows} onPageChange={setPage} onRowsPerPageChange={(n) => { setRows(n); setPage(0); }} onRowClick={(t) => setOpenId(t.id)} emptyText="No tickets here — nice." />
      </Card>
      <TicketDrawer ticket={open} onClose={() => setOpenId(null)} onChanged={list.reload} />
    </Page>
  );
}

function TicketDrawer({ ticket, onClose, onChanged }: { ticket: Ticket | null; onClose: () => void; onChanged: () => void }) {
  const toast = useToast();
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { setMsg(''); }, [ticket?.id]);

  const send = async () => {
    if (!ticket || !msg.trim()) return;
    setBusy(true);
    try { await adminApi.tickets.reply(ticket.id, msg.trim()); setMsg(''); toast.success('Reply sent.'); onChanged(); } catch (e) { toast.error(errorMessage(e)); } finally { setBusy(false); }
  };
  const resolve = async () => {
    if (!ticket) return;
    setBusy(true);
    try { await adminApi.tickets.resolve(ticket.id); toast.success('Ticket resolved.'); onChanged(); } catch (e) { toast.error(errorMessage(e)); } finally { setBusy(false); }
  };

  return (
    <Drawer anchor="right" open={!!ticket} onClose={onClose} slotProps={{ paper: { sx: { width: { xs: 1, sm: 520 } } } }}>
      {ticket && (
        <>
          <Box sx={{ p: 3, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2 }}>
            <Box><Typography variant="h6">{ticket.subject}</Typography><Typography variant="caption" color="text.secondary">{ticket.user_name} · {dateTime(ticket.created_at)}{ticket.order ? ` · order #${ticket.order}` : ''}</Typography></Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><StatusLabel value={ticket.status} /><IconButton onClick={onClose}><Iconify icon="mingcute:close-line" /></IconButton></Box>
          </Box>
          <Divider />
          <Box sx={{ p: 3, flexGrow: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ p: 2, borderRadius: 1.5, bgcolor: 'background.neutral' }}><Typography variant="caption" color="text.secondary">{ticket.user_name}</Typography><Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{ticket.message}</Typography></Box>
            {ticket.replies.map((r) => (
              <Box key={r.id} sx={{ p: 2, borderRadius: 1.5, ml: r.is_staff_reply ? 4 : 0, mr: r.is_staff_reply ? 0 : 4, bgcolor: r.is_staff_reply ? 'primary.lighter' : 'background.neutral' }}>
                <Typography variant="caption" color="text.secondary">{r.is_staff_reply ? 'Support' : r.author_name} · {dateTime(r.created_at)}</Typography>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{r.message}</Typography>
              </Box>
            ))}
          </Box>
          <Divider />
          <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <TextField multiline minRows={3} label="Reply to customer" value={msg} onChange={(e) => setMsg(e.target.value)} />
            <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'space-between' }}>
              <Button color="success" disabled={busy || ticket.status === 'resolved' || ticket.status === 'closed'} onClick={resolve}>Mark resolved</Button>
              <Button variant="contained" color="inherit" disabled={busy || !msg.trim()} onClick={send}>Send reply</Button>
            </Box>
          </Box>
        </>
      )}
    </Drawer>
  );
}
