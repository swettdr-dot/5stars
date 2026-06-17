/** Familia tipográfica → slug de fontsource (CDN jsDelivr). */
export const FONT_SOURCES: Record<string, string> = {
  Inter: "inter",
  "Playfair Display": "playfair-display",
  Montserrat: "montserrat",
  Lora: "lora",
};

export function fontSourceUrl(family: string, weight: 400 | 700): string {
  const slug = FONT_SOURCES[family] ?? "inter";
  return `https://cdn.jsdelivr.net/fontsource/fonts/${slug}@latest/latin-${weight}-normal.ttf`;
}

const cache = new Map<string, ArrayBuffer>();

/** Descarga (y cachea en memoria) el .ttf de una familia/peso. */
export async function loadFont(family: string, weight: 400 | 700): Promise<ArrayBuffer> {
  const url = fontSourceUrl(family, weight);
  const cached = cache.get(url);
  if (cached) return cached;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`FONT_FETCH_FAILED:${family}:${weight}`);
  const buf = await res.arrayBuffer();
  cache.set(url, buf);
  return buf;
}
