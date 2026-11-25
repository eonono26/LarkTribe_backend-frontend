"use client";

import { useState } from "react";
import ProductImageGallery from "@/components/ProductImageGallery";
import Viewer360 from "@/components/Viewer360";
import Model3DViewer from "@/components/Model3DViewer";
import { mediaUrl } from "@/lib/api";
import type { ProductDetail } from "@/lib/types";

type Tab = "photos" | "360" | "3d";

/** Photos by default; adds 360° and 3D tabs only for products that have that media. */
export default function ProductMedia({
  product, images, color,
}: {
  product: ProductDetail;
  images: React.ComponentProps<typeof ProductImageGallery>["images"];
  color: string | null;
}) {
  const [tab, setTab] = useState<Tab>("photos");
  const frames = product.spin_frames || [];
  const has360 = frames.length >= 4;
  const has3d = !!product.model_3d_url;
  const tabs: { key: Tab; label: string }[] = [
    { key: "photos", label: "Photos" },
    ...(has360 ? [{ key: "360" as Tab, label: "360°" }] : []),
    ...(has3d ? [{ key: "3d" as Tab, label: "3D" }] : []),
  ];

  return (
    <div className="w-full">
      {tabs.length > 1 && (
        <div className="flex gap-1 mb-3" role="tablist" aria-label="Product media">
          {tabs.map((t) => (
            <button key={t.key} role="tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-2 text-[10px] uppercase tracking-widest border transition ${tab === t.key ? "bg-black text-white border-black" : "border-stone-300 hover:border-black"}`}>
              {t.label}
            </button>
          ))}
        </div>
      )}
      {tab === "photos" && (
        <ProductImageGallery images={images} productName={product.name} discountPercent={product.discount_percent} productId={product.id} />
      )}
      {tab === "360" && has360 && <Viewer360 frames={frames} color={color} alt={product.name} />}
      {tab === "3d" && has3d && (
        <Model3DViewer src={product.model_3d_url!} iosSrc={product.model_3d_ios_url} poster={product.model_3d_poster_url ? product.model_3d_poster_url : (images[0] ? mediaUrl(images[0].image) : null)} alt={product.name} />
      )}
    </div>
  );
}
