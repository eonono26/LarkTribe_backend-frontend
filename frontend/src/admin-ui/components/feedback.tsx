'use client';

import { useRef, useMemo, useState, useContext, useCallback, createContext } from 'react';

import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Snackbar from '@mui/material/Snackbar';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';

// ----------------------------------------------------------------------

type ToastApi = { success: (m: string) => void; error: (m: string) => void; info: (m: string) => void };
const ToastCtx = createContext<ToastApi | null>(null);

export function useToast() {
  const v = useContext(ToastCtx);
  if (!v) throw new Error('useToast must be used inside <FeedbackProvider>');
  return v;
}

type ConfirmOpts = { title: string; message?: string; confirmLabel?: string; destructive?: boolean };
type ConfirmFn = (opts: ConfirmOpts) => Promise<boolean>;
const ConfirmCtx = createContext<ConfirmFn | null>(null);

export function useConfirm() {
  const v = useContext(ConfirmCtx);
  if (!v) throw new Error('useConfirm must be used inside <FeedbackProvider>');
  return v;
}

export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<{ id: number; msg: string; severity: 'success' | 'error' | 'info' } | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmOpts | null>(null);
  const resolver = useRef<((v: boolean) => void) | null>(null);
  const seq = useRef(0);

  const api = useMemo<ToastApi>(
    () => ({
      success: (msg) => setToast({ id: ++seq.current, msg, severity: 'success' }),
      error: (msg) => setToast({ id: ++seq.current, msg, severity: 'error' }),
      info: (msg) => setToast({ id: ++seq.current, msg, severity: 'info' }),
    }),
    []
  );

  const confirm = useCallback<ConfirmFn>(
    (opts) =>
      new Promise<boolean>((resolve) => {
        resolver.current = resolve;
        setConfirmState(opts);
      }),
    []
  );

  const close = (v: boolean) => {
    resolver.current?.(v);
    resolver.current = null;
    setConfirmState(null);
  };

  return (
    <ToastCtx.Provider value={api}>
      <ConfirmCtx.Provider value={confirm}>
        {children}

        <Snackbar
          key={toast?.id}
          open={!!toast}
          autoHideDuration={toast?.severity === 'error' ? 7000 : 3500}
          onClose={(_, reason) => reason !== 'clickaway' && setToast(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          {toast ? (
            <Alert severity={toast.severity} variant="filled" onClose={() => setToast(null)} sx={{ maxWidth: 480 }}>
              {toast.msg}
            </Alert>
          ) : undefined}
        </Snackbar>

        <Dialog open={!!confirmState} onClose={() => close(false)} maxWidth="xs" fullWidth>
          <DialogTitle>{confirmState?.title}</DialogTitle>
          {confirmState?.message && (
            <DialogContent>
              <DialogContentText>{confirmState.message}</DialogContentText>
            </DialogContent>
          )}
          <DialogActions>
            <Button onClick={() => close(false)} color="inherit">Cancel</Button>
            <Button onClick={() => close(true)} variant="contained" color={confirmState?.destructive ? 'error' : 'primary'}>
              {confirmState?.confirmLabel ?? 'Confirm'}
            </Button>
          </DialogActions>
        </Dialog>
      </ConfirmCtx.Provider>
    </ToastCtx.Provider>
  );
}
