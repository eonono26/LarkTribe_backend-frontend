'use client';

import { useState } from 'react';
import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Link from '@mui/material/Link';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Skeleton from '@mui/material/Skeleton';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import ListItemButton from '@mui/material/ListItemButton';

import { adminApi } from '@/lib/admin-api';
import { useAsync } from '@/admin-ui/hooks/use-async';
import { kes, dateTime, titleCase } from '@/admin-ui/utils/format';
import { Label } from '@/admin-ui/components/label';
import { Iconify } from '@/admin-ui/components/iconify';
import { Chart, useChart } from '@/admin-ui/components/chart';
import { RouterLink } from '@/admin-ui/routes/components';
import { Page } from '@/admin-ui/components/page-header';
import { StatusLabel } from '@/admin-ui/components/status-label';

import type { IconifyName } from '@/admin-ui/components/iconify';

// ----------------------------------------------------------------------

function StatCard({ title, value, change, icon, color }: {
  title: string; value: string; change: number | null | undefined; icon: IconifyName; color: 'primary' | 'secondary' | 'success' | 'warning' | 'info';
}) {
  return (
    <Card sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 2.5 }}>
      <Box
        sx={(t) => ({
          width: 56, height: 56, flexShrink: 0, borderRadius: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: t.vars.palette[color].dark, bgcolor: varAlpha(t.vars.palette[color].mainChannel, 0.16),
        })}
      >
        <Iconify icon={icon} width={32} />
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>{title}</Typography>
        <Typography variant="h4" noWrap>{value}</Typography>
        {change !== undefined && (
          <Box sx={{ mt: 0.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {change === null ? (
              <Typography variant="caption" sx={{ color: 'text.disabled' }}>no prior data</Typography>
            ) : (
              <>
                <Iconify width={16} icon={change >= 0 ? 'eva:trending-up-fill' : 'eva:trending-down-fill'} sx={{ color: change >= 0 ? 'success.main' : 'error.main' }} />
                <Typography variant="caption" sx={{ color: change >= 0 ? 'success.main' : 'error.main', fontWeight: 600 }}>
                  {change > 0 ? '+' : ''}{change}%
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.disabled' }}>vs previous</Typography>
              </>
            )}
          </Box>
        )}
      </Box>
    </Card>
  );
}

