import type { Metadata } from "next";
import "./globals.css";
import { CartProvider } from "@/lib/cart-context";
import { LocalizationProvider } from "@/lib/localization-context";
import Header from "@/components/Header";
import CartDrawer from "@/components/CartDrawer";
import Footer from "@/components/Footer";
import ChatbotWidget from "@/components/ChatbotWidget";

export const metadata: Metadata = {
  title: "LarkTribe — Women, Kids, Beauty & Home marketplace",
  description: "A multi-vendor marketplace for Women, Kids, Baby, Beauty, Maternity and Home & Lifestyle products in Kenya.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <LocalizationProvider>
          <CartProvider>
            <Header />
            {children}
            <Footer />
            <CartDrawer />
            <ChatbotWidget />
          </CartProvider>
        </LocalizationProvider>
      </body>
    </html>
  );
}
