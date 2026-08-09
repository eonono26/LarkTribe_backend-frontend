import Link from "next/link";
import { Package, RotateCcw, Truck, MessageCircle, HelpCircle, ShieldCheck } from "lucide-react";

const TOPICS = [
  { href: "/account/orders", icon: Package, title: "Track my order", desc: "See live status on any order you've placed." },
  { href: "/returns", icon: RotateCcw, title: "Returns & refunds", desc: "Our policy and how to start a return." },
  { href: "/delivery", icon: Truck, title: "Delivery info", desc: "Delivery times, areas, and fees." },
  { href: "/faq", icon: HelpCircle, title: "FAQs", desc: "Quick answers to common questions." },
  { href: "/account/support", icon: MessageCircle, title: "Contact support", desc: "Open a ticket and chat with our team." },
  { href: "/account", icon: ShieldCheck, title: "Account & security", desc: "Manage your profile and login details." },
];

export default function HelpCenterPage() {
  return (
    <main className="container-shell py-12">
      <h1 className="font-display text-3xl font-black mb-2">Help center</h1>
      <p className="text-sm text-neutral-500 mb-8 max-w-xl">
        Find answers about orders, deliveries, returns, and your account — or get in touch with our support team directly.
      </p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {TOPICS.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className="border border-[var(--color-line)] rounded-lg p-5 hover:shadow-md hover:-translate-y-0.5 transition-all"
          >
            <t.icon size={22} className="mb-3" />
            <p className="font-display font-bold">{t.title}</p>
            <p className="text-sm text-neutral-500 mt-1">{t.desc}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
