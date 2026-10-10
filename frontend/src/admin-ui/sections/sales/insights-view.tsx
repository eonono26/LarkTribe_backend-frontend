'use client';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';

import { adminApi, errorMessage } from '@/lib/admin-api';
import { useAsync } from '@/admin-ui/hooks/use-async';
import { kes, titleCase, dateTime } from '@/admin-ui/utils/format';
import { Label } from '@/admin-ui/components/label';
import { Iconify } from '@/admin-ui/components/iconify';
import { Chart, useChart } from '@/admin-ui/components/chart';
import { RouterLink } from '@/admin-ui/routes/components';
import { Page } from '@/admin-ui/components/page-header';
import { useToast } from '@/admin-ui/components/feedback';

// ----------------------------------------------------------------------

export function InsightsView() {
  const theme = useTheme();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const { data, loading, error, reload } = useAsync(() => adminApi.ai.dashboard(), []);

  const segments = Object.entries((data?.customer_segments ?? {}) as Record<string, number>);
  const history: number[] = data?.sales_forecast?.weekly_revenue_history ?? [];
  const projected: number | undefined = data?.sales_forecast?.projected_next_week_revenue;
  const atRisk: any[] = data?.at_risk_customers ?? [];
  const flagged: any[] = data?.flagged_orders ?? [];
  const suggestions: any[] = data?.marketing_suggestions ?? [];

  const forecastCats = [...history.map((_, i) => `Week ${i + 1}`), 'Next week (projected)'];
  const forecastOptions = useChart({
    colors: [theme.palette.primary.main],
    xaxis: { categories: forecastCats },
    plotOptions: { bar: { columnWidth: '45%', borderRadius: 4 } },
    legend: { show: false },
    tooltip: { y: { formatter: (v: number) => kes(v) } },
    yaxis: { labels: { formatter: (v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : `${Math.round(v)}`) } },
  });
  const segOptions = useChart({ labels: segments.map(([k]) => titleCase(k)), stroke: { width: 0 }, plotOptions: { pie: { donut: { size: '68%' } } }, legend: { show: true, position: 'bottom' } });

  const recompute = async () => {
    setBusy(true);
    try { const r = await adminApi.ai.recompute(); toast.success(`Segments recalculated for ${r.updated} customers.`); reload(); } catch (e) { toast.error(errorMessage(e)); } finally { setBusy(false); }
  };

  return (
    <Page
      title="AI insights"
      subtitle="Customer segments, sales forecast, fraud checks and campaign ideas generated from your data."
      action={<Button variant="outlined" color="inherit" loading={busy} startIcon={<Iconify icon="solar:refresh-bold" />} onClick={recompute}>Recalculate segments</Button>}
    >
      {error && <Alert severity="error" sx={{ mb: 3 }} action={<Button color="inherit" size="small" onClick={reload}>Retry</Button>}>{error}</Alert>}

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Card>
            <CardHeader title="Weekly revenue & forecast" subheader={projected !== undefined ? `Projected next week: ${kes(projected)}` : undefined} />
            {history.length ? (
              <Chart type="bar" series={[{ name: 'Revenue', data: [...history, projected ?? 0] }]} options={forecastOptions} sx={{ py: 2.5, pl: 1, pr: 2.5, height: 320 }} />
            ) : (
              <Typography sx={{ p: 5, textAlign: 'center', color: 'text.secondary' }}>{loading ? 'Loading…' : 'Not enough sales history yet.'}</Typography>
            )}
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 5 }}>
          <Card sx={{ height: 1 }}>
            <CardHeader title="Customer segments" subheader="Recency / frequency / spend groups" />
            {segments.length ? (
              <Chart type="donut" series={segments.map(([, n]) => n)} options={segOptions} sx={{ my: 3, mx: 'auto', width: 240, height: 300 }} />
            ) : (
              <Typography sx={{ p: 5, textAlign: 'center', color: 'text.secondary' }}>No segments computed yet. Use “Recalculate segments”.</Typography>
            )}
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ height: 1 }}>
            <CardHeader title="At-risk customers" subheader="Likely to churn, highest spenders first" />
            <Box sx={{ p: 2.5, pt: 0, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {atRisk.map((c) => (
                <Box key={c.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box><Typography variant="subtitle2">@{c.username}</Typography><Typography variant="caption" color="text.secondary">last order {c.recency_days} days ago · {c.frequency} orders</Typography></Box>
                  <Box sx={{ textAlign: 'right' }}><Typography variant="subtitle2">{kes(c.monetary)}</Typography><Label color="warning">{titleCase(c.segment)}</Label></Box>
                </Box>
              ))}
              {!atRisk.length && <Typography sx={{ py: 3, textAlign: 'center', color: 'text.secondary' }}>Nobody flagged right now.</Typography>}
            </Box>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ height: 1 }}>
            <CardHeader title="Orders flagged for fraud" subheader="Risk-scored at checkout" />
            <Box sx={{ p: 2.5, pt: 0, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {flagged.map((f) => (
                <Box key={f.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ minWidth: 0 }}><Typography variant="subtitle2">{f.order_number}</Typography><Typography variant="caption" color="text.secondary">{(f.reasons ?? []).join(' · ') || 'No reason recorded'} · {dateTime(f.created_at)}</Typography></Box>
                  <Label color={f.risk_score >= 0.7 ? 'error' : 'warning'}>Risk {(f.risk_score * 100).toFixed(0)}%</Label>
                </Box>
              ))}
              {!flagged.length && <Typography sx={{ py: 3, textAlign: 'center', color: 'text.secondary' }}>No suspicious orders. 🎉</Typography>}
            </Box>
          </Card>
        </Grid>

        <Grid size={{ xs: 12 }}>
          <Card>
            <CardHeader title="Campaign ideas" subheader="Suggestions based on stock levels and sales" action={<Button component={RouterLink} href="/admin/promotions" size="small" color="inherit">Open promotions</Button>} />
            <Box sx={{ p: 2.5, pt: 0, display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' } }}>
              {suggestions.slice(0, 8).map((s, i) => (
                <Box key={i} sx={{ p: 2, borderRadius: 1.5, border: (t) => `1px dashed ${t.vars.palette.divider}` }}>
                  <Label color="info" sx={{ mb: 1 }}>{titleCase(s.type)}</Label>
                  <Typography variant="subtitle2">{s.title}</Typography>
                  <Typography variant="body2" color="text.secondary">{s.detail}</Typography>
                  <Typography variant="caption" sx={{ display: 'block', mt: 1 }}>→ {s.suggested_action}</Typography>
                  {s.product_id && <Button component={RouterLink} href={`/admin/products/${s.product_id}`} size="small" sx={{ mt: 1 }} color="inherit">View product</Button>}
                </Box>
              ))}
              {!suggestions.length && <Typography sx={{ py: 3, color: 'text.secondary' }}>No suggestions right now.</Typography>}
            </Box>
          </Card>
        </Grid>
      </Grid>
    </Page>
  );
}
