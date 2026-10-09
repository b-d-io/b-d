import { test } from "node:test";
import assert from "node:assert/strict";
import { evenG2, textWidth } from "../src/devices.js";
import { reservations, step, stream, type Anchor } from "../src/stream.js";

const o = { wrap: evenG2.wrap, width: textWidth(evenG2) };
const sentence = (n: number) => ({ id: n, text: `Sentence number ${n} is here.` });
const opts = { capacity: 8, resting: 6 };

test("live words carry the open and close marks; settled ones only the open mark", () => {
  const lines = stream([sentence(1)], "still talk", o);
  assert.equal(lines[0].text, "› Sentence number 1 is here.");
  assert.equal(lines[1].text, "› still talk …");
});

test("the window moves down one line per step, never a block", () => {
  const caps = Array.from({ length: 12 }, (_, i) => sentence(i));
  const lines = stream(caps, "", o);
  let anchor: Anchor | undefined = { id: 0, index: 0 };
  let last: number | undefined;
  let t = 0;
  const firstLines: string[] = [];
  for (let k = 0; k < 20; k++) {
    const s = step(lines, anchor, last, t, opts);
    if (s.moved) last = t;
    anchor = s.anchor;
    firstLines.push(s.lines[0]);
    t += 1.0;
  }
  // Each move advances exactly one line, and the lens comes to rest at `resting` lines.
  const starts = firstLines.map((l) => lines.findIndex((x) => x.text === l));
  for (let k = 1; k < starts.length; k++) assert.ok(starts[k] - starts[k - 1] <= 1);
  assert.equal(lines.length - starts[starts.length - 1], opts.resting);
});

test("moves sooner when the newest line would fall off the bottom", () => {
  const lines = stream(Array.from({ length: 12 }, (_, i) => sentence(i)), "", o);
  const s = step(lines, { id: 0, index: 0 }, 0, 0.5, opts);
  assert.equal(s.moved, true); // 0.5 s < 1 s cooldown, but the lens is over capacity
});

test("a sentence keeps its rows when its translation is shorter", () => {
  const long = { id: 1, text: "This English sentence is long enough to wrap onto a second line on the lens, surely." };
  const reserved = reservations([long], new Map(), o);
  const after = stream([{ id: 1, text: "短句。" }, { id: 2, text: "Next." }], "", o, reserved);
  // The short translation still takes the rows the English took, so "Next." didn't move up.
  assert.equal(after.filter((l) => l.id === 1).length, reserved.get(1));
  assert.ok(reserved.get(1)! >= 2);
});
