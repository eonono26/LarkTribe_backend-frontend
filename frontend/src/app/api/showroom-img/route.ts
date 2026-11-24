import { API_URL } from "@/lib/config";

/**
 * Same-origin image proxy for the 3D showroom. WebGL can only use textures from
 * images that are same-origin or sent with CORS headers; product photos live on the
 * API / media host, so the showroom loads them through here.
 * Guarded against SSRF: https (or the configured API origin) only, no IP/localhost
 * hosts, image content types only, size capped.
 */
const MAX_BYTES = 8 * 1024 * 1024;

function allowed(u: URL): boolean {
  let apiOrigin = "";
  try { apiOrigin = new URL(API_URL).origin; } catch { /* ignore */ }
  if (u.origin === apiOrigin) return true;
  if (u.protocol !== "https:") return false;
  const h = u.hostname.toLowerCase();
  if (h === "localhost" || h.endsWith(".local") || h.endsWith(".internal")) return false;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(h) || h.includes(":")) return false; // IP literals
  return true;
}

export async function GET(req: Request) {
  const raw = new URL(req.url).searchParams.get("u");
  if (!raw) return new Response("missing u", { status: 400 });
  let target: URL;
  try { target = new URL(raw); } catch { return new Response("bad url", { status: 400 }); }
  if (!allowed(target)) return new Response("forbidden", { status: 403 });

  try {
    const res = await fetch(target.toString(), { redirect: "error", next: { revalidate: 3600 } });
    const type = res.headers.get("content-type") || "";
    if (!res.ok || !type.startsWith("image/")) return new Response("not an image", { status: 404 });
    const buf = await res.arrayBuffer();
    if (buf.byteLength > MAX_BYTES) return new Response("too large", { status: 413 });
    return new Response(buf, { headers: { "Content-Type": type, "Cache-Control": "public, max-age=86400, immutable" } });
  } catch {
    return new Response("upstream error", { status: 502 });
  }
}
