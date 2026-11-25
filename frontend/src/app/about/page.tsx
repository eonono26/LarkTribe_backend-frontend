export default function AboutPage() {
  return (
    <main className="container-shell py-12 max-w-3xl">
      <h1 className="text-[13px] tracking-[0.08em] font-display mb-2">About LarkTribe</h1>
      <p className="text-sm text-neutral-500 mb-8">Built in Nairobi, for Kenya.</p>

      <div className="space-y-6 text-sm leading-relaxed text-neutral-700">
        <p>
          LarkTribe is a multi-vendor marketplace bringing together independent sellers across Baby, Kids,
          Women and Men fashion into one place to shop. We built it because Kenyan
          shoppers deserve a discovery experience as good as anywhere else in the world — fast search, smart
          recommendations, and checkout that just works with M-Pesa.
        </p>
        <p>
          Every product on LarkTribe is listed and fulfilled by an independent vendor. We handle the platform,
          payments, and delivery coordination so vendors can focus on what they do best — and shoppers get a wide,
          curated selection with buyer protection built in.
        </p>
        <div className="grid sm:grid-cols-3 gap-4 pt-4">
          <div className="surface-card p-5">
            <p className="text-[13px] tracking-[0.08em] font-display ">100+</p>
            <p className="text-xs text-neutral-500 mt-1">Vendors onboarded</p>
          </div>
          <div className="surface-card p-5">
            <p className="text-[13px] tracking-[0.08em] font-display ">6</p>
            <p className="text-xs text-neutral-500 mt-1">Product departments</p>
          </div>
          <div className="surface-card p-5">
            <p className="text-[13px] tracking-[0.08em] font-display ">Nairobi</p>
            <p className="text-xs text-neutral-500 mt-1">Headquartered</p>
          </div>
        </div>
        <section className="mt-10 border-t border-neutral-200 pt-8">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
            Case study
          </p>
          <h2 className="text-[13px] tracking-[0.08em] font-display text-neutral-900">
            Zara — Agile fashion supply chain
          </h2>
          <p className="mt-3">
            Zara’s fast-fashion model requires rapid response to consumer trends. At LarkTribe,
            we apply the same principle through connected demand signals, vendor operations, and
            real-time commerce insights.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <article className="surface-card p-5">
              <h3 className="font-semibold text-neutral-900">1. AI integration</h3>
              <dl className="mt-3 space-y-3">
                <div>
                  <dt className="font-semibold text-neutral-800">Trend analysis</dt>
                  <dd className="mt-1 text-neutral-600">
                    Generate demand for new products and predict fashion preferences using sales
                    data, searches, social signals, and local shopping behavior.
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-neutral-800">Inventory adjustment</dt>
                  <dd className="mt-1 text-neutral-600">
                    Recommend restocking, vendor replenishment, or markdown strategies in near
                    real time.
                  </dd>
                </div>
              </dl>
            </article>

            <article className="surface-card p-5">
              <h3 className="font-semibold text-neutral-900">2. Cross-functional impact</h3>
              <dl className="mt-3 space-y-3">
                <div>
                  <dt className="font-semibold text-neutral-800">Operations</dt>
                  <dd className="mt-1 text-neutral-600">
                    Streamline sourcing and fulfillment to reduce waste and improve agility.
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-neutral-800">Marketing</dt>
                  <dd className="mt-1 text-neutral-600">
                    Use real-time demand insights to shape promotions and product discovery.
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-neutral-800">Finance</dt>
                  <dd className="mt-1 text-neutral-600">
                    Optimize inventory to control costs and protect margins.
                  </dd>
                </div>
              </dl>
            </article>
          </div>
        </section>
        <p>
          Have a question, partnership idea, or feedback? Visit our{" "}
          <a href="/contact" className="font-semibold underline">Contact page</a> — we'd love to hear from you.
        </p>
      </div>
    </main>
  );
}
