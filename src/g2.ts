/**
 * Even Realities G2: line breaking that matches the firmware.
 *
 * Glyph widths and kerning come from Even's own `@evenrealities/pretext`
 * (MIT), which carries the firmware's LVGL font metrics. pretext reports how
 * many lines a text makes and how wide each is, but not which characters land
 * on which line — and scrolling captions one line at a time needs exactly that.
 * So the breaking rules are reproduced here (spaces, hyphens, CJK boundaries,
 * hard breaks, leading spaces dropped, newlines kept) on top of pretext's
 * widths, and the tests check every result against `measureTextWrap`.
 */
import { getTextWidth } from "@evenrealities/pretext";

/** The G2 canvas and text metrics, in firmware pixels. */
export const G2 = {
  width: 576,
  height: 288,
  lineHeight: 27,
} as const;

export interface Line {
  text: string;
  width: number;
}

/**
 * A glyph's width in whole pixels, with kerning into the next glyph.
 *
 * pretext rounds each glyph on its own, as LVGL does, so the width of a pair
 * minus the width of the second glyph is exactly the first glyph's share.
 */
function advance(cp: number, next: number | undefined): number {
  const glyph = String.fromCodePoint(cp);
  if (next === undefined) return getTextWidth(glyph);
  const after = String.fromCodePoint(next);
  return getTextWidth(glyph + after) - getTextWidth(after);
}

function isCJK(cp: number): boolean {
  return (cp >= 0x2e80 && cp <= 0x9fff) || (cp >= 0xf900 && cp <= 0xfaff) || (cp >= 0xac00 && cp <= 0xd7af);
}

function isBreakable(cp: number): boolean {
  return cp === 32 || cp === 45 || isCJK(cp);
}

/** The lines the G2 firmware makes of `text` within `maxWidth` pixels. */
export function wrapG2(text: string, maxWidth: number): Line[] {
  const cps = Array.from(text, (c) => c.codePointAt(0)!);
  if (cps.length === 0) return [];
  const slice = (from: number, to: number) => String.fromCodePoint(...cps.slice(from, Math.max(from, to)));
  const lines: Line[] = [];
  let current = 0;
  let lineStart = 0;
  let lastBreak = -1;
  let lastBreakWidth = 0;
  let i = 0;
  while (i < cps.length) {
    const cp = cps[i];
    if (cp === 10) {
      lines.push({ text: slice(lineStart, i), width: current });
      current = 0;
      lastBreak = -1;
      i += 1;
      lineStart = i;
      continue;
    }
    if (current === 0 && cp === 32) {
      // A leading space is dropped.
      i += 1;
      if (lineStart === i - 1) lineStart = i;
      continue;
    }
    const w = advance(cp, cps[i + 1]);
    if (current + w > maxWidth) {
      if (cp === 32) {
        // The space overflows: break on it.
        lines.push({ text: slice(lineStart, i), width: current });
        current = 0;
        lastBreak = -1;
        i += 1;
        lineStart = i;
      } else if (lastBreak !== -1) {
        // Go back to the last break opportunity.
        const end = cps[lastBreak] === 32 ? lastBreak : lastBreak + 1;
        lines.push({ text: slice(lineStart, end), width: lastBreakWidth });
        current = 0;
        i = lastBreak + 1;
        lineStart = i;
        lastBreak = -1;
      } else {
        // No break opportunity in this word: hard break.
        lines.push({ text: slice(lineStart, i), width: current });
        current = w;
        lastBreak = -1;
        lineStart = i;
        i += 1;
      }
    } else {
      current += w;
      if (isBreakable(cp)) {
        lastBreak = i;
        lastBreakWidth = cp === 32 ? current - w : current;
      }
      i += 1;
    }
  }
  lines.push({ text: slice(lineStart, cps.length), width: current });
  return lines;
}
