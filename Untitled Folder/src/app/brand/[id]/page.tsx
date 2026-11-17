// app/brand/[id]/page.tsx
import Image from "next/image";
import ProductCard from "@/components/ProductCard";
import { api } from "@/lib/api";
import type { ProductListItem, Brand } from "@/lib/types";

export default async function BrandDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await api.brandProducts(Number(id)).catch(() => null);

  if (!data) {
    return (
      <main className="container-shell py-12">
        <p className="text-neutral-500">This brand couldn&apos;t be found.</p>
      </main>
    );
  }

  const brand = data.brand as Brand;

  // Get the primary image - check both primary_image and the first media file
  const getPrimaryImage = () => {
    // First check if there's a primary image
    if (brand.primary_image) {
      return brand.primary_image;
    }
    
    // Then check if there's any image in media_files
    if (brand.media_files && brand.media_files.length > 0) {
      const imageMedia = brand.media_files.filter(m => m.media_type === 'image');
      if (imageMedia.length > 0) {
        return imageMedia[0];
      }
    }
    
    // Then check images array
    if (brand.images && brand.images.length > 0) {
      return brand.images[0];
    }
    
    return null;
  };

  // Get all gallery images
  const getGalleryImages = () => {
    // Start with images array
    let images = [...(brand.images || [])];
    
    // If no images, try media_files
    if (images.length === 0 && brand.media_files) {
      images = brand.media_files.filter(m => m.media_type === 'image');
    }
    
    // If still no images, check if we have a primary image
    if (images.length === 0 && brand.primary_image) {
      images = [brand.primary_image];
    }
    
    return images;
  };

  const primaryImage = getPrimaryImage();
  const galleryImages = getGalleryImages();

  return (
    <main className="pb-10">
      {/* Full-bleed brand hero — reuses the primary/gallery image as a cover
          backdrop instead of a small square thumbnail in a grey card, so
          brand pages read like the rest of the site's editorial banners */}
      <div className="relative w-full h-[220px] sm:h-[300px] bg-[var(--color-ink)] overflow-hidden">
        {primaryImage ? (
          <Image
            src={primaryImage.file_url}
            alt=""
            fill
            className="object-cover opacity-40"
            sizes="100vw"
            priority
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-ink)] via-[var(--color-ink)]/60 to-[var(--color-ink)]/20" />

        <div className="relative h-full container-shell flex items-end pb-6 sm:pb-8">
          <div className="flex items-center gap-4 sm:gap-5">
            <div className="relative w-20 h-20 sm:w-28 sm:h-28 shrink-0 rounded-2xl overflow-hidden bg-white shadow-xl ring-4 ring-white/20">
              {primaryImage ? (
                <Image
                  src={primaryImage.file_url}
                  alt={primaryImage.alt_text || brand.name}
                  fill
                  className="object-cover"
                  sizes="112px"
                />
              ) : brand.logo_url ? (
                <Image
                  src={brand.logo_url}
                  alt={brand.name}
                  fill
                  className="object-contain p-2"
                  sizes="112px"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                  <span className="text-3xl sm:text-4xl font-bold text-neutral-400">
                    {brand.name.charAt(0)}
                  </span>
                </div>
              )}
            </div>

            <div>
              <h1 className="font-display text-2xl sm:text-4xl font-black text-white leading-tight">{brand.name}</h1>
              <p className="text-xs sm:text-sm text-white/80 mt-1">
                {data.count} product{data.count === 1 ? "" : "s"}
                {brand.website && (
                  <>
                    {" · "}
                    <a
                      href={brand.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:text-white"
                    >
                      Visit website
                    </a>
                  </>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container-shell mt-6 sm:mt-8">
        {brand.description && (
          <p className="text-sm text-neutral-600 max-w-2xl mb-8">{brand.description}</p>
        )}

        {/* Brand Media Gallery */}
        {galleryImages.length > 0 && (
          <div className="mb-8">
            <h2 className="font-display text-lg font-bold mb-4">Brand Gallery</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {galleryImages.slice(0, 8).map((media, index) => (
                <div key={media.id || index} className="relative aspect-square rounded-lg overflow-hidden bg-[var(--color-mist)] group">
                  <Image
                    src={media.file_url}
                    alt={media.alt_text || `${brand.name} image ${index + 1}`}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    sizes="(max-width: 768px) 50vw, 25vw"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Products */}
        {data.products.length === 0 ? (
          <p className="text-neutral-500">No products from this brand yet.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
            {data.products.map((p: ProductListItem) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}