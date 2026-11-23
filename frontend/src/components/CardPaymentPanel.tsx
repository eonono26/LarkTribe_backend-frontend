"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CreditCard, Loader2, AlertCircle } from "lucide-react";
import { features } from "@/lib/features-api";

/**
 * Shown on the order page while a card order is unpaid. When the shopper just came
 * back from the hosted payment page it confirms the payment with the gateway
 * (webhooks usually beat us to it); otherwise it lets them (re)start the payment.
 */
export default function CardPaymentPanel({
  orderNumber, returned, cancelled, onPaid,
}: { orderNumber: string; returned: boolean; cancelled: boolean; onPaid: () => void }) {
  const [state, setState] = useState<"idle" | "checking" | "pending" | "failed">(returned ? "checking" : "idle");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const fired = useRef(false);

  const verify = useCallback(async () => {
    try {
      const r = await features.verifyCard(orderNumber);
      if (r.payment_status === "paid" || r.order_status !== "pending_payment") {
        if (!fired.current) { fired.current = true; onPaid(); }
        return true;
      }
      setState("pending");
      setMessage(r.message);
    } catch { setState("pending"); }
    return false;
  }, [orderNumber, onPaid]);

  useEffect(() => {
    if (!returned) return;
    let tries = 0;
    const t = setInterval(async () => {
      tries++;
      if ((await verify()) || tries >= 10) clearInterval(t);
    }, 3000);
    verify();
    return () => clearInterval(t);
  }, [returned, verify]);

  async function pay() {
    setBusy(true); setMessage("");
    try {
      const r = await features.payWithCard(orderNumber);
      if (r.payment.redirect_url) { window.location.href = r.payment.redirect_url; return; }
      if (r.payment.status === "paid") { onPaid(); return; }
      setState("failed"); setMessage(r.payment.message || "Couldn't start the card payment.");
    } catch (e) {
      setState("failed"); setMessage(e instanceof Error ? e.message : "Couldn't start the card payment.");
    } finally { setBusy(false); }
  }

  return (
    <div className="mb-10 border border-stone-300 bg-white p-5">
      <div className="flex items-start gap-3">
        {state === "checking" ? <Loader2 size={20} className="animate-spin mt-0.5" /> : state === "failed" ? <AlertCircle size={20} className="mt-0.5 text-red-700" /> : <CreditCard size={20} strokeWidth={1.5} className="mt-0.5" />}
        <div className="flex-1">
          <p className="text-sm font-medium">
            {state === "checking" ? "Confirming your card payment…" : cancelled ? "Card payment was cancelled." : "Complete your card payment"}
          </p>
          <p className="text-xs text-stone-500 mt-1">
            {message || (state === "checking" || state === "pending" ? "This usually takes a few seconds. You can leave this page open." : "Your order is reserved while payment is pending. Pay securely by Visa, Mastercard or Amex.")}
          </p>
          {state !== "checking" && (
            <button onClick={pay} disabled={busy} className="mt-3 px-6 py-3 bg-black text-white text-[11px] uppercase tracking-widest disabled:opacity-50">
              {busy ? "Opening…" : "Pay by card"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
