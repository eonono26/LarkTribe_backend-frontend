// components/RecommendedRow.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import ProductCard from './ProductCard';
import type { ProductListItem } from '@/lib/types';
import { api } from '@/lib/api';

interface RecommendedRowProps {
  title: string;
  kind: 'similar' | 'fbt' | 'recommended';
  productId?: number;
  products?: ProductListItem[];
}

// Extract image URL from various possible formats
const extractImageUrl = (imageData: any): string | null => {
  if (!imageData) return null;
  
  // If it's a string
  if (typeof imageData === 'string') {
    return imageData.trim() || null;
  }
  
  // If it's a ProductImage object
  if (typeof imageData === 'object') {
    // Check for image property
    if (imageData.image) {
      return extractImageUrl(imageData.image);
    }
    // Check for file_url
    if (imageData.file_url) {
      return imageData.file_url;
    }
    // Check for file
    if (imageData.file) {
      return imageData.file;
    }
    // Check for url
    if (imageData.url) {
      return imageData.url;
    }
  }
  
  return null;
};

// Get all image URLs from a product
const getAllImageUrls = (product: ProductListItem): string[] => {
  const urls: string[] = [];
  
  // Try image_url
  if ((product as any).image_url) {
    const url = extractImageUrl((product as any).image_url);
    if (url) urls.push(url);
  }
  
  // Try image
  if (product.image) {
    const url = extractImageUrl(product.image);
    if (url) urls.push(url);
  }
  
  // Try images array (ProductImage objects or strings)
  if (product.images && product.images.length > 0) {
    for (const img of product.images) {
      const url = extractImageUrl(img);
      if (url) urls.push(url);
    }
  }
  
  // Remove duplicates
  return [...new Set(urls)];
};

// Get primary image URL
const getPrimaryImageUrl = (product: ProductListItem): string | null => {
  // Try image_url first
  if ((product as any).image_url) {
    const url = extractImageUrl((product as any).image_url);
    if (url) return url;
  }
  
  // Try image
  if (product.image) {
    const url = extractImageUrl(product.image);
    if (url) return url;
  }
  
  // Try first image from images array
  if (product.images && product.images.length > 0) {
    return extractImageUrl(product.images[0]);
  }
  
  return null;
};

// Build full URL - FIXED: Remove /api from the base URL
const buildFullUrl = (path: string | null): string | null => {
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
    return path;
  }
  // Remove /api from the base URL if present
  const baseUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000').replace(/\/api$/, '');
  return path.startsWith('/') ? `${baseUrl}${path}` : `${baseUrl}/${path}`;
};

export default function RecommendedRow({ 
  title, 
  kind, 
  productId, 
  products: initialProducts 
}: RecommendedRowProps) {
  const [products, setProducts] = useState<ProductListItem[]>(initialProducts || []);
  const [loading, setLoading] = useState(!initialProducts);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialProducts) {
      setProducts(initialProducts);
      setLoading(false);
      return;
    }

    const fetchProducts = async () => {
      if (!productId) {
        setLoading(false);
        return;
      }

      try {
        let data;
        if (kind === 'recommended') {
          data = await api.recommendedForYou();
        } else if (kind === 'similar') {
          data = await api.similarProducts(productId);
        } else if (kind === 'fbt') {
          data = await api.frequentlyBoughtTogether(productId);
        }
        
        setProducts(data || []);
        setError(null);
      } catch (err) {
        console.error(`Failed to fetch ${kind} products:`, err);
        setError('Failed to load recommendations');
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [kind, productId, initialProducts]);

  if (loading) {
    return (
      <section className="container-shell mt-3">
        <h2 className="font-display text-2xl font-bold mb-5">{title}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-gray-200 aspect-square rounded-lg"></div>
              <div className="h-4 bg-gray-200 rounded mt-2"></div>
              <div className="h-3 bg-gray-200 rounded mt-1 w-2/3"></div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (error || products.length === 0) {
    return null;
  }

  return (
    <section className="container-shell mt-3">
      <div className="flex items-baseline justify-between mb-5">
        <h2 className="font-display text-2xl font-bold">{title}</h2>
        <Link href="/category/women" className="text-sm font-semibold underline">
          View all
        </Link>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {products.slice(0, 5).map((product) => {
          // Get primary image URL
          const primaryImageUrl = getPrimaryImageUrl(product);
          const fullPrimaryUrl = buildFullUrl(primaryImageUrl);
          
          // Get all image URLs
          const allImageUrls = getAllImageUrls(product);
          const fullImageUrls = allImageUrls
            .map(url => buildFullUrl(url))
            .filter((url): url is string => url !== null);
          
          const mappedProduct = {
            id: String(product.id),
            name: product.name,
            slug: product.slug,
            price: parseFloat(product.price) || 0,
            compare_at_price: product.compare_at_price ? parseFloat(product.compare_at_price) : undefined,
            image: fullPrimaryUrl,
            image_url: fullPrimaryUrl,
            images: fullImageUrls.length > 0 ? fullImageUrls : (fullPrimaryUrl ? [fullPrimaryUrl] : []),
            rating_avg: parseFloat(product.rating_avg) || 0,
            rating_count: product.rating_count || 0,
            discount_percent: product.discount_percent || 0,
            vendor_name: product.vendor_name || '',
            category_name: product.category_name || '',
            stock: product.stock || 0,
            status: product.status || 'active',
            is_featured: product.is_featured || false,
          };

          return <ProductCard key={product.id} product={mappedProduct} />;
        })}
      </div>
    </section>
  );
}