import Link from "next/link";

const COLS = [
  {
    title: "Shop",
    links: [
      { href: "/shop", label: "New In" },
      { href: "/shop?stage=baby", label: "Baby" },
      { href: "/shop?stage=kids", label: "Kids" },
      { href: "/shop?department=women", label: "Women" },
      { href: "/shop?department=men", label: "Men" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "About" },
      { href: "/contact", label: "Contact" },
      { href: "/vendor/apply", label: "Become a Vendor" },
    ],
  },
  {
    title: "Support",
    links: [
      { href: "/delivery", label: "Delivery" },
      { href: "/returns", label: "Returns" },
      { href: "/faq", label: "FAQ" },
      { href: "/terms", label: "Terms" },
      { href: "/privacy", label: "Privacy" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="bg-black text-white pt-16 pb-10">
      <div className="container-shell">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 pb-12 border-b border-white/10">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="font-editorial text-xl tracking-[0.15em] uppercase">Lark Tribe</Link>
            <p className="text-xs text-white/50 mt-3 leading-relaxed">Family fashion, designed in Kenya.</p>
          </div>
          {COLS.map(col => (
            <div key={col.title}>
              <h4 className="text-[11px] uppercase tracking-widest font-medium mb-4">{col.title}</h4>
              <ul className="space-y-2 text-sm text-white/50">
                {col.links.map(l => (
                  <li key={l.label}><Link href={l.href} className="hover:text-white transition">{l.label}</Link></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-white/40">
          <span>© 2026 LarkTribe. All rights reserved.</span>
          <span>concierge@larktribe.co.ke</span>
        </div>
      </div>
    </footer>
  );
}