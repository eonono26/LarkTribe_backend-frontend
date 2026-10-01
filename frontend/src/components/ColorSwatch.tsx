"use client";

import { isPaleColor, swatchBackground } from "@/lib/colors";

/**
 * One clickable color chip, used on the product page, quick view and every
 * product card so a color looks and behaves the same everywhere.
 *
 * - Always outlined, so White / Off White / Cream never vanish on a white page.
 * - Selected state = dark ring (clear even on pale colors).
 * - soldOut = diagonal strike, still clickable so shoppers can see the photo.
 */
export default function ColorSwatch({
  color,
  selected,
  onClick,
  size = 28,
  shape = "square",
  soldOut = false,
}: {
  color: string;
  selected: boolean;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  size?: number;
  shape?: "square" | "round";
  soldOut?: boolean;
}) {
  const pale = isPaleColor(color);

  return (
    <button
      type="button"
      aria-label={soldOut ? `${color} (sold out)` : color}
      aria-pressed={selected}
      title={soldOut ? `${color} — sold out` : color}
      onClick={onClick}
      style={{ background: swatchBackground(color), width: size, height: size }}
      className={`relative shrink-0 overflow-hidden border transition ${
        shape === "round" ? "rounded-full" : "rounded-[2px]"
      } ${pale ? "border-stone-400" : "border-stone-300"} ${
        selected
          ? "ring-2 ring-offset-2 ring-espresso"
          : "hover:ring-1 hover:ring-offset-1 hover:ring-stone-400"
      }`}
    >
      {soldOut && (
        <span
          aria-hidden
          className="absolute left-1/2 top-1/2 h-px w-[140%] -translate-x-1/2 -translate-y-1/2 -rotate-45 bg-stone-500"
        />
      )}
    </button>
  );
}
