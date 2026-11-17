import { isPaleColor, swatchBackground } from "@/lib/colors";

/**
 * "● White · M" — the color/size the shopper chose, shown on every bag /
 * checkout / order line so it's obvious what will actually be delivered.
 */
export default function VariantBadge({
  color,
  size,
  className = "text-xs text-stone-500",
}: {
  color?: string | null;
  size?: string | null;
  className?: string;
}) {
  if (!color && !size) return null;

  return (
    <p className={`flex items-center gap-1.5 ${className}`}>
      {color && (
        <span
          aria-hidden
          className={`inline-block h-3 w-3 shrink-0 rounded-full border ${
            isPaleColor(color) ? "border-stone-400" : "border-stone-300"
          }`}
          style={{ background: swatchBackground(color) }}
        />
      )}
      <span>
        {color && <span>Color: {color}</span>}
        {color && size && <span className="mx-1.5 text-stone-300">|</span>}
        {size && <span>Size: {size}</span>}
      </span>
    </p>
  );
}
