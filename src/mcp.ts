#!/usr/bin/env node
/**
 * An MCP server for smart-glasses text: an AI assistant can lay out captions
 * and see the lens before anything reaches real glasses.
 *
 *   claude mcp add b-d -- node /path/to/b-d/dist/src/mcp.js
 *
 * Tools
 *   list_devices  — supported glasses and their canvas
 *   wrap_text     — the lines the firmware makes of a text, with pixel widths
 *   preview_lens  — the lens as an image, plus the lines to send
 *
 * Sending to physical glasses needs a phone in between (a Mac can't hold a
 * bonded G2 link), so this server previews only.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { devices, lineCapacity, textWidth } from "./devices.js";
import { renderSVG } from "./render.js";
import { step, stream } from "./stream.js";

const server = new McpServer({ name: "b-d", version: "0.1.0" });
const deviceIds = Object.keys(devices) as [string, ...string[]];

function device(id: string) {
  const d = devices[id];
  if (!d) throw new Error(`Unknown device "${id}". Known: ${deviceIds.join(", ")}`);
  return d;
}

server.registerTool("list_devices", {
  title: "List supported glasses",
  description: "Smart glasses this server can lay out text for, with canvas size, usable text width and line capacity.",
  inputSchema: {},
}, async () => ({
  content: [{
    type: "text",
    text: JSON.stringify(Object.values(devices).map((d) => ({
      id: d.id, name: d.name, canvas: `${d.width}x${d.height}`,
      textWidth: textWidth(d), lineHeight: d.lineHeight, lines: lineCapacity(d),
    })), null, 2),
  }],
}));

server.registerTool("wrap_text", {
  title: "Wrap text like the firmware",
  description: "Break a text into the exact lines the glasses' firmware will draw, with each line's width in pixels. Use it to check that text fits before sending.",
  inputSchema: {
    text: z.string().max(5000).describe("The text to lay out"),
    device: z.enum(deviceIds).default("g2"),
    width: z.number().int().positive().max(2000).optional().describe("Pixel width; defaults to the device's full text box"),
  },
}, async ({ text, device: id, width }) => {
  const d = device(id);
  const lines = d.wrap(text, width ?? textWidth(d));
  return { content: [{ type: "text", text: JSON.stringify({ lines, count: lines.length }, null, 2) }] };
});

server.registerTool("preview_lens", {
  title: "Preview the lens",
  description: "Render captions as the glasses would show them: settled captions scroll up one line at a time, the words still being spoken are marked, and one line stays free at the bottom. Returns a PNG of the lens and the lines to send.",
  inputSchema: {
    captions: z.array(z.string().max(2000)).max(200).describe("Settled captions, oldest first"),
    live: z.string().max(2000).default("").describe("Words still being spoken"),
    device: z.enum(deviceIds).default("g2"),
  },
}, async ({ captions, live, device: id }) => {
  const d = device(id);
  const o = { wrap: d.wrap, width: textWidth(d) };
  const lines = stream(captions.map((text, i) => ({ id: i, text })), live, o);
  const capacity = lineCapacity(d) - 1;
  const shown = step(lines, undefined, undefined, 0, { capacity, resting: capacity }).lines;
  const { Resvg } = await import("@resvg/resvg-js");
  const png = new Resvg(renderSVG(shown, d, { guides: true }), { fitTo: { mode: "zoom", value: 2 } }).render().asPng();
  return {
    content: [
      { type: "image", data: Buffer.from(png).toString("base64"), mimeType: "image/png" },
      { type: "text", text: JSON.stringify({ device: d.name, shown, linesUsed: shown.length, capacity, scrolledOff: Math.max(0, lines.length - shown.length) }, null, 2) },
    ],
  };
});

await server.connect(new StdioServerTransport());
