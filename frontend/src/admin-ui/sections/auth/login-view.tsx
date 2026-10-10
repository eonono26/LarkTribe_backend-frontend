'use client';

import { useState } from 'react';
import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Alert from '@mui/material/Alert';
import Card from '@mui/material/Card';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Button from '@mui/material/Button';

import { Logo } from '@/admin-ui/components/logo';
import { Iconify } from '@/admin-ui/components/iconify';
import { RouterLink } from '@/admin-ui/routes/components';
import { useAdminAuth } from '@/admin-ui/auth/admin-auth';

// ----------------------------------------------------------------------

export function LoginView() {
  const { login } = useAdminAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(username.trim(), password); // the layout redirects once the session is an admin
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign in.');
      setBusy(false);
    }
  };

  return (
    <Box
      sx={(theme) => ({
        flex: 1, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2,
        background: `linear-gradient(${varAlpha(theme.vars.palette.background.defaultChannel, 0.9)}, ${varAlpha(theme.vars.palette.background.defaultChannel, 0.9)}), url(/admin-assets/background/overlay.jpg)`,
        backgroundSize: 'cover', backgroundPosition: 'center',
      })}
    >
      <Card sx={{ p: 5, width: 1, maxWidth: 440, boxShadow: (t) => t.vars.customShadows.dialog }}>
        <Box sx={{ mb: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
          <Logo href="/admin/login" />
          <Typography variant="h5" sx={{ mt: 2 }}>Sign in to the admin panel</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center' }}>
            Use your administrator account. The same login also works on the storefront.
          </Typography>
        </Box>

        <Box component="form" onSubmit={submit} sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {error && <Alert severity="error">{error}</Alert>}

          <TextField fullWidth autoFocus required label="Username" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
          <TextField
            fullWidth required label="Password" value={password} onChange={(e) => setPassword(e.target.value)}
            type={show ? 'text' : 'password'} autoComplete="current-password"
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShow((s) => !s)} edge="end" aria-label="toggle password visibility">
                      <Iconify icon={show ? 'solar:eye-bold' : 'solar:eye-closed-bold'} />
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
          />

          <Button fullWidth size="large" type="submit" color="inherit" variant="contained" loading={busy} disabled={!username || !password}>
            Sign in
          </Button>

          <Typography variant="body2" sx={{ textAlign: 'center', color: 'text.secondary' }}>
            Just shopping?{' '}
            <Link component={RouterLink} href="/login" variant="subtitle2">Go to the store sign in</Link>
          </Typography>
        </Box>
      </Card>
    </Box>
  );
}