export function DashboardView() {
  const theme = useTheme();
  const [days, setDays] = useState(30);
  const { data, loading, error, reload } = useAsync(() => adminApi.overview(days), [days]);

  const labels = (data?.sales_by_day ?? []).map((d) => new Date(d.date).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' }));

  const salesOptions = useChart({
    colors: [theme.palette.primary.main],
    xaxis: { categories: labels, tickAmount: Math.min(8, labels.length), labels: { rotate: 0, hideOverlappingLabels: true } },
    stroke: { width: 3, curve: 'straight' },
    fill: { type: 'gradient', opacity: 0.3 },
    yaxis: { min: 0, labels: { formatter: (v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : `${Math.round(v)}`) } },
    tooltip: { y: { formatter: (v: number) => kes(v) } },
    legend: { show: false },
  });

  const statusEntries = Object.entries(data?.orders_by_status ?? {});
  const donutOptions = useChart({
    labels: statusEntries.map(([k]) => titleCase(k)),
    stroke: { width: 0 },
    plotOptions: { pie: { donut: { size: '70%' } } },
    legend: { show: true, position: 'bottom', horizontalAlign: 'center' },
  });

  const depts = data?.sales_by_department ?? [];
  const deptOptions = useChart({
    colors: [theme.palette.primary.dark],
    plotOptions: { bar: { horizontal: true, barHeight: '55%', borderRadius: 4 } },
    xaxis: { categories: depts.map((d) => d.name ?? 'Uncategorised'), labels: { formatter: (v: string) => (Number(v) >= 1000 ? `${Math.round(Number(v) / 1000)}k` : v) } },
    tooltip: { y: { formatter: (v: number) => kes(v) } },
    legend: { show: false },
  });

  const t = data?.totals;
  const attention = [
    { label: 'Products awaiting approval', n: t?.pending_products, href: '/admin/products?status=pending', icon: 'solar:box-bold-duotone' as IconifyName },
    { label: 'Vendors awaiting approval', n: t?.pending_vendors, href: '/admin/vendors', icon: 'solar:shop-2-bold-duotone' as IconifyName },
    { label: 'Open support tickets', n: t?.open_tickets, href: '/admin/support', icon: 'solar:chat-round-dots-bold-duotone' as IconifyName },
  ];

  return (
    <Page
      title="Overview"
      subtitle="How the store is doing."
      action={
        <TextField select size="small" value={days} onChange={(e) => setDays(Number(e.target.value))} sx={{ minWidth: 160 }}>
          <MenuItem value={7}>Last 7 days</MenuItem>
          <MenuItem value={30}>Last 30 days</MenuItem>
          <MenuItem value={90}>Last 90 days</MenuItem>
        </TextField>
      }
    >
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} action={<Button color="inherit" size="small" onClick={reload}>Retry</Button>}>{error}</Alert>
      )}

      <Grid container spacing={3}>
        {[
          { title: 'Revenue', value: kes(data?.revenue), change: data?.revenue_change, icon: 'solar:wallet-money-bold-duotone' as const, color: 'primary' as const },
          { title: 'Orders', value: String(data?.orders ?? 0), change: data?.orders_change, icon: 'solar:bag-check-bold-duotone' as const, color: 'info' as const },
          { title: 'New customers', value: String(data?.new_customers ?? 0), change: data?.new_customers_change, icon: 'solar:user-plus-bold-duotone' as const, color: 'success' as const },
          { title: 'Avg. order value', value: kes(data?.avg_order_value), change: undefined, icon: 'solar:dollar-minimalistic-bold' as const, color: 'warning' as const },
        ].map((s) => (
          <Grid key={s.title} size={{ xs: 12, sm: 6, md: 3 }}>
            {loading && !data ? <Skeleton variant="rounded" height={104} /> : <StatCard {...s} />}
          </Grid>
        ))}

        <Grid size={{ xs: 12, md: 6, lg: 8 }}>
          <Card>
            <CardHeader title="Sales" subheader="Revenue per day. Cancelled, refunded and unpaid orders are excluded." />
            <Chart
              type="area"
              series={[{ name: 'Revenue', data: (data?.sales_by_day ?? []).map((d) => d.revenue) }]}
              options={salesOptions}
              sx={{ py: 2.5, pl: 1, pr: 2.5, height: 364 }}
            />
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6, lg: 4 }}>
          <Card>
            <CardHeader title="Orders by status" />
            {statusEntries.length ? (
              <Chart type="donut" series={statusEntries.map(([, n]) => n)} options={donutOptions} sx={{ my: 4, mx: 'auto', width: { xs: 240, xl: 260 }, height: { xs: 300, xl: 320 } }} />
            ) : (
              <Typography sx={{ p: 5, textAlign: 'center', color: 'text.secondary' }}>No orders in this period.</Typography>
            )}
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6, lg: 4 }}>
          <Card sx={{ height: 1 }}>
            <CardHeader title="Needs attention" />
            <Box sx={{ p: 1.5 }}>
              {attention.map((a) => (
                <ListItemButton key={a.label} component={RouterLink} href={a.href} sx={{ borderRadius: 1, gap: 2, py: 1.5 }}>
                  <Iconify icon={a.icon} width={28} sx={{ color: 'text.secondary' }} />
                  <Typography variant="body2" sx={{ flexGrow: 1 }}>{a.label}</Typography>
                  <Label color={a.n ? 'warning' : 'default'}>{a.n ?? '—'}</Label>
                </ListItemButton>
              ))}
              <Divider sx={{ my: 1.5, borderStyle: 'dashed' }} />
              <Box sx={{ px: 2, pb: 1, display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="caption" color="text.secondary">Active products</Typography>
                <Typography variant="caption">{t?.active_products ?? '—'} / {t?.products ?? '—'}</Typography>
              </Box>
              <Box sx={{ px: 2, pb: 1, display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="caption" color="text.secondary">Customers</Typography>
                <Typography variant="caption">{t?.customers ?? '—'}</Typography>
              </Box>
              <Box sx={{ px: 2, display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="caption" color="text.secondary">Approved vendors</Typography>
                <Typography variant="caption">{t?.vendors ?? '—'}</Typography>
              </Box>
            </Box>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6, lg: 8 }}>
          <Card>
            <CardHeader title="Sales by department" subheader="Revenue from order line items" />
            {depts.length ? (
              <Chart type="bar" series={[{ name: 'Revenue', data: depts.map((d) => d.revenue) }]} options={deptOptions} sx={{ py: 2.5, pl: 1, pr: 2.5, height: 320 }} />
            ) : (
              <Typography sx={{ p: 5, textAlign: 'center', color: 'text.secondary' }}>No sales in this period.</Typography>
            )}
          </Card>
        </Grid>

        <Grid size={{ xs: 12, lg: 7 }}>
          <Card>
            <CardHeader title="Recent orders" action={<Button component={RouterLink} href="/admin/orders" size="small" color="inherit">View all</Button>} />
            <Box sx={{ p: 1.5, pt: 0 }}>
              {(data?.recent_orders ?? []).map((o) => (
                <ListItemButton key={o.id} component={RouterLink} href={`/admin/orders?open=${o.id}`} sx={{ borderRadius: 1, gap: 2, py: 1.25 }}>
                  <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Typography variant="subtitle2" noWrap>{o.order_number} · {o.customer.name}</Typography>
                    <Typography variant="caption" color="text.secondary">{dateTime(o.created_at)} · {o.items_count} item{o.items_count === 1 ? '' : 's'}</Typography>
                  </Box>
                  <StatusLabel value={o.status} label={o.status_display} />
                  <Typography variant="subtitle2" sx={{ minWidth: 88, textAlign: 'right' }}>{kes(o.total)}</Typography>
                </ListItemButton>
              ))}
              {!loading && !data?.recent_orders.length && <Typography sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>No orders yet.</Typography>}
            </Box>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, lg: 5 }}>
          <Card>
            <CardHeader title="Low stock" subheader="Active products with 5 or fewer units" />
            <Box sx={{ p: 1.5, pt: 0 }}>
              {(data?.low_stock ?? []).map((p) => (
                <ListItemButton key={p.id} component={RouterLink} href={`/admin/products/${p.id}`} sx={{ borderRadius: 1, gap: 2, py: 1 }}>
                  <Avatar variant="rounded" src={p.image ?? undefined} sx={{ width: 44, height: 44 }}>{p.name.charAt(0)}</Avatar>
                  <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Typography variant="subtitle2" noWrap>{p.name}</Typography>
                    <Typography variant="caption" color="text.secondary">{p.sku}</Typography>
                  </Box>
                  <Label color={p.stock === 0 ? 'error' : 'warning'}>{p.stock === 0 ? 'Out of stock' : `${p.stock} left`}</Label>
                </ListItemButton>
              ))}
              {!loading && !data?.low_stock.length && <Typography sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>All stocked up 🎉</Typography>}
            </Box>
          </Card>
        </Grid>
      </Grid>
    </Page>
  );
}
