/**
 * Captions as a stream of lines, and the lens as a window that moves down it
 * one line at a time.
 *
 * Every caption is wrapped into lines; the words still being spoken follow.
 * The lens shows the last few lines of that stream and only ever moves down,
 * one line per step, so text leaves the top line by line instead of jumping
 * as a block. Device-agnostic: pass the device's own `wrap`.
 */
import type { Line } from "./g2.js";

export type Wrap = (text: string, maxWidth: number) => Line[];

export interface Caption {
  id: number;
  text: string;
}

/** One line of the stream: which caption it belongs to, and which of its lines. */
export interface StreamLine {
  id: number;
  index: number;
  text: string;
}

/** Where the lens begins. */
export interface Anchor {
  id: number;
  index: number;
}

/** Marks for text still being spoken: a lens has one brightness, so text can't be dimmer. */
export const LIVE_OPEN = "› ";
export const LIVE_CLOSE = " …";

export interface StreamOptions {
  wrap: Wrap;
  width: number;
}

/** A settled caption's lines, opening mark included. */
export function rows(caption: string, o: StreamOptions): string[] {
  const text = caption.trim();
  return text ? o.wrap(LIVE_OPEN + text, o.width).map((l) => l.text.trim()) : [];
}

/** The words still being spoken, opened and closed. */
export function liveRows(live: string, o: StreamOptions): string[] {
  const text = live.trim();
  return text ? o.wrap(LIVE_OPEN + text + LIVE_CLOSE, o.width).map((l) => l.text.trim()) : [];
}

/**
 * Rows each caption keeps: the most it has ever needed, counted as if still
 * being spoken. A sentence then takes the same rows in progress and final,
 * and keeps them when its translation is shorter — nothing below it moves.
 */
export function reservations(captions: Caption[], previous: Map<number, number>, o: StreamOptions): Map<number, number> {
  const next = new Map<number, number>();
  for (const c of captions) next.set(c.id, Math.max(previous.get(c.id) ?? 0, liveRows(c.text, o).length));
  return next;
}

/** Every caption wrapped (keeping reserved rows as blank lines), then the live words. */
export function stream(captions: Caption[], live: string, o: StreamOptions, reserved = new Map<number, number>()): StreamLine[] {
  const lines: StreamLine[] = [];
  for (const c of captions) {
    const wrapped = rows(c.text, o);
    const count = Math.max(wrapped.length, reserved.get(c.id) ?? 0);
    for (let index = 0; index < count; index++) lines.push({ id: c.id, index, text: wrapped[index] ?? "" });
  }
  const spoken = liveRows(live, o);
  if (spoken.length === 0) return lines;
  const lastId = captions.length ? captions[captions.length - 1].id : Number.MIN_SAFE_INTEGER;
  const last = lines[lines.length - 1];
  const offset = last && last.id === lastId ? last.index + 1 : 0;
  spoken.forEach((text, k) => lines.push({ id: lastId, index: offset + k, text }));
  return lines;
}

/** Where `anchor` sits in `lines`, or the first line after it if that line is gone. */
export function position(anchor: Anchor | undefined, lines: StreamLine[]): number | undefined {
  if (!anchor) return undefined;
  const at = lines.findIndex((l) => l.id > anchor.id || (l.id === anchor.id && l.index >= anchor.index));
  return at === -1 ? lines.length : at;
}

export interface StepOptions {
  /** Lines the lens can show. */
  capacity: number;
  /** Lines the lens settles at; beyond this it starts moving. */
  resting: number;
  /** Seconds between moves. */
  cooldown?: number;
  /** Seconds between moves when the newest line would fall off the bottom. */
  urgent?: number;
}

export interface Step {
  lines: string[];
  anchor: Anchor | undefined;
  moved: boolean;
  /** Seconds until another move may be due; undefined when at rest. */
  nextCheck: number | undefined;
}

/**
 * The lens now, moved at most one line. Up to `resting` lines nothing moves;
 * beyond it, one line per `cooldown` seconds (`urgent` when the lens is full).
 * It never moves back up: lines that get shorter leave space at the bottom.
 */
export function step(lines: StreamLine[], anchor: Anchor | undefined, lastMove: number | undefined, now: number, s: StepOptions): Step {
  const cooldown = s.cooldown ?? 1.0;
  const urgent = s.urgent ?? 0.12;
  let start = position(anchor, lines) ?? Math.max(0, lines.length - s.resting);
  let moved = false;
  let nextCheck: number | undefined;
  const showing = lines.length - start;
  if (showing > s.resting) {
    const wait = showing > s.capacity ? urgent : cooldown;
    const elapsed = lastMove === undefined ? Infinity : now - lastMove;
    if (elapsed >= wait) {
      start += 1;
      moved = true;
      const left = lines.length - start;
      if (left > s.resting) nextCheck = left > s.capacity ? urgent : cooldown;
    } else {
      nextCheck = wait - elapsed;
    }
  }
  const shown = lines.slice(start, start + s.capacity).map((l) => l.text);
  const first = lines[start];
  return { lines: shown, anchor: first ? { id: first.id, index: first.index } : anchor, moved, nextCheck };
}
