import Link from "next/link";
import Image from "next/image";
import type { Category } from "@/lib/types";

export default function CategoryCard({ category, accent }: { category: Category; accent?: string }) {
  const imageUrl = category.primary_image?.file_url || category.images?.[0]?.file_url || null;

  return (
    <Link
      href={`/categories/${category.slug}`}
      className="group bg-white border border-[var(--color-line)] rounded-lg overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-b-4"
      style={accent ? { borderBottomColor: accent } : undefined}
    >
      <div className="relative aspect-square w-full bg-[var(--color-mist)] overflow-hidden">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={category.primary_image?.alt_text || category.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-110"
            sizes="(max-width: 768px) 33vw, 16vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-3xl font-bold text-neutral-300">{category.name.charAt(0)}</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
        <div className="absolute bottom-0 left-0 right-0 p-3 pointer-events-none">
          <p className="text-sm font-semibold text-white drop-shadow-md truncate">{category.name}</p>
          {/* <p className="text-xs text-white/80 drop-shadow-md">{category.product_count} products</p> */}
        </div> 
      </div>
    </Link>
  );
}
