/** Device profiles: canvas, text box and line breaking, in each device's own pixels. */
import { G2, wrapG2 } from "./g2.js";
import type { Wrap } from "./stream.js";

export interface Device {
  id: string;
  name: string;
  /** Canvas in device pixels. */
  width: number;
  height: number;
  /** Text box inset (padding + border) on each side. */
  inset: number;
  lineHeight: number;
  wrap: Wrap;
}

/** Even G2, with the framed full-canvas text box Odasho uses (8 px padding + 2 px border). */
export const evenG2: Device = {
  id: "g2",
  name: "Even Realities G2",
  width: G2.width,
  height: G2.height,
  inset: 10,
  lineHeight: G2.lineHeight,
  wrap: wrapG2,
};

export const devices: Record<string, Device> = { g2: evenG2 };

/** Width available to text: one pixel held back so a measured line never wraps again on the glasses. */
export function textWidth(d: Device): number {
  return d.width - 2 * d.inset - 1;
}

/** Lines that fit in the text box. */
export function lineCapacity(d: Device): number {
  return Math.max(1, Math.floor((d.height - 2 * d.inset) / d.lineHeight));
}
