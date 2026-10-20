'use client';

import '@/admin-ui/admin.css';

import { useEffect } from 'react';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

import { Logo } from '@/admin-ui/components/logo';
import { ThemeProvider } from '@/admin-ui/theme/theme-provider';
import { FeedbackProvider } from '@/admin-ui/components/feedback';
import { usePathname, useRouter } from '@/admin-ui/routes/hooks';
import { DashboardLayout } from '@/admin-ui/layouts/dashboard-layout';
import { AdminAuthProvider, useAdminAuth } from '@/admin-ui/auth/admin-auth';
import BackToTop from '@/components/BackToTop';

// ----------------------------------------------------------------------

function FullPageSpinner() {
  return (
    <Box sx={{ flex: 1, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <CircularProgress />
    </Box>
  );
}

function NoAccess() {
  const { user, logout } = useAdminAuth();
  const router = useRouter();
  return (
    <Container maxWidth="xs" sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 3, textAlign: 'center' }}>
      <Logo sx={{ alignSelf: 'center' }} />
      <Typography variant="h5">No admin access</Typography>
      <Typography sx={{ color: 'text.secondary' }}>
        You&apos;re signed in as <b>{user?.username}</b>, but this account isn&apos;t an administrator.
      </Typography>
      <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'center' }}>
        <Button variant="contained" color="inherit" onClick={() => router.push('/')}>Back to store</Button>
        <Button variant="outlined" color="inherit" onClick={() => { logout(); router.replace('/admin/login'); }}>Use another account</Button>
      </Box>
    </Container>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const { status } = useAdminAuth();
  const pathname = usePathname();
  const router = useRouter();
  const isLogin = pathname === '/admin/login';

  useEffect(() => {
    if (status === 'admin' && isLogin) {
      const next = new URLSearchParams(window.location.search).get('next');
      router.replace(next && next.startsWith('/admin') ? next : '/admin');
    }
    if (status === 'anonymous' && !isLogin) {
      router.replace(`/admin/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [status, isLogin, pathname, router]);

  if (status === 'loading') return <FullPageSpinner />;
  if (isLogin) return status === 'admin' ? <FullPageSpinner /> : <>{children}</>;
  if (status === 'anonymous') return <FullPageSpinner />;
  if (status === 'forbidden') return <NoAccess />;
  return <DashboardLayout>{children}</DashboardLayout>;
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <FeedbackProvider>
        <AdminAuthProvider>
          <Shell>{children}</Shell>
          <BackToTop />
        </AdminAuthProvider>
      </FeedbackProvider>
    </ThemeProvider>
  );
}
