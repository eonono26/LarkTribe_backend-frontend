import { API_URL } from "@/lib/config";

const MAX_BYTES = 40 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "model/gltf-binary",
  "model/gltf+json",
  "application/octet-stream",
  "application/json",
]);

function allowed(url: URL): boolean {
  let apiOrigin = "";
  try { apiOrigin = new URL(API_URL).origin; } catch { /* invalid config */ }
  if (url.origin === apiOrigin) return true;
  if (url.protocol !== "https:") return false;
  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) return false;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.includes(":")) return false;
  return true;
}

/** Same-origin, bounded proxy for GLB/glTF assets used by the WebGL showroom. */
export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get("u");
  if (!raw) return new Response("missing u", { status: 400 });

  let target: URL;
  try { target = new URL(raw); } catch { return new Response("bad url", { status: 400 }); }
  if (!allowed(target)) return new Response("forbidden", { status: 403 });

  try {
    const response = await fetch(target.toString(), { redirect: "error", next: { revalidate: 3600 } });
    const contentType = (response.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
    if (!response.ok || !ALLOWED_TYPES.has(contentType)) {
      return new Response("not a supported 3D asset", { status: 404 });
    }
    const buffer = await response.arrayBuffer();
    if (buffer.byteLength > MAX_BYTES) return new Response("asset too large", { status: 413 });
    return new Response(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("upstream error", { status: 502 });
  }
}
