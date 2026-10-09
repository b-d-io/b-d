# b-d

Field notes and open-source tools for building third-party apps on display smart glasses.

Everything here was measured on real hardware while shipping live-caption apps ([Odasho](https://odasho.ai)). Site: **[b-d.io](https://b-d.io)**

## Devices

| Glasses | Text canvas for apps | Access |
|---|---|---|
| Even Realities G2 | Yes — 576×288, ~27 px lines | Community BLE protocol; official Even Hub SDK |
| RayNeo iO | No — firmware keeps the canvas closed | — |
| Meta Ray-Ban Display | Yes — via Meta's display API | Official Wearables Device Access Toolkit |

## Coming here

- `core/` — lens layout (glyph widths, line breaking, one-line scrolling) and device adapters
- `sim/` — a lens simulator: render text exactly as a given pair of glasses would
- `mcp/` — an MCP server so an AI assistant can preview and send text to your glasses

## Contributing a device

Measured something on a pair of glasses we don't cover? Open an issue with the model, firmware version, and what you measured (and how). Only publish what you wrote or measured yourself — no vendor firmware or code.

## Credits

Our Even G2 work builds on community reverse-engineering, including [r4stl1n/even-realities-app-template](https://github.com/r4stl1n/even-realities-app-template) (MIT) and [i-soxi/even-g2-protocol](https://github.com/i-soxi/even-g2-protocol).

## License

Apache-2.0 © 2026 Serene Technologies Pte. Ltd. Device names are trademarks of their owners; this project is not affiliated with them.
