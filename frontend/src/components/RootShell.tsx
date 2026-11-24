"use client";

import { usePathname } from "next/navigation";
import { CartProvider } from "@/lib/cart-context";
import { WishlistProvider } from "@/lib/wishlist-context";
import { LocalizationProvider } from "@/lib/localization-context";
import Header from "@/components/Header";
import CartDrawer from "@/components/CartDrawer";
import Footer from "@/components/Footer";
import ChatbotWidget from "@/components/ChatbotWidget";
import WhatsAppButton from "@/components/WhatsAppButton";
import BackToTop from "@/components/BackToTop";
import MarketingScripts from "@/components/MarketingScripts";
import ConsentBanner from "@/components/ConsentBanner";

/**
 * Wraps every page in the storefront chrome (header, footer, cart, chatbot) —
 * except /admin, which has its own layout and must not load any of it.
 */
export default function RootShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname?.startsWith("/admin")) return <>{children}</>;

  return (
    <LocalizationProvider>
      <CartProvider>
        <WishlistProvider>
        <Header />
        <div className="min-h-[60vh]">{children}</div>
        <Footer />
        <CartDrawer />
        <ChatbotWidget />
        <WhatsAppButton />
        <BackToTop />
        <MarketingScripts />
        <ConsentBanner />
        </WishlistProvider>
      </CartProvider>
    </LocalizationProvider>
  );
}
