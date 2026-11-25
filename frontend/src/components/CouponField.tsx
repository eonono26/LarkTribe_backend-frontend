"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useLocalization } from "@/lib/localization-context";

export default function CouponField({
  subtotal,
  onApplied,
}: {
  subtotal: number;
  onApplied: (code: string, discount: number) => void;
}) {
  const { formatPrice } = useLocalization();
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<"idle" | "checking" | "applied" | "invalid">("idle");
  const [discount, setDiscount] = useState(0);

  async function apply() {
    if (!code.trim()) return;
    setStatus("checking");
    try {
      const res = await api.validateCoupon(code.trim(), subtotal);
      if (res.valid && res.discount !== undefined) {
        setDiscount(res.discount);
        setStatus("applied");
        onApplied(code.trim(), res.discount);
      } else {
        setStatus("invalid");
      }
    } catch {
      setStatus("invalid");
    }
  }

  return (
    <div className="mt-4">
      <p className="text-sm font-semibold mb-2">Coupon code</p>
      <div className="flex gap-2">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="e.g. WELCOME10"
          disabled={status === "applied"}
          className="flex-1 bg-[var(--color-mist)] rounded-lg px-4 py-3 outline-none text-sm disabled:opacity-60"
        />
        <button
          onClick={apply}
          disabled={status === "checking" || status === "applied"}
          className="border border-[var(--color-ink)] rounded-lg px-4 text-xs font-semibold uppercase disabled:opacity-40"
        >
          {status === "applied" ? "Applied" : "Apply"}
        </button>
      </div>
      {status === "applied" && (
        <p className="text-sm text-[var(--dept-maternity)] mt-1">Coupon applied — {formatPrice(discount)} off.</p>
      )}
      {status === "invalid" && <p className="text-sm text-[var(--color-flag)] mt-1">Invalid or expired coupon.</p>}
    </div>
  );
}
