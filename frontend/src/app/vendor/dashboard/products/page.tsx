"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { vendorApi, VendorProduct } from "@/lib/vendor-api";
import { formatKES } from "@/lib/api";

const STATUS_STYLE: Record<string, string> = {
  active: "bg-green-100 text-green-800",
  pending: "bg-yellow-100 text-yellow-800",
  rejected: "bg-red-100 text-red-800",
  draft: "bg-neutral-100 text-neutral-600",
};

export default function VendorProductsPage() {
  const [products, setProducts] = useState<VendorProduct[]>([]);
  const [loading, setLoading] = useState(true);

  function load() {
    vendorApi.myProducts().then((p) => setProducts(Array.isArray(p) ? p : p.results)).finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function handleDelete(id: number) {
    if (!confirm("Delete this product?")) return;
    await vendorApi.deleteProduct(id);
    load();
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-display text-lg font-bold">Your products</h2>
        <Link
          href="/vendor/dashboard/products/new"
          className="bg-[var(--color-ink)] text-white text-xs font-semibold uppercase tracking-wide px-4 py-2.5 rounded-full"
        >
          + Add product
        </Link>
      </div>

      {loading ? (
        <p className="text-sm text-neutral-500">Loading…</p>
      ) : products.length === 0 ? (
        <p className="text-sm text-neutral-500">No products yet. Add your first one.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-neutral-500 border-b border-[var(--color-line)]">
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">SKU</th>
                <th className="py-2 pr-4">Price</th>
                <th className="py-2 pr-4">Stock</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4"></th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-b border-[var(--color-line)]">
                  <td className="py-2 pr-4 font-medium">{p.name}</td>
                  <td className="py-2 pr-4 text-neutral-500">{p.sku}</td>
                  <td className="py-2 pr-4">{formatKES(p.price)}</td>
                  <td className="py-2 pr-4">{p.stock}</td>
                  <td className="py-2 pr-4">
                    <span className={`text-xs font-semibold px-2 py-1 rounded ${STATUS_STYLE[p.status] ?? ""}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="py-2 pr-4 whitespace-nowrap">
                    <Link
                      href={`/vendor/dashboard/products/${p.id}/edit`}
                      className="text-[var(--color-ink)] text-xs font-semibold mr-3"
                    >
                      Edit
                    </Link>
                    <button onClick={() => handleDelete(p.id)} className="text-[var(--color-flag)] text-xs font-semibold">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-neutral-400 mt-4">
        New and edited products go to &quot;pending&quot; until an admin approves them — this keeps the marketplace catalog moderated.
      </p>
    </div>
  );
}
