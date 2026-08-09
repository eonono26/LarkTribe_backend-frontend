export default function AboutPage() {
  return (
    <main className="container-shell py-12 max-w-3xl">
      <h1 className="font-display text-3xl font-black mb-2">About LarkTribe</h1>
      <p className="text-sm text-neutral-500 mb-8">Built in Nairobi, for Kenya.</p>

      <div className="space-y-6 text-sm leading-relaxed text-neutral-700">
        <p>
          LarkTribe is a multi-vendor marketplace bringing together independent sellers across Women's fashion,
          Kids & Baby, Beauty, Maternity, and Home & Lifestyle into one place to shop. We built it because Kenyan
          shoppers deserve a discovery experience as good as anywhere else in the world — fast search, smart
          recommendations, and checkout that just works with M-Pesa.
        </p>
        <p>
          Every product on LarkTribe is listed and fulfilled by an independent vendor. We handle the platform,
          payments, and delivery coordination so vendors can focus on what they do best — and shoppers get a wide,
          curated selection with buyer protection built in.
        </p>
        <div className="grid sm:grid-cols-3 gap-4 pt-4">
          <div className="border border-[var(--color-line)] rounded-lg p-5">
            <p className="font-display text-2xl font-black">100+</p>
            <p className="text-xs text-neutral-500 mt-1">Vendors onboarded</p>
          </div>
          <div className="border border-[var(--color-line)] rounded-lg p-5">
            <p className="font-display text-2xl font-black">6</p>
            <p className="text-xs text-neutral-500 mt-1">Product departments</p>
          </div>
          <div className="border border-[var(--color-line)] rounded-lg p-5">
            <p className="font-display text-2xl font-black">Nairobi</p>
            <p className="text-xs text-neutral-500 mt-1">Headquartered</p>
          </div>
        </div>
        <p>
          Have a question, partnership idea, or feedback? Visit our{" "}
          <a href="/contact" className="font-semibold underline">Contact page</a> — we'd love to hear from you.
        </p>
      </div>
    </main>
  );
}
