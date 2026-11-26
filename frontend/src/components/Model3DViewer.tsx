"use client";

import { createElement, useEffect, useRef, useState } from "react";

const SRC = "https://ajax.googleapis.com/ajax/libs/model-viewer/4.0.0/model-viewer.min.js";
let scriptPromise: Promise<void> | null = null;

function loadModelViewer(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.customElements?.get("model-viewer")) return Promise.resolve();
  scriptPromise ??= new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.type = "module";
    s.src = SRC;
    s.onload = () => resolve();
    s.onerror = () => { scriptPromise = null; reject(new Error("3D viewer failed to load")); };
    document.head.appendChild(s);
  });
  return scriptPromise;
}

/**
 * Interactive 3D model (.glb) with an AR button on supported phones.
 * Falls back to the static poster on slow connections / unsupported devices.
 */
export default function Model3DViewer({
  src,
  iosSrc,
  poster,
  alt,
  compact = false,
  active = true,
  interactive = true,
  autoRotate,
}: {
  src: string;
  iosSrc?: string | null;
  poster?: string | null;
  alt: string;
  compact?: boolean;
  active?: boolean;
  interactive?: boolean;
  autoRotate?: boolean;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<HTMLElement | null>(null);
  const [ready, setReady] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [failed, setFailed] = useState(false);
  const [inView, setInView] = useState(!compact);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  useEffect(() => {
    if (!compact) {
      setInView(true);
      return;
    }
    if (!active) {
      setInView(false);
      return;
    }
    const el = hostRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) setInView(true);
        else setInView(false);
      },
      { rootMargin: "250px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [compact, active]);

  useEffect(() => {
    if (!active || !inView) return;
    // Respect Data Saver / very slow connections: show the poster only.
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
    if (conn?.saveData || conn?.effectiveType === "2g" || conn?.effectiveType === "slow-2g") { setFailed(true); return; }
    let cancelled = false;
    loadModelViewer()
      .then(() => { if (!cancelled) setReady(true); })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, [active, inView]);

  useEffect(() => {
    const el = viewerRef.current;
    if (!el) return;
    const onError = () => setFailed(true);
    el.addEventListener("error", onError);
    return () => el.removeEventListener("error", onError);
  }, [ready, active, inView, src]);

  const containerClass = compact ? "h-full w-full bg-transparent" : "aspect-[3/4] bg-stone-50";
  const shouldMountViewer = active && inView && ready && !failed;
  const shouldRotate = autoRotate !== undefined ? autoRotate : compact ? hovered : true;

  if (!shouldMountViewer) {
    return (
      <div ref={hostRef} className={`relative ${containerClass} flex items-center justify-center overflow-hidden`}>
        {poster ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={poster} alt={alt} draggable={false} className="absolute inset-0 w-full h-full object-contain" />
        ) : null}
        {(!compact || failed) && (
          <span className="relative text-[11px] uppercase tracking-widest text-stone-500 bg-white/80 px-3 py-1.5">
            {failed ? "3D view unavailable on this connection" : "Loading 3D…"}
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      ref={hostRef}
      data-model-viewer={interactive ? "interactive" : "passive"}
      className={`relative ${containerClass} ${interactive ? "" : "pointer-events-none"}`}
      onPointerEnter={() => compact && setHovered(true)}
      onPointerLeave={() => compact && setHovered(false)}
    >
      {createElement("model-viewer", {
        ref: viewerRef,
        src,
        "ios-src": iosSrc || undefined,
        poster: poster || undefined,
        alt,
        "camera-controls": interactive ? "" : undefined,
        "auto-rotate": shouldRotate ? "" : undefined,
        "auto-rotate-delay": "0",
        "rotation-per-second": "24deg",
        "shadow-intensity": "1",
        ar: compact ? undefined : "",
        "ar-modes": compact ? undefined : "webxr scene-viewer quick-look",
        "touch-action": "pan-y",
        loading: compact ? "eager" : "lazy",
        reveal: "auto",
        style: { width: "100%", height: "100%", background: "transparent" },
      } as Record<string, unknown>, !compact ? createElement("button", {
        slot: "ar-button", type: "button",
        className: "absolute bottom-12 left-1/2 -translate-x-1/2 rounded-full bg-black px-5 py-3 text-[11px] font-semibold uppercase tracking-widest text-white shadow-lg hover:bg-stone-800 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2",
      }, "View in your space") : null)}
      {!compact && <span className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/70 text-white text-[10px] px-3 py-1.5 whitespace-nowrap pointer-events-none">
        Drag to rotate · Pinch to zoom · AR on supported phones
      </span>}
    </div>
  );
}
