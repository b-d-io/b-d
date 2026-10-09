# Contributing to b-d

b-d collects what third-party apps can actually do on display smart glasses — measured, not copied from spec sheets — plus open tools that use those measurements.

## Report a device

Have a pair we don't cover, or a newer firmware that behaves differently? [Open an issue](https://github.com/b-d-io/b-d/issues/new) titled `Device: <brand model>` with:

- **Model and firmware version**, and the phone and OS you tested from
- **How you connected**: official SDK (name and version), documented protocol, or your own reverse engineering
- **What you measured**, and **how**: canvas size, lines and characters per screen, update size limits, refresh rate, microphone format, touch events, reconnect behaviour, anything that surprised you
- **What didn't work**

Numbers beat adjectives: "an update over ~250 bytes is silently dropped" helps; "updates are slow" doesn't.

## Add a device to the code

A device is a profile in `src/devices.ts`: canvas size, text inset, line height, and a `wrap` function that breaks text exactly as the firmware does.

1. Write `wrap` for the device (see `src/g2.ts`).
2. Add tests that compare your line breaks against a reference: the vendor's own measurement library if there is one, otherwise photos of the lens for a set of test strings, checked in under `test/fixtures/`.
3. Add the profile to `devices`, and the preview, simulator and MCP server pick it up.

Run `npm test` before opening a pull request.

## What we can't accept

- Vendor firmware, SDK binaries, or code copied from vendor apps
- Secrets: keys, authentication algorithms, salts or device identifiers that let someone get around a vendor's access controls
- Code from projects with non-commercial or otherwise incompatible licences

Only publish what you measured or wrote yourself. Contributions are licensed under Apache-2.0.

## Questions

Open an issue, or email allen@serenesg.com.
