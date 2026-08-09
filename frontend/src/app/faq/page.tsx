"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

const FAQS = [
  {
    q: "How do I track my order?",
    a: "Go to My account → Orders, or use the order number and email from your confirmation on the Order tracking page. You'll see live status updates as your vendor prepares, ships, and delivers your items.",
  },
  {
    q: "What payment methods do you accept?",
    a: "We accept M-Pesa, major credit and debit cards, and cash on delivery in eligible areas. You can also apply a coupon code at checkout for extra savings.",
  },
  {
    q: "How do returns and refunds work?",
    a: "Most items can be returned within 7 days of delivery if unused and in original packaging. Open a return request from My account → Orders, or visit our Returns & refunds page for full details.",
  },
  {
    q: "How long does delivery take?",
    a: "Delivery times vary by vendor and location, but most orders within Nairobi arrive in 1–3 business days. Upcountry deliveries typically take 3–5 business days.",
  },
  {
    q: "Can I become a vendor on LarkTribe?",
    a: "Yes! Head to the 'Sell on LarkTribe' page to apply. Once approved, you'll get access to a full vendor dashboard with inventory, order, and AI sales insight tools.",
  },
  {
    q: "Is my payment information safe?",
    a: "Yes. We never store your full card details on our servers — payments are processed through secure, PCI-compliant providers and M-Pesa's Daraja API.",
  },
  {
    q: "How do I contact customer support?",
    a: "Log in and go to My account → Help & Support to open a ticket, or use the Contact us page. Our team typically responds within one business day.",
  },
];

export default function FAQPage() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <main className="container-shell py-12 max-w-3xl">
      <h1 className="font-display text-3xl font-black mb-2">Frequently asked questions</h1>
      <p className="text-sm text-neutral-500 mb-8">Answers to the things shoppers ask us most.</p>

      <div className="divide-y divide-[var(--color-line)] border-t border-b border-[var(--color-line)]">
        {FAQS.map((item, i) => (
          <div key={i}>
            <button
              onClick={() => setOpen(open === i ? null : i)}
              className="w-full flex items-center justify-between text-left py-4 font-semibold"
            >
              {item.q}
              <ChevronDown size={18} className={`transition-transform shrink-0 ml-4 ${open === i ? "rotate-180" : ""}`} />
            </button>
            {open === i && <p className="text-sm text-neutral-600 pb-4 pr-8">{item.a}</p>}
          </div>
        ))}
      </div>

      <p className="text-sm text-neutral-500 mt-8">
        Still stuck? <a href="/contact" className="font-semibold underline">Contact us</a> or, if you're logged in,{" "}
        <a href="/account/support" className="font-semibold underline">open a support ticket</a>.
      </p>
    </main>
  );
}
