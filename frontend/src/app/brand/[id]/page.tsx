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

  // Debug: Log what we have
  console.log('Brand data:', {
    id: brand.id,
    name: brand.name,
    logo: brand.logo,
    logo_url: brand.logo_url,
    primary_image: brand.primary_image,
    images_count: brand.images?.length || 0,
    media_files_count: brand.media_files?.length || 0,
    media_files: brand.media_files
  });

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
    <main className="container-shell py-10">
      {/* Brand Header with Image */}
      <div className="flex flex-col md:flex-row items-start md:items-center gap-6 mb-8 p-6 bg-gradient-to-r from-gray-50 to-white rounded-2xl border border-[var(--color-line)]">
        <div className="relative w-32 h-32 flex-shrink-0">
          {primaryImage ? (
            <Image
              src={primaryImage.file_url}
              alt={primaryImage.alt_text || brand.name}
              fill
              className="object-cover rounded-lg"
              sizes="128px"
            />
          ) : brand.logo_url ? (
            <Image
              src={brand.logo_url}
              alt={brand.name}
              fill
              className="object-contain"
              sizes="128px"
            />
          ) : (
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
              <span className="text-4xl font-bold text-gray-400">
                {brand.name.charAt(0)}
              </span>
            </div>
          )}
        </div>
        
        <div className="flex-1">
          <h1 className="font-display text-3xl font-black mb-1">{brand.name}</h1>
          {brand.description && (
            <p className="text-sm text-neutral-600 mb-2">{brand.description}</p>
          )}
          <p className="text-sm text-neutral-500">
            {data.count} product{data.count === 1 ? "" : "s"}
          </p>
          {brand.website && (
            <a 
              href={brand.website} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-sm text-[#c96e6e] hover:underline inline-block mt-2"
            >
              Visit website →
            </a>
          )}
        </div>
      </div>

      {/* Brand Media Gallery */}
      {galleryImages.length > 0 && (
        <div className="mb-8">
          <h2 className="font-display text-lg font-bold mb-4">Brand Gallery</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {galleryImages.slice(0, 8).map((media, index) => (
              <div key={media.id || index} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 group">
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
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {data.products.map((p: ProductListItem) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </main>
  );
}