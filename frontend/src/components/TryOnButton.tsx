"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { Sparkles } from "lucide-react";
import TryOnModal, { type TryOnProduct } from "@/components/TryOnModal";
import type { ProductListItem } from "@/lib/types";

/** "Try it on" trigger. variant="solid" for product pages, "outline" for cards. */
export default function TryOnButton({
  product, color, companions, variant = "outline", className = "", label = "Try it on",
}: {
  product: TryOnProduct;
  color?: string | null;
  companions?: ProductListItem[];
  variant?: "solid" | "outline";
  className?: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const base = variant === "solid"
    ? "w-full py-3.5 border border-black text-black hover:bg-black hover:text-white text-[11px] uppercase tracking-widest"
    : "py-2 border border-stone-300 text-black hover:border-black text-[10px] uppercase tracking-wider";
  return (
    <>
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(true); }}
        className={`inline-flex items-center justify-center gap-1.5 transition ${base} ${className}`}
        aria-label={label || "Try on"}
      >
        <Sparkles size={variant === "solid" ? 14 : 12} strokeWidth={1.6} /> {label}
      </button>
      {open && typeof document !== "undefined" && createPortal(
        <TryOnModal product={product} initialColor={color} companions={companions} onClose={() => setOpen(false)} />,
        document.body,
      )}
    </>
  );
}
