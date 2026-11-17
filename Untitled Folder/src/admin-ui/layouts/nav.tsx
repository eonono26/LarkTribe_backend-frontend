'use client';

import { useEffect } from 'react';
import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import ListItemButton from '@mui/material/ListItemButton';

import { Logo } from '@/admin-ui/components/logo';
import { Label } from '@/admin-ui/components/label';
import { Iconify } from '@/admin-ui/components/iconify';
import { Scrollbar } from '@/admin-ui/components/scrollbar';
import { RouterLink } from '@/admin-ui/routes/components';
import { usePathname } from '@/admin-ui/routes/hooks';

import { navGroups } from './nav-config';

import type { Breakpoint } from '@mui/material/styles';

// ----------------------------------------------------------------------

export type NavBadges = Partial<Record<'pending_products' | 'pending_vendors' | 'open_tickets', number>>;

function NavContent({ badges }: { badges: NavBadges }) {
  const pathname = usePathname();

  return (
    <>
      <Logo sx={{ ml: 1 }} />

      <Scrollbar fillContent>
        <Box component="nav" sx={{ display: 'flex', flex: '1 1 auto', flexDirection: 'column', mt: 2 }}>
          {navGroups.map((group, gi) => (
            <Box key={gi} component="ul" sx={{ gap: 0.5, display: 'flex', flexDirection: 'column', mb: 1.5 }}>
              {group.subheader && (
                <Typography variant="overline" sx={{ px: 2, pt: 1, color: 'text.disabled', fontSize: 11 }}>
                  {group.subheader}
                </Typography>
              )}
              {group.items.map((item) => {
                const active = item.path === '/admin' ? pathname === '/admin' : pathname.startsWith(item.path);
                const badge = item.badgeKey ? badges[item.badgeKey] : 0;
                return (
                  <Box component="li" key={item.path} sx={{ display: 'flex' }}>
                    <ListItemButton
                      disableGutters
                      component={RouterLink}
                      href={item.path}
                      sx={[
                        (theme) => ({
                          pl: 2, py: 1, gap: 2, pr: 1.5, borderRadius: 0.75, typography: 'body2', fontWeight: 'fontWeightMedium',
                          color: theme.vars.palette.text.secondary, minHeight: 44,
                          ...(active && {
                            fontWeight: 'fontWeightSemiBold',
                            bgcolor: varAlpha(theme.vars.palette.primary.mainChannel, 0.08),
                            color: theme.vars.palette.primary.main,
                            '&:hover': { bgcolor: varAlpha(theme.vars.palette.primary.mainChannel, 0.16) },
                          }),
                        }),
                      ]}
                    >
                      <Box component="span" sx={{ width: 24, height: 24, display: 'inline-flex' }}>
                        <Iconify icon={item.icon} width={24} />
                      </Box>
                      <Box component="span" sx={{ flexGrow: 1 }}>{item.title}</Box>
                      {!!badge && <Label color="error" variant="filled">{badge}</Label>}
                    </ListItemButton>
                  </Box>
                );
              })}
            </Box>
          ))}
        </Box>
      </Scrollbar>

      <Box sx={{ py: 2 }}>
        <ListItemButton
          component={RouterLink}
          href="/"
          sx={{ borderRadius: 0.75, gap: 2, color: 'text.secondary', typography: 'body2' }}
        >
          <Iconify icon="solar:shop-bold-duotone" width={24} />
          View storefront
        </ListItemButton>
      </Box>
    </>
  );
}

export function NavDesktop({ layoutQuery, badges }: { layoutQuery: Breakpoint; badges: NavBadges }) {
  const theme = useTheme();

  return (
    <Box
      sx={{
        pt: 2.5, px: 2.5, top: 0, left: 0, height: 1, display: 'none', position: 'fixed', flexDirection: 'column',
        zIndex: 'var(--layout-nav-zIndex)', width: 'var(--layout-nav-vertical-width)',
        borderRight: `1px solid ${varAlpha(theme.vars.palette.grey['500Channel'], 0.12)}`,
        [theme.breakpoints.up(layoutQuery)]: { display: 'flex' },
      }}
    >
      <NavContent badges={badges} />
    </Box>
  );
}

export function NavMobile({ open, onClose, badges }: { open: boolean; onClose: () => void; badges: NavBadges }) {
  const pathname = usePathname();

  useEffect(() => {
    if (open) onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <Drawer
      open={open}
      onClose={onClose}
      sx={{ [`& .MuiDrawer-paper`]: { pt: 2.5, px: 2.5, overflow: 'unset', width: 'var(--layout-nav-mobile-width)' } }}
    >
      <NavContent badges={badges} />
    </Drawer>
  );
}
