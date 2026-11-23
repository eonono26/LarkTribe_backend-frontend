"use client";

import { useEffect, useState } from "react";
import { features, type PublicConfig } from "@/lib/features-api";

const ICONS: Record<string, React.ReactNode> = {
  instagram: <path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5Zm0 2a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H7Zm5 3.5A4.5 4.5 0 1 1 7.5 12 4.5 4.5 0 0 1 12 7.5Zm0 2A2.5 2.5 0 1 0 14.5 12 2.5 2.5 0 0 0 12 9.5Zm5.2-3.2a1.1 1.1 0 1 1-1.1 1.1 1.1 1.1 0 0 1 1.1-1.1Z" />,
  facebook: <path d="M13.5 22v-8.2h2.8l.5-3.3h-3.3V8.4c0-.9.4-1.7 1.8-1.7h1.6V3.8S15.6 3.5 14.4 3.5c-2.6 0-4.2 1.6-4.2 4.4v2.6H7.5v3.3h2.7V22h3.3Z" />,
  tiktok: <path d="M16.6 2h-3.2v13.1a2.9 2.9 0 1 1-2.9-2.9c.3 0 .6 0 .9.1V9a6.1 6.1 0 1 0 5.2 6V8.6a7.4 7.4 0 0 0 4.3 1.4V6.8A4.3 4.3 0 0 1 16.6 2Z" />,
};

export default function SocialLinks({ className = "" }: { className?: string }) {
  const [cfg, setCfg] = useState<PublicConfig | null>(null);
  useEffect(() => { features.publicConfig().then(setCfg).catch(() => {}); }, []);
  if (!cfg) return null;
  const items = (["instagram", "facebook", "tiktok"] as const).filter((k) => cfg.social[k]);
  if (!items.length) return null;
  return (
    <ul className={`flex items-center gap-4 ${className}`}>
      {items.map((k) => (
        <li key={k}>
          <a href={cfg.social[k]} target="_blank" rel="noopener noreferrer" aria-label={`LarkTribe on ${k}`} className="text-white/70 hover:text-white transition">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">{ICONS[k]}</svg>
          </a>
        </li>
      ))}
    </ul>
  );
}
