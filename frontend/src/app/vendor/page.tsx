import Link from "next/link";

export default function VendorPage() {
  return (
    <main className="container-shell py-16 max-w-lg">
      <h1 className="font-display text-3xl font-black mb-3">Sell on duka</h1>
      <p className="text-neutral-600 mb-6">
        Manage your products, stock, and orders from the vendor dashboard.
      </p>
      <div className="flex gap-3">
        <Link
          href="/vendor/apply"
          className="btn btn-signal"
        >
          Apply to sell
        </Link>
        <Link
          href="/vendor/login"
          className="btn btn-ink"
        >
          Vendor dashboard
        </Link>
      </div>
    </main>
  );
}
