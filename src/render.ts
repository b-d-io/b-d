/** Draw lines as the lens would show them: an SVG at the device's own pixel size. */
import type { Device } from "./devices.js";

const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export interface RenderOptions {
  /** Show the lens frame and a faint line grid, for checking layout. */
  guides?: boolean;
}

export function renderSVG(lines: string[], d: Device, o: RenderOptions = {}): string {
  const { width: w, height: h, inset, lineHeight } = d;
  // Each line is stretched to the width the firmware gives it, so the preview's
  // line lengths are the glasses' own, whatever font the viewer has.
  const rows = lines.map((text, i) => {
    if (!text) return "";
    const width = d.wrap(text, 1e9)[0]?.width ?? 0;
    return `<text x="${inset}" y="${inset + (i + 1) * lineHeight - 7}" textLength="${width}" lengthAdjust="spacingAndGlyphs">${escape(text)}</text>`;
  }).join("");
  const guides = o.guides
    ? `<rect x="1" y="1" width="${w - 2}" height="${h - 2}" rx="10" fill="none" stroke="#2f5a34" stroke-width="2"/>` +
      Array.from({ length: Math.floor((h - 2 * inset) / lineHeight) }, (_, i) =>
        `<line x1="${inset}" x2="${w - inset}" y1="${inset + (i + 1) * lineHeight}" y2="${inset + (i + 1) * lineHeight}" stroke="#14261a"/>`).join("")
    : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
    `<rect width="${w}" height="${h}" fill="#000"/>${guides}` +
    `<g font-family="-apple-system,BlinkMacSystemFont,Helvetica,Arial,sans-serif" font-size="21" fill="#8dfb95">${rows}</g></svg>`;
}
