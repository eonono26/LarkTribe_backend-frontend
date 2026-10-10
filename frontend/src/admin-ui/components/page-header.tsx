import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import Link from '@mui/material/Link';

import { RouterLink } from '@/admin-ui/routes/components';
import { DashboardContent } from '@/admin-ui/layouts/dashboard/content';

// ----------------------------------------------------------------------

type Props = {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  crumbs?: { label: string; href?: string }[];
  children?: React.ReactNode;
  maxWidth?: 'lg' | 'xl' | 'md';
};

/** Standard page frame: padded container + title row. */
export function Page({ title, subtitle, action, crumbs, children, maxWidth = 'xl' }: Props) {
  return (
    <DashboardContent maxWidth={maxWidth}>
      <Box sx={{ mb: 4, gap: 2, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <Box>
          <Typography variant="h4">{title}</Typography>
          {crumbs && (
            <Breadcrumbs sx={{ mt: 0.5 }}>
              {crumbs.map((c) =>
                c.href ? (
                  <Link key={c.label} component={RouterLink} href={c.href} color="text.secondary" underline="hover" variant="body2">{c.label}</Link>
                ) : (
                  <Typography key={c.label} variant="body2" color="text.primary">{c.label}</Typography>
                )
              )}
            </Breadcrumbs>
          )}
          {subtitle && <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>{subtitle}</Typography>}
        </Box>
        {action}
      </Box>
      {children}
    </DashboardContent>
  );
}
