'use client';

import type { ThemeProviderProps as MuiThemeProviderProps } from '@mui/material/styles';

import CssBaseline from '@mui/material/CssBaseline';
import GlobalStyles from '@mui/material/GlobalStyles';
import { ThemeProvider as ThemeVarsProvider } from '@mui/material/styles';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v16-appRouter';

import { createTheme } from './create-theme';

import type {} from './extend-theme-types';
import type { ThemeOptions } from './types';

// ----------------------------------------------------------------------

export type ThemeProviderProps = Partial<MuiThemeProviderProps> & {
  themeOverrides?: ThemeOptions;
};

const theme = createTheme();

export function ThemeProvider({ themeOverrides, children, ...other }: ThemeProviderProps) {
  return (
    <AppRouterCacheProvider options={{ key: 'mui' }}>
      <ThemeVarsProvider disableTransitionOnChange theme={themeOverrides ? createTheme({ themeOverrides }) : theme} {...other}>
        <CssBaseline />
        <GlobalStyles styles={baselineStyles} />
        {children}
      </ThemeVarsProvider>
    </AppRouterCacheProvider>
  );
}

/**
 * Baseline from Material Kit's global.css. These are element selectors, so they are mounted
 * (and removed again) together with the admin theme instead of living in a global stylesheet
 * that would also hit the storefront. `html:root` outranks the storefront's `html` rule.
 */
const baselineStyles = {
  'html:root': { height: '100%', fontSize: '16px', WebkitOverflowScrolling: 'touch' },
  'html:root body': {
    display: 'flex',
    flex: '1 1 auto',
    minHeight: '100%',
    flexDirection: 'column',
    maxWidth: 'none',
    overflowX: 'visible',
    lineHeight: 1.5,
  },
  '#root__layout': {
    display: 'flex',
    flex: '1 1 auto',
    minHeight: '100%',
    flexDirection: 'column',
  },
  'html:root img': { maxWidth: '100%', verticalAlign: 'middle' },
  'html:root ul': { margin: 0, padding: 0, listStyleType: 'none' },
  "input[type='number']": { MozAppearance: 'textfield', appearance: 'none' },
  "input[type='number']::-webkit-outer-spin-button": { margin: 0, WebkitAppearance: 'none' },
  "input[type='number']::-webkit-inner-spin-button": { margin: 0, WebkitAppearance: 'none' },
} as const;
