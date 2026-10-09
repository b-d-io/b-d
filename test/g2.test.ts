import { test } from "node:test";
import assert from "node:assert/strict";
import { measureTextWrap } from "@evenrealities/pretext";
import { wrapG2 } from "../src/g2.js";

// Captions of the kind Odasho shows, in the languages it shows them in,
// at the widths it uses. pretext is the reference: Even's own package.
const texts = [
  "The quick brown fox jumps over the lazy dog while everyone in the meeting listens carefully to the plan.",
  "› Keep taking it twice a day, with food, and come back in three months …",
  "Supercalifragilisticexpialidocious-and-then-some-more-words-without-spaces-at-all",
  "今天的会议我们讨论了新产品的发布计划，大家都同意下个月开始测试。",
  "混合 mixed 文本 with English and 中文 in one line, plus numbers 12345.",
  "Привет, как дела? Γειά σου κόσμε.",
  "  leading spaces and\nan explicit newline\n\nand an empty line",
  "a-b-c-d-e-f-g-h-i-j-k-l-m-n-o-p-q-r-s-t-u-v-w-x-y-z-a-b-c-d-e-f-g-h-i-j",
  "",
];
const widths = [555, 300, 200, 120, 60];

for (const text of texts) {
  for (const width of widths) {
    test(`matches pretext: ${JSON.stringify(text.slice(0, 24))} @ ${width}px`, () => {
      const ours = wrapG2(text, width);
      const theirs = measureTextWrap(text, width);
      assert.deepEqual(ours.map((l) => l.width), theirs.lineWidths);
    });
  }
}

test("lines join back into the text, minus dropped leading spaces", () => {
  const text = "The quick brown fox jumps over the lazy dog while everyone listens.";
  const joined = wrapG2(text, 200).map((l) => l.text).join(" ").replace(/\s+/g, " ");
  assert.equal(joined.trim(), text);
});

test("every line fits", () => {
  for (const text of texts) for (const width of widths) {
    for (const line of wrapG2(text, width)) {
      if ([...line.text].length > 1) assert.ok(line.width <= width, `${line.text} is ${line.width}px > ${width}px`);
    }
  }
});
