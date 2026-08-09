import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-20 bg-[var(--color-ink)] text-white">
      <div className="container-shell py-12 grid grid-cols-2 md:grid-cols-5 gap-8 text-sm">
        <div>
          <h4 className="font-display font-bold mb-3">Shop</h4>
          <ul className="space-y-2 text-neutral-300">
            <li><Link href="/category/women" className="hover:text-white">Women</Link></li>
            <li><Link href="/category/kids" className="hover:text-white">Kids</Link></li>
            <li><Link href="/category/beauty" className="hover:text-white">Beauty</Link></li>
            <li><Link href="/category/maternity" className="hover:text-white">Maternity</Link></li>
            <li><Link href="/brands" className="hover:text-white">Brands</Link></li>
            <li><Link href="/deals" className="hover:text-white">Deals</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-display font-bold mb-3">Help</h4>
          <ul className="space-y-2 text-neutral-300">
            <li><Link href="/account/orders" className="hover:text-white">Track my order</Link></li>
            <li><Link href="/returns" className="hover:text-white">Returns & refunds</Link></li>
            <li><Link href="/delivery" className="hover:text-white">Delivery info</Link></li>
            <li><Link href="/faq" className="hover:text-white">FAQs</Link></li>
            <li><Link href="/contact" className="hover:text-white">Contact us</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-display font-bold mb-3">Sell with us</h4>
          <ul className="space-y-2 text-neutral-300">
            <li><Link href="/vendor" className="hover:text-white">Become a vendor</Link></li>
            <li><Link href="/vendor/login" className="hover:text-white">Vendor dashboard</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-display font-bold mb-3">Company</h4>
          <ul className="space-y-2 text-neutral-300">
            <li><Link href="/about" className="hover:text-white">About us</Link></li>
            <li><Link href="/contact" className="hover:text-white">Contact</Link></li>
            <li><Link href="/terms" className="hover:text-white">Terms of service</Link></li>
            <li><Link href="/privacy" className="hover:text-white">Privacy policy</Link></li>
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
        © {new Date().getFullYear()} LarkTribe. Built for Kenya.
      </div>
    </footer>
  );
}
