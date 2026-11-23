"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { features } from "@/lib/features-api";
import { hasMarketingConsent, MARKETING_CONSENT_KEY } from "@/lib/tracking";

type W = Window & { fbq?: (...a: unknown[]) => void; ttq?: { page: () => void } };

function inject(id: string, code: string) {
  if (document.getElementById(id)) return;
  const s = document.createElement("script");
  s.id = id;
  s.async = true;
  s.text = code;
  document.head.appendChild(s);
}

const metaCode = (pixel: string) =>
  `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${pixel}');fbq('track','PageView');`;

const tiktokCode = (pixel: string) =>
  `!function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var r="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=r,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var o=document.createElement("script");o.type="text/javascript",o.async=!0,o.src=r+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};ttq.load('${pixel}');ttq.page();}(window,document,'ttq');`;

/**
 * Loads the Meta + TikTok pixels (IDs come from the backend's META_PIXEL_ID /
 * TIKTOK_PIXEL_ID) - but only after the shopper accepts marketing cookies.
 */
export default function MarketingScripts() {
  const pathname = usePathname();
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const boot = async () => {
      if (!hasMarketingConsent()) return;
      try {
        const cfg = await features.publicConfig();
        if (cancelled) return;
        if (cfg.meta_pixel_id) inject("meta-pixel", metaCode(cfg.meta_pixel_id));
        if (cfg.tiktok_pixel_id) inject("tiktok-pixel", tiktokCode(cfg.tiktok_pixel_id));
        setLoaded(true);
      } catch { /* no config -> no pixels */ }
    };
    boot();
    const onConsent = () => boot();
    window.addEventListener("lt-consent", onConsent);
    return () => { cancelled = true; window.removeEventListener("lt-consent", onConsent); };
  }, []);

  // SPA navigation -> page views (the first one is fired by each pixel's own init)
  useEffect(() => {
    if (!loaded) return;
    const w = window as W;
    try { w.fbq?.("track", "PageView"); w.ttq?.page(); } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return null;
}

export { MARKETING_CONSENT_KEY };
