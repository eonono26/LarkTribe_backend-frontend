"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Smartphone, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { api, apiErrorMessage, type PaymentSnapshot } from "@/lib/api";

const POLL_MS = 3000;
// After this long without an answer we let the shopper resend the prompt.
const RESEND_AFTER_S = 75;

/**
 * Shown on the order page while an M-Pesa order is unpaid. Polls the backend for the
 * STK Push result and lets the shopper (re)send the PIN prompt to any Safaricom number.
 */
export default function MpesaPaymentPanel({
  orderNumber,
  defaultPhone,
  onPaid,
}: {
  orderNumber: string;
  defaultPhone?: string;
  onPaid: () => void;
}) {
  const [snap, setSnap] = useState<PaymentSnapshot | null>(null);
  const [phone, setPhone] = useState(defaultPhone || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [waited, setWaited] = useState(0);
  const paidFired = useRef(false);

  const check = useCallback(async () => {
    try {
      const s = await api.paymentStatus(orderNumber);
      setSnap(s);
      if ((s.payment_status === "paid" || s.order_status !== "pending_payment") && !paidFired.current) {
        paidFired.current = true;
        onPaid();
      }
    } catch {
      /* transient network error: keep polling */
    }
  }, [orderNumber, onPaid]);

  const pending = snap?.payment_status === "pending";

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void check();
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [check]);

  useEffect(() => {
    if (!pending) return;
    const poll = setInterval(check, POLL_MS);
    const tick = setInterval(() => setWaited((w) => w + 1), 1000);
    return () => {
      clearInterval(poll);
      clearInterval(tick);
    };
  }, [pending, check]);

  async function send() {
    setError("");
    setBusy(true);
    try {
      const s = await api.payWithMpesa(orderNumber, phone);
      setWaited(0);
      setSnap(s);
    } catch (e) {
      setError(apiErrorMessage(e, "Could not send the M-Pesa prompt."));
    } finally {
      setBusy(false);
    }
  }

  if (!snap) {
    return (
      <div className="mb-10 border border-stone-200 bg-white p-6 text-sm text-stone-400">Checking payment…</div>
    );
  }

  if (snap.payment_status === "paid") {
    return (
      <div className="mb-10 border border-green-200 bg-green-50 p-6 flex items-start gap-3">
        <CheckCircle2 className="text-green-700 shrink-0" size={20} />
        <div className="text-sm">
          <p className="font-medium text-green-900">Payment received</p>
          {snap.receipt && <p className="text-green-800">M-Pesa receipt {snap.receipt}</p>}
        </div>
      </div>
    );
  }

  if (snap.payment_status === "review") {
    return (
      <div className="mb-10 border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">{snap.message}</div>
    );
  }

  const canResend = !pending || waited >= RESEND_AFTER_S;

  return (
    <div className="mb-10 border border-stone-200 bg-white p-6">
      <div className="flex items-start gap-3">
        {pending ? (
          <Loader2 className="animate-spin text-stone-700 shrink-0" size={20} />
        ) : snap.payment_status === "none" ? (
          <Smartphone className="text-stone-700 shrink-0" size={20} />
        ) : (
          <AlertCircle className="text-red-700 shrink-0" size={20} />
        )}
        <div className="text-sm flex-1">
          <p className="font-medium">
            {pending
              ? "Check your phone"
              : snap.payment_status === "none"
              ? "Complete your M-Pesa payment"
              : "Payment not completed"}
          </p>
          <p className="text-stone-500 mt-1">
            {pending
              ? "An M-Pesa prompt was sent to your phone. Enter your PIN to pay. This page updates automatically."
              : snap.payment_status === "none"
              ? "We couldn't send the prompt yet. Enter your M-Pesa number and try again."
              : snap.message}
          </p>
        </div>
      </div>

      {canResend && snap.payment_status !== "expired" && (
        <div className="mt-5 flex flex-col sm:flex-row gap-3">
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            inputMode="tel"
            placeholder="M-Pesa number, e.g. 0712 345 678"
            className="flex-1 bg-stone-50 border border-stone-200 px-4 py-3 text-sm outline-none focus:border-black"
          />
          <button
            onClick={send}
            disabled={busy || !phone.trim()}
            className="px-6 py-3 bg-black text-white text-[11px] uppercase tracking-widest font-medium hover:bg-stone-800 transition disabled:opacity-40"
          >
            {busy ? "Sending…" : pending ? "Resend prompt" : "Pay with M-Pesa"}
          </button>
        </div>
      )}
      {pending && !canResend && (
        <p className="mt-4 text-xs text-stone-400">Didn&apos;t get a prompt? You can resend it in a minute.</p>
      )}
      {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
    </div>
  );
}
