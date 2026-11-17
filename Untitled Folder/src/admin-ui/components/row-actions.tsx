'use client';

import { useState } from 'react';

import Divider from '@mui/material/Divider';
import Popover from '@mui/material/Popover';
import MenuList from '@mui/material/MenuList';
import IconButton from '@mui/material/IconButton';
import MenuItem, { menuItemClasses } from '@mui/material/MenuItem';

import { Iconify } from '@/admin-ui/components/iconify';

import type { IconifyName } from '@/admin-ui/components/iconify';

// ----------------------------------------------------------------------

export type RowAction = { label: string; icon: IconifyName; onClick: () => void; color?: 'error'; dividerBefore?: boolean; hidden?: boolean };

export function RowActions({ actions }: { actions: RowAction[] }) {
  const [anchor, setAnchor] = useState<HTMLButtonElement | null>(null);
  const visible = actions.filter((a) => !a.hidden);
  if (!visible.length) return null;

  return (
    <>
      <IconButton onClick={(e) => { e.stopPropagation(); setAnchor(e.currentTarget); }}>
        <Iconify icon="eva:more-vertical-fill" />
      </IconButton>
      <Popover
        open={!!anchor}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        onClick={(e) => e.stopPropagation()}
        anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuList
          disablePadding
          sx={{ p: 0.5, gap: 0.5, width: 190, display: 'flex', flexDirection: 'column', [`& .${menuItemClasses.root}`]: { px: 1, gap: 2, borderRadius: 0.75, [`&.${menuItemClasses.selected}`]: { bgcolor: 'action.selected' } } }}
        >
          {visible.map((a) => [
            a.dividerBefore ? <Divider key={`${a.label}-d`} sx={{ borderStyle: 'dashed' }} /> : null,
            <MenuItem key={a.label} sx={a.color === 'error' ? { color: 'error.main' } : undefined} onClick={() => { setAnchor(null); a.onClick(); }}>
              <Iconify icon={a.icon} width={20} />
              {a.label}
            </MenuItem>,
          ])}
        </MenuList>
      </Popover>
    </>
  );
}
