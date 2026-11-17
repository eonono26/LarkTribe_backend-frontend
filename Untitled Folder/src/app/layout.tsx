import type { Metadata } from "next";
import "./globals.css";
import RootShell from "@/components/RootShell";

export const metadata: Metadata = {
  title: "LarkTribe — Baby, Kids, Women & Men | Kenya",
  description: "Kenya's family fashion marketplace. Minimal, editorial, effortless.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased bg-white text-black">
        <RootShell>{children}</RootShell>
      </body>
    </html>
  );
}
