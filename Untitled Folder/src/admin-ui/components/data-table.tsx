'use client';

import Box from '@mui/material/Box';
import Table from '@mui/material/Table';
import Checkbox from '@mui/material/Checkbox';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';
import TableSortLabel from '@mui/material/TableSortLabel';
import CircularProgress from '@mui/material/CircularProgress';

import { Scrollbar } from '@/admin-ui/components/scrollbar';

// ----------------------------------------------------------------------

export type Column<T> = {
  id: string;
  label: string;
  align?: 'left' | 'right' | 'center';
  width?: number | string;
  /** Backend `ordering` field. Adds a sort arrow to the header. */
  sortKey?: string;
  render: (row: T) => React.ReactNode;
};

type Props<T> = {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => number | string;
  loading?: boolean;
  total: number;
  page: number; // 0-based
  rowsPerPage: number;
  onPageChange: (p: number) => void;
  onRowsPerPageChange: (n: number) => void;
  ordering?: string; // e.g. "-created_at"
  onOrderingChange?: (o: string) => void;
  onRowClick?: (row: T) => void;
  emptyText?: string;
  selectable?: boolean;
  selected?: (number | string)[];
  onSelectedChange?: (ids: (number | string)[]) => void;
};

export function DataTable<T>({
  columns, rows, rowKey, loading, total, page, rowsPerPage, onPageChange, onRowsPerPageChange,
  ordering, onOrderingChange, onRowClick, emptyText = 'Nothing here yet.', selectable, selected = [], onSelectedChange,
}: Props<T>) {
  const ids = rows.map(rowKey);
  const allSelected = ids.length > 0 && ids.every((i) => selected.includes(i));
  const someSelected = ids.some((i) => selected.includes(i));

  const toggleAll = () => onSelectedChange?.(allSelected ? selected.filter((s) => !ids.includes(s)) : Array.from(new Set([...selected, ...ids])));
  const toggleOne = (id: number | string) => onSelectedChange?.(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);

  const desc = ordering?.startsWith('-');
  const orderKey = ordering?.replace(/^-/, '');

  return (
    <>
      <Scrollbar>
        <TableContainer sx={{ overflow: 'unset', position: 'relative', minHeight: loading ? 240 : undefined }}>
          <Table sx={{ minWidth: 720 }}>
            <TableHead>
              <TableRow>
                {selectable && (
                  <TableCell padding="checkbox">
                    <Checkbox indeterminate={someSelected && !allSelected} checked={allSelected} onChange={toggleAll} />
                  </TableCell>
                )}
                {columns.map((c) => (
                  <TableCell key={c.id} align={c.align} sx={{ width: c.width }} sortDirection={orderKey === c.sortKey ? (desc ? 'desc' : 'asc') : false}>
                    {c.sortKey && onOrderingChange ? (
                      <TableSortLabel
                        hideSortIcon
                        active={orderKey === c.sortKey}
                        direction={orderKey === c.sortKey && !desc ? 'asc' : 'desc'}
                        onClick={() => onOrderingChange(orderKey === c.sortKey && desc ? c.sortKey! : `-${c.sortKey}`)}
                      >
                        {c.label}
                      </TableSortLabel>
                    ) : (
                      c.label
                    )}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody sx={{ opacity: loading && rows.length ? 0.5 : 1, transition: 'opacity .15s' }}>
              {rows.map((row) => {
                const id = rowKey(row);
                const isSel = selected.includes(id);
                return (
                  <TableRow
                    hover
                    key={id}
                    selected={isSel}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    sx={{ cursor: onRowClick ? 'pointer' : 'default' }}
                  >
                    {selectable && (
                      <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                        <Checkbox checked={isSel} onChange={() => toggleOne(id)} />
                      </TableCell>
                    )}
                    {columns.map((c) => (
                      <TableCell key={c.id} align={c.align}>{c.render(row)}</TableCell>
                    ))}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {loading && !rows.length && (
            <Box sx={{ py: 8, display: 'flex', justifyContent: 'center' }}><CircularProgress size={28} /></Box>
          )}
          {!loading && !rows.length && (
            <Box sx={{ py: 8, textAlign: 'center' }}>
              <Typography variant="subtitle1">{emptyText}</Typography>
            </Box>
          )}
        </TableContainer>
      </Scrollbar>

      <TablePagination
        component="div"
        page={page}
        count={total}
        rowsPerPage={rowsPerPage}
        onPageChange={(_, p) => onPageChange(p)}
        rowsPerPageOptions={[10, 20, 50, 100]}
        onRowsPerPageChange={(e) => onRowsPerPageChange(parseInt(e.target.value, 10))}
      />
    </>
  );
}
