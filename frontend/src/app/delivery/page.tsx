export default function DeliveryPage() {
  return (
    <main className="container-shell py-12 lg:py-16">
      <div className="max-w-4xl mx-auto">
        <p className="text-[11px] uppercase tracking-[0.2em] text-neutral-500 mb-3">LarkTribe delivery</p>
        <h1 className="font-display text-3xl sm:text-4xl font-black mb-3">From our store to your door.</h1>
        <p className="text-sm sm:text-base text-neutral-600 max-w-2xl mb-8">
          Follow your order from dispatch to delivery. Once a driver is assigned, the tracking page shows the courier,
          current location when available, and each delivery status update.
        </p>

        <section className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
          <div className="rounded-2xl border border-[var(--color-line)] p-6">
            <p className="text-[11px] uppercase tracking-widest text-neutral-500 mb-2">Delivery fee</p>
            <p className="font-display text-2xl font-bold mb-2">KSh 250</p>
            <p className="text-sm text-neutral-600">Orders of KSh 5,000 or less. The exact fee is shown in checkout and on your order receipt.</p>
          </div>
          <div className="rounded-2xl border border-[var(--color-line)] p-6">
            <p className="text-[11px] uppercase tracking-widest text-neutral-500 mb-2">Qualifying orders</p>
            <p className="font-display text-2xl font-bold mb-2">Free delivery</p>
            <p className="text-sm text-neutral-600">Orders above KSh 5,000 currently qualify for complimentary delivery.</p>
          </div>
        </section>

        <div className="space-y-6 text-sm leading-relaxed text-neutral-700">
          <section>
            <h2 className="font-display text-lg font-bold text-[var(--color-ink)] mb-2">Track your order live</h2>
            <p>
              Open your order confirmation page or visit{" "}
              <a href="/account/orders" className="font-semibold underline">My account → Orders</a>.
              Tracking refreshes automatically and shows driver details and their latest shared position when a driver has been assigned.
            </p>
          </section>
          <section>
            <h2 className="font-display text-lg font-bold text-[var(--color-ink)] mb-2">Dispatch and delivery updates</h2>
            <p>
              Orders are prepared for dispatch after they are approved for fulfilment. Our dispatch team can assign an active driver,
              while the driver updates pickup, in-transit, and delivered statuses from their driver dashboard.
            </p>
          </section>
          <section>
            <h2 className="font-display text-lg font-bold text-[var(--color-ink)] mb-2">Cash on delivery</h2>
            <p>
              Cash on delivery is available as a checkout option. Please have the order amount ready when the courier arrives.
            </p>
          </section>
          <section>
            <h2 className="font-display text-lg font-bold text-[var(--color-ink)] mb-2">Need help?</h2>
            <p>
              Use the shopping assistant at the bottom of the page or open a support request from your account if your delivery needs attention.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
