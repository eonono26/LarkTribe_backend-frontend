const SECTIONS = [
  {
    title: "1. Information we collect",
    body: "We collect account details (name, email, phone), order and delivery information, and shopping behavior such as views, searches, clicks, wishlist activity, cart actions, and device/browser info — used to power search, recommendations, and analytics.",
  },
  {
    title: "2. How we use your data",
    body: "Your data helps us personalize product recommendations, improve search, prevent fraud, process orders and payments, send order and promotional notifications (which you can manage in Notification preferences), and generate aggregate business insights.",
  },
  {
    title: "3. Sharing with vendors & partners",
    body: "Vendors receive the order and shipping details needed to fulfill your purchase. Payment processors (M-Pesa, card gateways) receive what's required to complete transactions. We don't sell your personal data to third parties.",
  },
  {
    title: "4. Location data",
    body: "Location access is requested only when you choose to add a delivery pin during checkout. If you grant permission, the coordinates are sent with that order for delivery; we do not track your location in the background. You can always enter your address manually.",
  },
  {
    title: "5. Virtual styling photos",
    body: "Photos selected for virtual styling are previewed on your device only and are not uploaded or processed. If a virtual try-on provider is added later, we will disclose its privacy and retention terms and request your consent before sending a photo.",
  },
  {
    title: "6. Your choices",
    body: "You can review and update your profile from My account, manage notification channels from Notifications settings, and request account data deletion by contacting support.",
  },
  {
    title: "7. Data security",
    body: "We use industry-standard encryption in transit and restrict access to personal data on a need-to-know basis. No online platform can guarantee absolute security, so please use a strong, unique password.",
  },
  {
    title: "8. Changes to this policy",
    body: "We'll update this page when our practices change materially. Significant changes will also be communicated via in-app notification.",
  },
];

export default function PrivacyPage() {
  return (
    <main className="container-shell py-12 max-w-3xl">
      <h1 className="font-display text-3xl font-black mb-2">Privacy policy</h1>
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
