import Link from "next/link";
import SocialLinks from "@/components/SocialLinks";

const COLS = [
  {
    title: "Shop",
    links: [
      { href: "/shop", label: "New in" },
      { href: "/shop?stage=baby", label: "Babies" },
      { href: "/shop?stage=kids", label: "Kids" },
      { href: "/shop?department=women", label: "Women" },
      { href: "/shop?department=men", label: "Men" },
      { href: "/showroom", label: "3D store" },
      { href: "/looks", label: "Looks" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "About us" },
      { href: "/contact", label: "Contact" },
      { href: "/vendor/apply", label: "Become a vendor" },
      { href: "/download", label: "Get the app" },
    ],
  },
  {
    title: "Help",
    links: [
      { href: "/help", label: "Help centre" },
      { href: "/delivery", label: "Delivery" },
      { href: "/returns", label: "Returns" },
      { href: "/faq", label: "FAQ" },
      { href: "/account/orders", label: "Track order" },
    ],
  },
  {
    title: "Policies",
    links: [
      { href: "/terms", label: "Terms" },
      { href: "/privacy", label: "Privacy" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="mt-24 border-t border-stone-200 bg-white text-black">
      <div className="px-4 sm:px-6 lg:px-8 pt-12 pb-8">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-x-6 gap-y-10">
          {COLS.map((col) => (
            <div key={col.title}>
              <h4 className="text-[11px] tracking-[0.08em] mb-4">{col.title}</h4>
              <ul className="space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link href={l.href} className="text-[11px] uppercase tracking-[0.04em] text-stone-500 hover:text-black transition-colors">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div className="col-span-2 md:col-span-1">
            <h4 className="text-[11px] tracking-[0.08em] mb-4">Follow us</h4>
            <SocialLinks />
          </div>
        </div>
        <div className="mt-14 pt-6 border-t border-stone-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-[11px] uppercase tracking-[0.04em] text-stone-500">
          <span>© 2026 LarkTribe · Nairobi, Kenya · KES</span>
          <span>concierge@larktribe.co.ke</span>
        </div>
      </div>
    </footer>
  );
}
