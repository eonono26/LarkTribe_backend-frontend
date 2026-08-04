"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { auth, isLoggedIn, type AuthUser } from "@/lib/auth";

const NAV = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/vendors", label: "Vendors" },
  { href: "/admin/products", label: "Moderation" },
  { href: "/admin/promotions", label: "Promotions" },
  { href: "/admin/support", label: "Support" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (pathname === "/admin/login") {
      setChecked(true);
      return;
    }
    if (!isLoggedIn()) {
      router.push("/admin/login");
      return;
    }
    auth
      .me()
      .then((u) => {
        if (u.role !== "admin") {
          router.push("/admin/login");
          return;
        }
        setUser(u);
      })
      .catch(() => router.push("/admin/login"))
      .finally(() => setChecked(true));
  }, [pathname, router]);

  if (pathname === "/admin/login") return <>{children}</>;
  if (!checked) return <main className="container-shell py-16 text-neutral-400">Loading admin…</main>;

  return (
    <div className="container-shell py-10 grid md:grid-cols-[200px_1fr] gap-10">
      <aside>
        <p className="font-display font-black text-lg mb-1">Admin</p>
        {user && <p className="text-xs text-neutral-400 mb-6">{user.username}</p>}
        <nav className="space-y-1">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`block text-sm font-semibold px-3 py-2 rounded-lg ${
                pathname === item.href ? "bg-[var(--color-ink)] text-white" : "hover:bg-[var(--color-mist)]"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div>{children}</div>
    </div>
  );
}
