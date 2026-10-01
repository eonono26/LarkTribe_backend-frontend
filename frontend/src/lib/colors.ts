/**
 * Turns the color NAME a vendor typed on a product variant ("White",
 * "Off White", "Navy Blue", "Black / Grey") into something a swatch can paint.
 *
 * Raw names only work as CSS when they happen to be a CSS keyword, so "Off
 * White", "Charcoal", "Olive Green" etc. used to render as an empty circle.
 */

const COLOR_MAP: Record<string, string> = {
  // neutrals
  white: "#ffffff",
  "off white": "#f4f0e6",
  "off-white": "#f4f0e6",
  offwhite: "#f4f0e6",
  ivory: "#fffff0",
  cream: "#f3ead3",
  ecru: "#e9dfc7",
  natural: "#e6dcc6",
  beige: "#d8c8a8",
  sand: "#d6c09a",
  stone: "#bdb5a6",
  oatmeal: "#d9cdb5",
  tan: "#c8a878",
  camel: "#c19a6b",
  khaki: "#b5a67a",
  taupe: "#8b7d70",
  black: "#111111",
  charcoal: "#383b40",
  graphite: "#3f4348",
  grey: "#8c8f94",
  gray: "#8c8f94",
  "light grey": "#c9cbce",
  "light gray": "#c9cbce",
  "dark grey": "#52555a",
  "dark gray": "#52555a",
  heather: "#aeb1b6",
  silver: "#c0c0c0",
  // blues
  navy: "#1d2a4a",
  "navy blue": "#1d2a4a",
  blue: "#2f5fb3",
  "royal blue": "#2b4fbf",
  "light blue": "#a9c8ec",
  "sky blue": "#87ceeb",
  "baby blue": "#b7d4ee",
  denim: "#3d5a80",
  teal: "#1f7a7a",
  turquoise: "#2ec4b6",
  // reds / pinks
  red: "#c62828",
  burgundy: "#6d1a2b",
  maroon: "#6b1f2a",
  wine: "#5e1a2c",
  pink: "#f2a7c0",
  "hot pink": "#e8489a",
  "baby pink": "#f6cfd9",
  "dusty pink": "#d9a5ac",
  blush: "#eec3c3",
  rose: "#d67a8f",
  coral: "#ee7b6b",
  // warm
  orange: "#f08a24",
  rust: "#b7501f",
  terracotta: "#c4623f",
  brown: "#6b4530",
  chocolate: "#4a2c1d",
  coffee: "#5b3d2b",
  mocha: "#7a5a46",
  mustard: "#d9a520",
  yellow: "#f4d03f",
  gold: "#c9a227",
  // greens
  green: "#3b8a4f",
  olive: "#6b6b2f",
  "olive green": "#6b6b2f",
  "forest green": "#1f4d34",
  "dark green": "#1f4d34",
  "light green": "#a8d5a2",
  sage: "#9caf88",
  mint: "#b5e2c8",
  lime: "#a3d13c",
  // purples
  purple: "#6f42a6",
  lavender: "#c3b1e1",
  lilac: "#c8a2c8",
  violet: "#7a4cc2",
  plum: "#6a2c5c",
};

function resolveOne(name: string): string {
  const raw = name.trim();
  if (!raw) return "#e7e5e4";
  if (raw.startsWith("#") || raw.startsWith("rgb") || raw.startsWith("hsl")) return raw;

  const key = raw.toLowerCase().replace(/\s+/g, " ");
  if (COLOR_MAP[key]) return COLOR_MAP[key];

  // "Bright Navy Blue" -> try the trailing words ("navy blue", then "blue").
  const words = key.split(" ");
  for (let i = 1; i < words.length; i++) {
    const tail = words.slice(i).join(" ");
    if (COLOR_MAP[tail]) return COLOR_MAP[tail];
  }

  // Otherwise trust the browser — works for real CSS keywords (e.g. "salmon").
  return raw;
}

/**
 * CSS `background` value for a swatch. Two-tone names such as "Black / White"
 * become a diagonal split.
 */
export function swatchBackground(name: string): string {
  const parts = name
    .split(/\s*[/&+]\s*/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (parts.length >= 2) {
    const [a, b] = [resolveOne(parts[0]), resolveOne(parts[1])];
    return `linear-gradient(135deg, ${a} 50%, ${b} 50%)`;
  }

  return resolveOne(name);
}

/** True when the swatch is so pale it needs a darker outline to be visible. */
export function isPaleColor(name: string): boolean {
  const c = resolveOne(name.split(/\s*[/&+]\s*/)[0] || name);
  const m = /^#([0-9a-f]{6})$/i.exec(c);
  if (!m) return false;
  const n = parseInt(m[1], 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return (r * 299 + g * 587 + b * 114) / 1000 > 225;
}
