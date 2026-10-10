'use client';

import Box from '@mui/material/Box';
import OutlinedInput from '@mui/material/OutlinedInput';
import InputAdornment from '@mui/material/InputAdornment';

import { Iconify } from '@/admin-ui/components/iconify';

// ----------------------------------------------------------------------

type Props = {
  search: string;
  onSearch: (v: string) => void;
  placeholder?: string;
  children?: React.ReactNode; // filters (right side)
  left?: React.ReactNode; // replaces the search box (e.g. bulk-action bar)
};

export function TableToolbar({ search, onSearch, placeholder = 'Search…', children, left }: Props) {
  return (
    <Box sx={{ p: 2.5, gap: 2, display: 'flex', alignItems: 'center', flexWrap: 'wrap', minHeight: 88 }}>
      {left ?? (
        <OutlinedInput
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder={placeholder}
          startAdornment={
            <InputAdornment position="start">
              <Iconify width={20} icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
            </InputAdornment>
          }
          sx={{ maxWidth: 360, flexGrow: 1, minWidth: 220 }}
        />
      )}
      <Box sx={{ flexGrow: 1 }} />
      {children}
    </Box>
  );
}
