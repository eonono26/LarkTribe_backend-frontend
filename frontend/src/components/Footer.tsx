import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-20 bg-[var(--color-ink)] text-white">
      <div className="container-shell py-12 grid grid-cols-2 md:grid-cols-4 gap-8 text-sm">
        <div>
          <h4 className="font-display font-bold mb-3">Shop</h4>
          <ul className="space-y-2 text-neutral-300">
            <li><Link href="/category/women">Women</Link></li>
            <li><Link href="/category/kids">Kids</Link></li>
            <li><Link href="/category/beauty">Beauty</Link></li>
            <li><Link href="/category/maternity">Maternity</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-display font-bold mb-3">Help</h4>
          <ul className="space-y-2 text-neutral-300">
            <li>Track my order</li>
            <li>Returns & refunds</li>
            <li>Delivery info</li>
            <li>Contact us</li>
          </ul>
        </div>
        <div>
          <h4 className="font-display font-bold mb-3">Sell with us</h4>
          <ul className="space-y-2 text-neutral-300">
            <li><Link href="/vendor">Become a vendor</Link></li>
            <li>Vendor dashboard</li>
          </ul>
        </div>
        <div>
          <h4 className="font-display font-bold mb-3">Payments</h4>
          <ul className="space-y-2 text-neutral-300">
            <li>M-Pesa</li>
            <li>Card</li>
            <li>Cash on delivery</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 py-4 text-center text-xs text-neutral-400">
        © {new Date().getFullYear()} duka. Built for Kenya.
      </div>
    </footer>
  );
}
