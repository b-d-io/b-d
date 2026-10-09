# b-d

Field notes and open-source tools for building third-party apps on display smart glasses.

Everything here was measured on real hardware while shipping live-caption apps ([Odasho](https://odasho.ai)). Site: **[b-d.io](https://b-d.io)**

## Devices

| Glasses | Text canvas for apps | Access |
|---|---|---|
| Even Realities G2 | Yes — 576×288, ~27 px lines | Community BLE protocol; official Even Hub SDK |
| RayNeo iO | No — firmware keeps the canvas closed | — |
| Meta Ray-Ban Display | Yes — via Meta's display API | Official Wearables Device Access Toolkit |

## `@b-d-io/glasses`

Lay out, scroll and preview text exactly as smart glasses draw it. Even G2 first.

- **Firmware-exact line breaking** for Even G2, on top of Even's own [`@evenrealities/pretext`](https://www.npmjs.com/package/@evenrealities/pretext) metrics. The test suite checks every line width against pretext.
- **Captions as a stream** — the lens moves down one line at a time, sentences keep their rows when a translation is shorter, and words still being spoken are marked `› …`.
- **Preview from the command line** — an SVG or PNG of the lens, with each line drawn at the width the glasses give it. Handy for AI coding assistants: they can check their own output without the glasses.

```bash
git clone https://github.com/b-d-io/b-d && cd b-d && npm install && npm run build
node dist/src/cli.js preview --guides -o lens.png "Your results look good." --live "Any questi"
```

```ts
import { evenG2, textWidth, lineCapacity, stream, step } from "@b-d-io/glasses";

const o = { wrap: evenG2.wrap, width: textWidth(evenG2) };
const lines = stream([{ id: 1, text: "Your results look good." }], "Any questi", o);
const lens = step(lines, undefined, undefined, 0, { capacity: lineCapacity(evenG2) - 1, resting: 6 });
console.log(lens.lines); // what to send to the glasses, line by line
```

## Simulator

Try it in the browser: **[b-d.io/sim](https://b-d.io/sim/)** — type captions, see the lens.

## MCP server

Let an AI assistant lay out text and look at the lens before anything reaches real glasses.

```bash
npm run build
claude mcp add b-d -- node "$PWD/dist/src/mcp.js"
```

Tools: `list_devices`, `wrap_text` (firmware line breaks with pixel widths), `preview_lens` (a PNG of the lens plus the lines to send), and — to reach real glasses — `phone_status`, `send_to_glasses`, `clear_glasses`.

### Sending to real glasses

A computer can't hold a bonded link to Even G2, so text goes through a phone on the same Wi-Fi that already has the glasses: [Odasho](https://odasho.ai/app.html) › Glasses › **Remote lens** (developer mode). The phone advertises `_b-d._tcp` over Bonjour and shows a six-digit pairing code.

```bash
claude mcp add b-d -e B_D_CODE=123456 -- node "$PWD/dist/src/mcp.js"
# optional: -e B_D_PHONE=192.168.1.20:8787 to skip discovery
```

The phone's API is two calls, if you'd rather write your own client:

```
GET  http://PHONE:8787/status
POST http://PHONE:8787/lens   {"code": "123456", "captions": ["…"], "live": "…"}
POST http://PHONE:8787/lens   {"code": "123456", "clear": true}
```

## Coming next

- More devices

## Contributing a device

Measured something on a pair of glasses we don't cover? Open an issue with the model, firmware version, and what you measured (and how). Only publish what you wrote or measured yourself — no vendor firmware or code.

## Credits

Our Even G2 work builds on community reverse-engineering, including [r4stl1n/even-realities-app-template](https://github.com/r4stl1n/even-realities-app-template) (MIT) and [i-soxi/even-g2-protocol](https://github.com/i-soxi/even-g2-protocol).

## License

Apache-2.0 © 2026 Serene Technologies Pte. Ltd. Device names are trademarks of their owners; this project is not affiliated with them.
