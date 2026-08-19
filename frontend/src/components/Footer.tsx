import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-20 bg-[#f8f8f8] border-t border-gray-200">
      {/* Main Footer Content */}
      <div className="container-shell py-16">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 lg:gap-12 text-sm">
          {/* Shop Column */}
          <div className="col-span-2 md:col-span-1">
            <h4 className="font-display font-bold text-base mb-4 text-gray-800 tracking-wide">
              Shop
            </h4>
            <ul className="space-y-2.5 text-gray-500">
              <li>
                <Link href="/category/women" className="hover:text-[#c96e6e] transition-colors duration-200">
                  Women
                </Link>
              </li>
              <li>
                <Link href="/category/kids" className="hover:text-[#c96e6e] transition-colors duration-200">
                  Kids
                </Link>
              </li>
              <li>
                <Link href="/category/beauty" className="hover:text-[#c96e6e] transition-colors duration-200">
                  Beauty
                </Link>
              </li>
              <li>
                <Link href="/category/maternity" className="hover:text-[#c96e6e] transition-colors duration-200">
                  Maternity
                </Link>
              </li>
              <li>
                <Link href="/brands" className="hover:text-[#c96e6e] transition-colors duration-200">
                  Brands
                </Link>
              </li>
              <li>
                <Link href="/deals" className="hover:text-[#c96e6e] transition-colors duration-200 flex items-center gap-1">
                  Deals
                  <span className="text-[10px] font-bold">🔥</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Help Column */}
          <div>
            <h4 className="font-display font-bold text-base mb-4 text-gray-800 tracking-wide">
              Help
            </h4>
            <ul className="space-y-2.5 text-gray-500">
              <li>
                <Link href="/account/orders" className="hover:text-[#c96e6e] transition-colors duration-200">
                  Track my order
                </Link>
              </li>
              <li>
                <Link href="/returns" className="hover:text-[#c96e6e] transition-colors duration-200">
                  Returns & refunds
                </Link>
              </li>
              <li>
                <Link href="/delivery" className="hover:text-[#c96e6e] transition-colors duration-200">
                  Delivery info
                </Link>
              </li>
              <li>
                <Link href="/faq" className="hover:text-[#c96e6e] transition-colors duration-200">
                  FAQs
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-[#c96e6e] transition-colors duration-200">
                  Contact us
                </Link>
              </li>
            </ul>
          </div>

          {/* Sell Column */}
          <div>
            <h4 className="font-display font-bold text-base mb-4 text-gray-800 tracking-wide">
              Sell with us
            </h4>
            <ul className="space-y-2.5 text-gray-500">
              <li>
                <Link href="/vendor" className="hover:text-[#c96e6e] transition-colors duration-200">
                  Become a vendor
                </Link>
              </li>
              <li>
                <Link href="/vendor/login" className="hover:text-[#c96e6e] transition-colors duration-200">
                  Vendor dashboard
                </Link>
              </li>
            </ul>
          </div>

          {/* Company Column */}
          <div>
            <h4 className="font-display font-bold text-base mb-4 text-gray-800 tracking-wide">
              Company
            </h4>
            <ul className="space-y-2.5 text-gray-500">
              <li>
                <Link href="/about" className="hover:text-[#c96e6e] transition-colors duration-200">
                  About us
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-[#c96e6e] transition-colors duration-200">
                  Contact
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-[#c96e6e] transition-colors duration-200">
                  Terms of service
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-[#c96e6e] transition-colors duration-200">
                  Privacy policy
                </Link>
              </li>
            </ul>
          </div>

          {/* Payments & Social Column */}
          <div>
            <h4 className="font-display font-bold text-base mb-4 text-gray-800 tracking-wide">
              Payments
            </h4>
            <ul className="space-y-2.5 text-gray-500">
              <li className="flex items-center gap-2.5">
                <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" />
                </svg>
                M-Pesa
              </li>
              <li className="flex items-center gap-2.5">
                <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                  <rect x="2" y="4" width="20" height="16" rx="2" stroke="currentColor" strokeWidth="2" fill="none" />
                </svg>
                Card
              </li>
              <li className="flex items-center gap-2.5">
                <svg className="w-5 h-5 text-amber-600" fill="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" />
                </svg>
                Cash on delivery
              </li>
            </ul>

            {/* Trust Badge */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#c96e6e]/10 flex items-center justify-center">
                  <svg className="w-5 h-5 text-[#c96e6e]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-medium">Trusted by</p>
                  <p className="text-sm font-semibold text-gray-700">10,000+ customers</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Newsletter Section */}
        <div className="mt-12 pt-8 border-t border-gray-200">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h4 className="font-display font-bold text-base text-gray-800">
                Stay in the loop
              </h4>
              <p className="text-sm text-gray-500 mt-1">
                Get the latest deals and updates
              </p>
            </div>
            <form className="flex w-full md:w-auto gap-2">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 md:w-64 px-4 py-2.5 rounded-lg bg-white border border-gray-200 text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#c96e6e]/30 focus:border-[#c96e6e] transition-all duration-200"
              />
              <button
                type="submit"
                className="px-6 py-2.5 rounded-lg bg-[#c96e6e] hover:bg-[#a85555] text-white font-semibold text-sm transition-all duration-200 whitespace-nowrap shadow-sm hover:shadow-md"
              >
                Subscribe
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-gray-200 bg-white/50 py-4">
        <div className="container-shell flex flex-col md:flex-row items-center justify-between gap-2 text-xs text-gray-500">
          <span>
            © {new Date().getFullYear()} LarkTribe. Built for Kenya.
          </span>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="hover:text-[#c96e6e] transition-colors duration-200">
              Privacy
            </Link>
            <span className="w-px h-3 bg-gray-300"></span>
            <Link href="/terms" className="hover:text-[#c96e6e] transition-colors duration-200">
              Terms
            </Link>
            <span className="w-px h-3 bg-gray-300"></span>
            <Link href="/cookies" className="hover:text-[#c96e6e] transition-colors duration-200">
              Cookies
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}