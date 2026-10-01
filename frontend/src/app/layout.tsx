import type { Metadata } from "next";
import "./globals.css";
import { CartProvider } from "@/lib/cart-context";
import { LocalizationProvider } from "@/lib/localization-context";
import Header from "@/components/Header";
import CartDrawer from "@/components/CartDrawer";
import Footer from "@/components/Footer";
import ChatbotWidget from "@/components/ChatbotWidget";
import WhatsAppButton from "@/components/WhatsAppButton";

export const metadata: Metadata = {
  title: "LarkTribe — Baby, Kids, Women & Men | Kenya",
  description: "Kenya's family fashion marketplace. Minimal, editorial, effortless.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased bg-white text-black">
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
      </body>
    </html>
  );
}