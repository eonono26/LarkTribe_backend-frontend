"use client";

import Link from "next/link";
import Image from "next/image";
import { mediaUrl } from "@/lib/api";
import Model3DViewer from "@/components/Model3DViewer";
import type { ProductListItem } from "@/lib/types";

export default function PlpProductCard({ product }: { product: ProductListItem }) {
  const img = product.image ? mediaUrl(product.image) : "";
  const modelSrc = product.model_3d_url ? mediaUrl(product.model_3d_url) : "";
  const iosSrc = product.model_3d_ios_url ? mediaUrl(product.model_3d_ios_url) : null;
  const poster = mediaUrl(product.model_3d_poster_url || product.image || null) || null;
  return (
    <div className="group block">
      <div className="aspect-[3/4] bg-stone-100 overflow-hidden mb-3 relative">
        {modelSrc ? (
          <div className="absolute inset-0 z-[1]">
            <Model3DViewer src={modelSrc} iosSrc={iosSrc} poster={poster} alt={product.name} compact />
          </div>
        ) : img ? (
          <Link href={`/product/${product.slug}`} className="relative block h-full w-full">
            <Image src={img} alt={product.name} fill className="object-cover group-hover:scale-[1.02] transition duration-500" sizes="(max-width: 768px) 50vw, 33vw" />
          </Link>
        ) : (
          <Link href={`/product/${product.slug}`} className="block w-full h-full bg-stone-100" />
        )}
        {modelSrc && <span className="pointer-events-none absolute bottom-2 left-2 z-[2] bg-black/85 text-white text-[9px] uppercase tracking-widest px-2 py-1">3D · AR</span>}
        {product.discount_percent ? (
          <span className="pointer-events-none absolute top-2 left-2 z-[2] bg-black text-white text-[9px] uppercase tracking-wider px-1.5 py-0.5">Sale</span>
        ) : null}
      </div>
      <Link href={`/product/${product.slug}`} className="block">
        <h3 className="text-[13px] font-medium text-stone-800 leading-tight line-clamp-2 sm:line-clamp-1 group-hover:text-black transition">{product.name}</h3>
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
    </div>
  );
}