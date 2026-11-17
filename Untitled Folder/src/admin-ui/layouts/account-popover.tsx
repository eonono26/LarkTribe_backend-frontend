'use client';

import { useState, useCallback } from 'react';
import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Popover from '@mui/material/Popover';
import MenuList from '@mui/material/MenuList';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import MenuItem, { menuItemClasses } from '@mui/material/MenuItem';

import { Iconify } from '@/admin-ui/components/iconify';
import { useRouter } from '@/admin-ui/routes/hooks';
import { useAdminAuth } from '@/admin-ui/auth/admin-auth';

// ----------------------------------------------------------------------

export function AccountPopover() {
  const router = useRouter();
  const { user, logout } = useAdminAuth();
  const [anchor, setAnchor] = useState<HTMLButtonElement | null>(null);

  const go = useCallback((href: string) => { setAnchor(null); router.push(href); }, [router]);

  const name = [user?.first_name, user?.last_name].filter(Boolean).join(' ') || user?.username || 'Admin';
  const photo = user?.profile_picture_url || undefined;

  return (
    <>
      <IconButton
        onClick={(e) => setAnchor(e.currentTarget)}
        sx={{ p: '2px', width: 40, height: 40, background: (t) => `conic-gradient(${t.vars.palette.primary.light}, ${t.vars.palette.warning.light}, ${t.vars.palette.primary.light})` }}
      >
        <Avatar src={photo} alt={name} sx={{ width: 1, height: 1 }}>{name.charAt(0).toUpperCase()}</Avatar>
      </IconButton>

      <Popover
        open={!!anchor}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { width: 220 } } }}
      >
        <Box sx={{ p: 2, pb: 1.5 }}>
          <Typography variant="subtitle2" noWrap>{name}</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }} noWrap>{user?.email || user?.username}</Typography>
        </Box>
        <Divider sx={{ borderStyle: 'dashed' }} />
        <MenuList
          disablePadding
          sx={{
            p: 1, gap: 0.5, display: 'flex', flexDirection: 'column',
            [`& .${menuItemClasses.root}`]: { px: 1, gap: 2, borderRadius: 0.75, color: 'text.secondary', [`&:hover`]: { color: 'text.primary' } },
          }}
        >
          <MenuItem onClick={() => go('/')}><Iconify width={22} icon="solar:shop-bold-duotone" />View storefront</MenuItem>
          <MenuItem onClick={() => go('/account')}><Iconify width={22} icon="solar:user-circle-bold-duotone" />My shopping account</MenuItem>
        </MenuList>
        <Divider sx={{ borderStyle: 'dashed' }} />
        <Box sx={{ p: 1 }}>
          <Button
            fullWidth color="error" size="medium" variant="text"
            onClick={() => { setAnchor(null); logout(); router.replace('/admin/login'); }}
            sx={{ '&:hover': { bgcolor: (t) => varAlpha(t.vars.palette.error.mainChannel, 0.08) } }}
          >
            Sign out
          </Button>
        </Box>
      </Popover>
    </>
  );
}
