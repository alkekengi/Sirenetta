function parseLength(value: string | null): number | null {
  if (!value || value.endsWith("%")) return null;
  const n = parseFloat(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Resolve raster/layout size from width/height attrs, falling back to viewBox. */
export function resolveSvgSize(svg: string): { width: number; height: number } {
  const FALLBACK = { width: 800, height: 600 };
  try {
    const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
    const root = doc.documentElement;
    if (root.nodeName === "parsererror") return FALLBACK;
    const w = parseLength(root.getAttribute("width"));
    const h = parseLength(root.getAttribute("height"));
    if (w && h) return { width: w, height: h };
    const parts = root.getAttribute("viewBox")?.split(/[\s,]+/).map(Number);
    const vb =
      parts?.length === 4 &&
      Number.isFinite(parts[2]) &&
      Number.isFinite(parts[3]) &&
      parts[2] > 0 &&
      parts[3] > 0
        ? { width: parts[2], height: parts[3] }
        : null;
    if (w && vb) return { width: w, height: (w * vb.height) / vb.width };
    if (h && vb) return { width: (h * vb.width) / vb.height, height: h };
    if (vb) return vb;
    if (w) return { width: w, height: (w * FALLBACK.height) / FALLBACK.width };
    if (h) return { width: (h * FALLBACK.width) / FALLBACK.height, height: h };
    return FALLBACK;
  } catch {
    return FALLBACK;
  }
}

/** Ensure usable pixel dims: mermaid may emit width="100%", which has no
    intrinsic size (Firefox refuses to rasterize, Chrome falls back to
    300x150). Replace non-numeric dims with resolved ones. */
export function withExplicitSize(svg: string, width: number, height: number): string {
  const w = Math.round(width);
  const h = Math.round(height);
  const match = svg.match(/<svg[^>]*>/);
  if (!match) return svg;
  const tag = match[0];
  const attr = (name: string) => tag.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1] ?? null;
  if (parseLength(attr("width")) && parseLength(attr("height"))) return svg;
  const cleaned = tag.replace(/\s(width|height)="[^"]*"/g, "");
  return svg.replace(tag, cleaned.replace(/<svg/, `<svg width="${w}" height="${h}"`));
}
