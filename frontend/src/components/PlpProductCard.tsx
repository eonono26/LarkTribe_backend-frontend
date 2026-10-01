"use client";

import Link from "next/link";
import Image from "next/image";
import { mediaUrl } from "@/lib/api";
import type { ProductListItem } from "@/lib/types";

export default function PlpProductCard({ product }: { product: ProductListItem }) {
  const img = product.image ? mediaUrl(product.image) : "";
  return (
    <Link href={`/product/${product.slug}`} className="group block">
      <div className="aspect-[3/4] bg-stone-100 overflow-hidden mb-3 relative">
        {img ? (
          <Image src={img} alt={product.name} fill className="object-cover group-hover:scale-[1.02] transition duration-500" sizes="(max-width: 768px) 50vw, 33vw" />
        ) : (
          <div className="w-full h-full bg-stone-100" />
        )}
        {product.discount_percent ? (
          <span className="absolute top-2 left-2 bg-black text-white text-[9px] uppercase tracking-wider px-1.5 py-0.5">Sale</span>
        ) : null}
      </div>
      <h3 className="text-[13px] font-medium text-stone-800 leading-tight line-clamp-1 group-hover:text-black transition">{product.name}</h3>
      <p className="text-[13px] text-stone-500 mt-0.5">
        {product.compare_at_price ? (
          <>
            <span className="text-stone-400 line-through mr-1">KES {parseFloat(product.compare_at_price).toLocaleString("en-KE")}</span>
            KES {parseFloat(product.price).toLocaleString("en-KE")}
          </>
        ) : (
          `KES ${parseFloat(product.price).toLocaleString("en-KE")}`
        )}
      </p>
    </Link>
  );
}