import type { LinkProps } from '@mui/material/Link';

import { mergeClasses } from 'minimal-shared/utils';

import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';

import { RouterLink } from '@/admin-ui/routes/components';

import { logoClasses } from './classes';

// ----------------------------------------------------------------------

export type LogoProps = LinkProps & {
  /** Compact mark (initial only) for tight spaces. */
  isSingle?: boolean;
  disabled?: boolean;
};

export function Logo({ sx, disabled, className, href = '/admin', isSingle = false, ...other }: LogoProps) {
  return (
    <Link
      component={RouterLink}
      href={href}
      aria-label="Larktribe admin"
      underline="none"
      className={mergeClasses([logoClasses.root, className])}
      sx={[
        {
          flexShrink: 0,
          display: 'inline-flex',
          flexDirection: 'column',
          justifyContent: 'center',
          color: 'text.primary',
          lineHeight: 1,
          ...(disabled && { pointerEvents: 'none' }),
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      {...other}
    >
      <Typography
        component="span"
        sx={{
          fontFamily: '"Playfair Display", Georgia, serif',
          fontWeight: 600,
          fontSize: isSingle ? 22 : 20,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
        }}
      >
        {isSingle ? 'L' : 'Larktribe'}
      </Typography>
      {!isSingle && (
        <Typography
          component="span"
          sx={{ mt: 0.5, fontSize: 10, letterSpacing: '0.4em', textTransform: 'uppercase', color: 'text.disabled' }}
        >
          Admin
        </Typography>
      )}
    </Link>
  );
}
