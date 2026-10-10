'use client';

import { useBoolean } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import { useTheme } from '@mui/material/styles';

import { adminApi } from '@/lib/admin-api';
import { useAsync } from '@/admin-ui/hooks/use-async';

import { NavDesktop, NavMobile } from './nav';
import { MenuButton } from './components/menu-button';
import { AccountPopover } from './account-popover';
import { layoutClasses } from './core/classes';
import { HeaderSection } from './core/header-section';
import { LayoutSection } from './core/layout-section';
import { dashboardLayoutVars } from './dashboard/css-vars';

import type { NavBadges } from './nav';

// ----------------------------------------------------------------------

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  const layoutQuery = 'lg' as const;
  const { value: open, onFalse: onClose, onTrue: onOpen } = useBoolean();

  // Sidebar counters (pending products / vendors, open tickets) come from the overview endpoint.
  const { data } = useAsync(() => adminApi.overview(7), []);
  const badges: NavBadges = {
    pending_products: data?.totals.pending_products,
    pending_vendors: data?.totals.pending_vendors,
    open_tickets: data?.totals.open_tickets,
  };

  return (
    <LayoutSection
      headerSection={
        <HeaderSection
          disableElevation
          layoutQuery={layoutQuery}
          slotProps={{ container: { maxWidth: false } }}
          slots={{
            leftArea: (
              <>
                <MenuButton onClick={onOpen} sx={{ mr: 1, ml: -1, [theme.breakpoints.up(layoutQuery)]: { display: 'none' } }} />
                <NavMobile open={open} onClose={onClose} badges={badges} />
              </>
            ),
            rightArea: (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0, sm: 0.75 } }}>
                <AccountPopover />
              </Box>
            ),
          }}
        />
      }
      sidebarSection={<NavDesktop layoutQuery={layoutQuery} badges={badges} />}
      cssVars={dashboardLayoutVars(theme)}
      sx={{
        [`& .${layoutClasses.sidebarContainer}`]: {
          [theme.breakpoints.up(layoutQuery)]: {
            pl: 'var(--layout-nav-vertical-width)',
            transition: theme.transitions.create(['padding-left'], { easing: 'var(--layout-transition-easing)', duration: 'var(--layout-transition-duration)' }),
          },
        },
      }}
    >
      <Box component="main" className={layoutClasses.main} sx={{ display: 'flex', flex: '1 1 auto', flexDirection: 'column' }}>
        {children}
      </Box>
    </LayoutSection>
  );
}
