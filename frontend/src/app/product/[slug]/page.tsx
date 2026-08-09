import { Star } from "lucide-react";
import { api, formatKES } from "@/lib/api";
import AddToCartButton from "@/components/AddToCartButton";
import WishlistButton from "@/components/WishlistButton";
import ReviewForm from "@/components/ReviewForm";
import RecommendedRow from "@/components/RecommendedRow";
import ProductImageGallery from "@/components/ProductImageGallery";
import { notFound } from "next/navigation";

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  
  let product;
  let similarProducts: import("@/lib/types").ProductListItem[] = [];
  let fbtProducts: import("@/lib/types").ProductListItem[] = [];
  
  try {
    product = await api.product(slug);
  } catch (error: any) {
    console.error(`Failed to fetch product with slug "${slug}":`, error);
    
    if (error.message?.includes('404')) {
      notFound();
    }
    notFound();
  }

  if (!product) {
    notFound();
  }

  // Fetch recommended products with error handling
  try {
    const [similar, fbt] = await Promise.all([
      api.similarProducts(product.id).catch(() => []),
      api.frequentlyBoughtTogether(product.id).catch(() => []),
    ]);
    similarProducts = similar || [];
    fbtProducts = fbt || [];
  } catch (error) {
    console.error('Failed to fetch recommended products:', error);
    similarProducts = [];
    fbtProducts = [];
  }

  // Safely handle variants and reviews
  const variants = product.variants || [];
  const reviews = product.reviews || [];
  const images = product.images || [];

  return (
    <main className="container-shell py-10">
      <div className="grid md:grid-cols-2 gap-10">
        {/* Product Images Section with Gallery */}
        <div>
          <ProductImageGallery 
            images={images}
            productName={product.name}
            discountPercent={product.discount_percent}
            productId={product.id}
          />
        </div>

        {/* Product Info Section */}
        <div>
          <p className="text-xs uppercase tracking-wide text-neutral-500">{product.vendor_name || 'Vendor'}</p>
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

          {variants.length > 0 && (
            <div className="mt-5">
              <p className="text-sm font-semibold mb-2">Options</p>
              <div className="flex flex-wrap gap-2">
                {variants.map((v: any) => (
                  <span key={v.id} className="border border-[var(--color-line)] rounded-full px-3 py-1 text-sm">
                    {[v.size, v.color].filter(Boolean).join(" · ") || "Standard"}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 flex items-center gap-3">
            <AddToCartButton productId={product.id} inStock={product.stock > 0} />
            {product.stock > 0 ? (
              <span className="text-sm text-green-600">In Stock</span>
            ) : (
              <span className="text-sm text-red-600">Out of Stock</span>
            )}
          </div>

          {product.description && (
            <p className="text-sm text-neutral-600 mt-8 leading-relaxed whitespace-pre-line">
              {product.description}
            </p>
          )}

          {/* Reviews Section */}
          <div className="mt-10 border-t border-[var(--color-line)] pt-6">
            <h2 className="font-display font-bold mb-4">Reviews</h2>
            {reviews.length > 0 ? (
              <div className="space-y-4 mb-6">
                {reviews.map((r: any) => (
                  <div key={r.id} className="text-sm">
                    <div className="flex items-center gap-1 font-semibold">
                      <Star size={12} className="fill-[var(--color-signal)] text-[var(--color-signal)]" />
                      {r.rating}/5 · {r.user}
                    </div>
                    <p className="text-neutral-600 mt-1">{r.comment}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-neutral-500 mb-6">No reviews yet. Be the first to review!</p>
            )}
            <ReviewForm productId={product.id} />
          </div>
        </div>
      </div>

      {/* Recommended Products */}
      {similarProducts.length > 0 && (
        <RecommendedRow 
          title="You may also like" 
          kind="similar" 
          productId={product.id}
          products={similarProducts}
        />
      )}
      
      {fbtProducts.length > 0 && (
        <RecommendedRow 
          title="Frequently bought together" 
          kind="fbt" 
          productId={product.id}
          products={fbtProducts}
        />
      )}
    </main>
  );
}