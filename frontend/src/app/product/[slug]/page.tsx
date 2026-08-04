import Image from "next/image";
import { Star } from "lucide-react";
import { api, mediaUrl, formatKES } from "@/lib/api";
import AddToCartButton from "@/components/AddToCartButton";
import WishlistButton from "@/components/WishlistButton";
import ReviewForm from "@/components/ReviewForm";
import RecommendedRow from "@/components/RecommendedRow";

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await api.product(slug);
  const primaryImage = product.images[0];

  return (
    <main className="container-shell py-10">
      <div className="grid md:grid-cols-2 gap-10">
        <div className="relative aspect-[3/4] bg-[var(--color-mist)] rounded-lg overflow-hidden">
          {primaryImage ? (
            <Image src={mediaUrl(primaryImage.image)} alt={product.name} fill className="object-cover" />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-neutral-400 text-sm">No image yet</div>
          )}
          {product.discount_percent > 0 && (
            <span className="absolute top-3 left-3 bg-[var(--color-flag)] text-white text-xs font-bold px-2 py-1 rounded">
              -{product.discount_percent}%
            </span>
          )}
          <div className="absolute top-3 right-3 bg-white rounded-full p-2 shadow">
            <WishlistButton productId={product.id} />
          </div>
        </div>

        <div>
          <p className="text-xs uppercase tracking-wide text-neutral-500">{product.vendor_name}</p>
          <h1 className="font-display text-2xl md:text-3xl font-black mt-1">{product.name}</h1>

          {product.rating_count > 0 && (
            <div className="flex items-center gap-1 mt-2 text-sm text-neutral-600">
              <Star size={14} className="fill-[var(--color-signal)] text-[var(--color-signal)]" />
              {product.rating_avg} · {product.rating_count} reviews
            </div>
          )}

          <div className="flex items-baseline gap-3 mt-4">
            <span className="text-2xl font-bold">{formatKES(product.price)}</span>
            {product.compare_at_price && (
              <span className="text-neutral-400 line-through">{formatKES(product.compare_at_price)}</span>
            )}
          </div>

          {product.variants.length > 0 && (
            <div className="mt-5">
              <p className="text-sm font-semibold mb-2">Options</p>
              <div className="flex flex-wrap gap-2">
                {product.variants.map((v) => (
                  <span key={v.id} className="border border-[var(--color-line)] rounded-full px-3 py-1 text-sm">
                    {[v.size, v.color].filter(Boolean).join(" · ") || "Standard"}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 flex items-center gap-3">
            <AddToCartButton productId={product.id} inStock={product.stock > 0} />
          </div>

          <p className="text-sm text-neutral-600 mt-8 leading-relaxed whitespace-pre-line">{product.description}</p>

          <div className="mt-10 border-t border-[var(--color-line)] pt-6">
            <h2 className="font-display font-bold mb-4">Reviews</h2>
            {product.reviews.length > 0 && (
              <div className="space-y-4 mb-6">
                {product.reviews.map((r) => (
                  <div key={r.id} className="text-sm">
                    <div className="flex items-center gap-1 font-semibold">
                      <Star size={12} className="fill-[var(--color-signal)] text-[var(--color-signal)]" />
                      {r.rating}/5 · {r.user}
                    </div>
                    <p className="text-neutral-600 mt-1">{r.comment}</p>
                  </div>
                ))}
              </div>
            )}
            <ReviewForm productId={product.id} />
          </div>
        </div>
      </div>

      <RecommendedRow title="You may also like" kind="similar" productId={product.id} />
      <RecommendedRow title="Frequently bought together" kind="fbt" productId={product.id} />
    </main>
  );
}
