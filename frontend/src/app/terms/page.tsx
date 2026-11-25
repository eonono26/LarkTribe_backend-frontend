const SECTIONS = [
  {
    title: "1. Using LarkTribe",
    body: "LarkTribe is a marketplace connecting shoppers with independent vendors. By creating an account or placing an order, you agree to use the platform lawfully and provide accurate information at checkout.",
  },
  {
    title: "2. Vendors & listings",
    body: "Vendors are independent sellers responsible for the accuracy of their listings, product quality, and fulfillment. LarkTribe moderates listings and can suspend vendors who violate our policies, but individual sale contracts are between buyer and vendor.",
  },
  {
    title: "3. Orders & payments",
    body: "Prices are shown in Kenyan Shillings and include applicable taxes unless stated otherwise. Payments are processed via M-Pesa, card, or cash on delivery where available. Orders are confirmed once payment is authorized.",
  },
  {
    title: "4. Returns, refunds & cancellations",
    body: "See our Returns & refunds page for the current policy. Some items are final sale as noted on the product page.",
  },
  {
    title: "5. Account responsibilities",
    body: "You're responsible for keeping your login credentials secure and for activity that happens under your account. Notify us immediately if you suspect unauthorized use.",
  },
  {
    title: "6. Prohibited use",
    body: "You may not use LarkTribe to sell counterfeit goods, engage in fraud, scrape the platform, or violate the rights of vendors, shoppers, or other third parties.",
  },
  {
    title: "7. Changes to these terms",
    body: "We may update these terms from time to time. Continued use of LarkTribe after changes take effect means you accept the updated terms.",
  },
];

export default function TermsPage() {
  return (
    <main className="container-shell py-12 max-w-3xl">
      <h1 className="font-display text-3xl font-black mb-2">Terms of service</h1>
      <p className="text-sm text-neutral-500 mb-8">Last updated August 2026</p>

      <div className="space-y-6 text-sm leading-relaxed text-neutral-700">
        {SECTIONS.map((s) => (
          <section key={s.title}>
            <h2 className="font-display text-lg font-bold text-[var(--color-ink)] mb-2">{s.title}</h2>
            <p>{s.body}</p>
          </section>
        ))}
      </div>
    </main>
  );
}
