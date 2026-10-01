import Link from "next/link";

export default function ReturnsPage() {
  return (
    <main className="container-shell py-12 max-w-3xl">
      <h1 className="font-display text-3xl font-black mb-2">Returns & refunds</h1>
      <p className="text-sm text-neutral-500 mb-8">Last updated August 2026</p>

      <div className="space-y-8 text-sm leading-relaxed text-neutral-700">
        <section>
          <h2 className="font-display text-lg font-bold text-[var(--color-ink)] mb-2">Eligibility window</h2>
          <p>
            Most items purchased on LarkTribe can be returned within 7 days of delivery, provided they're unused,
            unworn, and in their original packaging with tags attached. Perishables, personal care, and intimate
            apparel are final sale unless the item arrived damaged or defective.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-bold text-[var(--color-ink)] mb-2">How to start a return</h2>
          <ol className="list-decimal list-inside space-y-1.5">
            <li>Go to <Link href="/account/orders" className="font-semibold underline">My account → Orders</Link> and find the order.</li>
            <li>Open a support ticket referencing the order number and reason for return.</li>
            <li>Our team or the vendor will confirm pickup or drop-off instructions.</li>
            <li>Once the item is received and inspected, your refund is processed to your original payment method.</li>
          </ol>
        </section>

        <section>
          <h2 className="font-display text-lg font-bold text-[var(--color-ink)] mb-2">Refund timing</h2>
          <p>
            M-Pesa refunds typically land within 1–2 business days of approval. Card refunds can take 5–10 business
            days depending on your bank. Cash on delivery orders are refunded via M-Pesa to the number on file.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-bold text-[var(--color-ink)] mb-2">Damaged or wrong items</h2>
          <p>
            If an item arrives damaged, defective, or different from what you ordered, contact us within 48 hours of
            delivery with photos — we'll prioritize a replacement or full refund, including return shipping.
          </p>
        </section>

        <div className="surface-card p-5 flex flex-wrap items-center justify-between gap-3">
          <p className="font-semibold">Ready to start a return?</p>
          <Link
            href="/account/support?subject=Return%20request"
            className="btn btn-ink"
          >
            Open a return request
          </Link>
        </div>
      </div>
    </main>
  );
}
