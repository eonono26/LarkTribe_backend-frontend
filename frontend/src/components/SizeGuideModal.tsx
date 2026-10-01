"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import type { SizeGuide } from "@/lib/types";

/**
 * Renders the admin-managed SizeGuide (Catalog → Size guides in Django
 * admin) attached to a product — a simple columns/rows table plus optional
 * fit notes, e.g. a Shoes guide with EU/UK/US/foot-length columns, or a
 * Clothes guide with chest/waist/height ranges.
 */
export default function SizeGuideModal({ guide, onClose }: { guide: SizeGuide; onClose: () => void }) {
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-start sm:items-center justify-center bg-stone-950/50 p-0 sm:p-6 font-sans"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative bg-white w-full sm:max-w-lg h-full sm:h-auto sm:max-h-[85vh] overflow-y-auto p-6 sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Close size guide"
          className="absolute top-4 right-4 z-10 text-espresso hover:opacity-60 transition-opacity"
        >
          <X size={18} />
        </button>

        <h2 className="text-base uppercase tracking-wide text-espresso mb-1">{guide.name}</h2>
        <p className="text-xs text-stone-400 mb-5">Size guide</p>

        {guide.columns?.length > 0 && guide.rows?.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-stone-300">
                  {guide.columns.map((col, i) => (
                    <th key={i} className="text-left py-2 pr-4 font-medium text-stone-500 uppercase tracking-wide whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {guide.rows.map((row, ri) => (
                  <tr key={ri} className="border-b border-stone-100">
                    {row.map((cell, ci) => (
                      <td key={ci} className="py-2 pr-4 text-espresso whitespace-nowrap">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-stone-400">No size chart added yet.</p>
        )}

        {guide.notes && (
          <p className="text-xs text-stone-500 leading-relaxed whitespace-pre-line mt-5 pt-4 border-t border-stone-200">
            {guide.notes}
          </p>
        )}
      </div>
    </div>
  );
}
