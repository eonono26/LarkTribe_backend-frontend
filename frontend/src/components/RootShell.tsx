"use client";

import { usePathname } from "next/navigation";
import { CartProvider } from "@/lib/cart-context";
import { LocalizationProvider } from "@/lib/localization-context";
import Header from "@/components/Header";
import CartDrawer from "@/components/CartDrawer";
import Footer from "@/components/Footer";
import ChatbotWidget from "@/components/ChatbotWidget";
import WhatsAppButton from "@/components/WhatsAppButton";

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
        <Header />
        <main className="min-h-[60vh]">{children}</main>
        <Footer />
        <CartDrawer />
        <ChatbotWidget />
        <WhatsAppButton />
      </CartProvider>
    </LocalizationProvider>
  );
}
