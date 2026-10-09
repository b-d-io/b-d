#!/usr/bin/env node
/**
 * b-d preview — render captions exactly as the glasses would lay them out.
 *
 *   b-d preview "First sentence." "Second sentence." --live "words still being spo"
 *   b-d preview --device g2 --guides -o lens.png "Hello, lens"
 *
 * Writes an SVG or PNG (by extension) and prints the lines, so an AI assistant
 * can check its own output without wearing the glasses.
 */
import { writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { devices, lineCapacity, textWidth } from "./devices.js";
import { renderSVG } from "./render.js";
import { stream, step } from "./stream.js";

const usage = `usage: b-d preview [--device g2] [--live TEXT] [--guides] [-o FILE.svg|FILE.png] CAPTION...`;

async function main() {
  const [command, ...rest] = process.argv.slice(2);
  if (command !== "preview") {
    console.error(usage);
    process.exit(command ? 1 : 0);
  }
  const { values, positionals } = parseArgs({
    args: rest, allowPositionals: true,
    options: {
      device: { type: "string", default: "g2" },
      live: { type: "string", default: "" },
      guides: { type: "boolean", default: false },
      out: { type: "string", short: "o", default: "lens.svg" },
    },
  });
  const device = devices[values.device!];
  if (!device) {
    console.error(`unknown device "${values.device}". Known: ${Object.keys(devices).join(", ")}`);
    process.exit(1);
  }
  const o = { wrap: device.wrap, width: textWidth(device) };
  const lines = stream(positionals.map((text, id) => ({ id, text })), values.live!, o);
  // One line kept free at the bottom, as on a live lens.
  const capacity = lineCapacity(device) - 1;
  const shown = step(lines, undefined, undefined, 0, { capacity, resting: capacity }).lines;
  const svg = renderSVG(shown, device, { guides: values.guides });
  const out = values.out!;
  if (out.endsWith(".png")) {
    const { Resvg } = await import("@resvg/resvg-js");
    writeFileSync(out, new Resvg(svg, { fitTo: { mode: "zoom", value: 2 } }).render().asPng());
  } else {
    writeFileSync(out, svg);
  }
  console.log(`${device.name}: ${shown.length}/${capacity} lines → ${out}`);
  for (const l of shown) console.log(`  │ ${l}`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
