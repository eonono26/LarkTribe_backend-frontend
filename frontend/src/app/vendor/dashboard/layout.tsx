"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { isVendorLoggedIn, clearToken } from "@/lib/vendor-api";

export default function VendorDashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!isVendorLoggedIn()) {
      router.replace("/vendor/login");
    } else {
      setChecked(true);
    }
  }, [router]);

  if (!checked) return null;

  const tabs = [
    { href: "/vendor/dashboard", label: "Overview" },
    { href: "/vendor/dashboard/products", label: "Products" },
    { href: "/vendor/dashboard/orders", label: "Orders" },
  ];

  return (
    <main className="container-shell py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-black">Vendor dashboard</h1>
        <button
          onClick={() => {
            clearToken();
            router.push("/vendor/login");
          }}
          className="text-sm font-semibold underline"
        >
          Sign out
        </button>
      </div>
      <nav className="flex gap-6 border-b border-[var(--color-line)] mb-6 text-sm font-semibold">
        {tabs.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className={`pb-3 border-b-2 -mb-px ${
              pathname === t.href ? "border-[var(--color-ink)]" : "border-transparent text-neutral-500"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </nav>
      {children}
    </main>
  );
}
