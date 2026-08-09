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
  products?: ProductListItem[]; // Optional products prop
}

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
    // If products were provided as props, use them
    if (initialProducts) {
      setProducts(initialProducts);
      setLoading(false);
      return;
    }

    // Otherwise fetch them
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
      <section className="container-shell mt-14">
        <h2 className="font-display text-2xl font-bold mb-5">{title}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-gray-200 aspect-[3/4] rounded-lg"></div>
              <div className="h-4 bg-gray-200 rounded mt-2"></div>
              <div className="h-3 bg-gray-200 rounded mt-1 w-2/3"></div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (error) {
    return null; // Silently fail if there's an error
  }

  if (products.length === 0) {
    return null; // Don't show anything if no products
  }

  return (
    <section className="container-shell mt-14">
      <div className="flex items-baseline justify-between mb-5">
        <h2 className="font-display text-2xl font-bold">{title}</h2>
        <Link href="/category/women" className="text-sm font-semibold underline">
          View all
        </Link>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {products.slice(0, 5).map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}