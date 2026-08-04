"use client";

import Link from "next/link";
import Image from "next/image";
import { Star } from "lucide-react";
import { mediaUrl, formatKES } from "@/lib/api";
import type { ProductListItem } from "@/lib/types";
import { useCart } from "@/lib/cart-context";
import WishlistButton from "./WishlistButton";

export default function ProductCard({ product }: { product: ProductListItem }) {
  const { addItem } = useCart();

  return (
    <div className="group relative border border-[var(--color-line)] rounded-lg overflow-hidden bg-white hover:shadow-lg transition-shadow">
      <Link href={`/product/${product.slug}`}>
        <div className="relative aspect-[3/4] bg-[var(--color-mist)]">
          {product.image ? (
            <Image
              src={mediaUrl(product.image)}
              alt={product.name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 50vw, 20vw"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-neutral-400 text-xs">
              No image yet
            </div>
          )}
          {product.discount_percent > 0 && (
            <span className="absolute top-2 left-2 bg-[var(--color-flag)] text-white text-[11px] font-bold px-1.5 py-0.5 rounded">
              -{product.discount_percent}%
            </span>
          )}
          <div className="absolute top-2 right-2 bg-white/90 rounded-full p-1.5">
            <WishlistButton productId={product.id} size={16} />
          </div>
        </div>
        <div className="p-3">
          <p className="text-[11px] uppercase tracking-wide text-neutral-500 truncate">{product.vendor_name}</p>
          <h3 className="text-sm font-medium leading-snug line-clamp-2 mt-0.5">{product.name}</h3>
          <div className="flex items-baseline gap-2 mt-1.5">
            <span className="font-bold">{formatKES(product.price)}</span>
            {product.compare_at_price && (
              <span className="text-xs text-neutral-400 line-through">{formatKES(product.compare_at_price)}</span>
            )}
          </div>
          {product.rating_count > 0 && (
            <div className="flex items-center gap-1 mt-1 text-xs text-neutral-500">
              <Star size={12} className="fill-[var(--color-signal)] text-[var(--color-signal)]" />
              {product.rating_avg} ({product.rating_count})
            </div>
          )}
        </div>
      </Link>
      <button
        onClick={() => addItem(product.id, 1)}
        className="w-full bg-[var(--color-ink)] text-white text-xs font-semibold uppercase tracking-wide py-2.5 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        Add to cart
      </button>
    </div>
  );
}
