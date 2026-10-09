import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { clearPhone, findPhone, phoneStatus, sendToPhone } from "../src/phone.js";

// A stand-in for the phone: same paths, same answers as Odasho's RemoteLens.
async function fakePhone(code: string) {
  const seen: unknown[] = [];
  const server = createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      const send = (status: number, json: unknown) => { res.writeHead(status, { "content-type": "application/json" }); res.end(JSON.stringify(json)); };
      if (req.method === "GET" && req.url === "/status") return send(200, { ok: true, app: "Odasho" });
      if (req.method === "POST" && req.url === "/lens") {
        const j = JSON.parse(body);
        if (j.code !== code) return send(403, { ok: false, error: "Wrong pairing code." });
        seen.push(j);
        return send(200, { ok: true });
      }
      send(404, { ok: false, error: "nope" });
    });
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const port = (server.address() as AddressInfo).port;
  return { seen, port, close: () => server.close() };
}

test("status, send and clear reach the phone", async () => {
  const phone = await fakePhone("123456");
  process.env.B_D_PHONE = `127.0.0.1:${phone.port}`;
  const found = await findPhone();
  assert.equal(found.port, phone.port);
  assert.equal((await phoneStatus(found)).app, "Odasho");
  await sendToPhone(found, "123456", ["Hello."], "still talk");
  await clearPhone(found, "123456");
  assert.deepEqual(phone.seen, [{ code: "123456", captions: ["Hello."], live: "still talk" }, { code: "123456", clear: true }]);
  phone.close();
});

test("a wrong code comes back as the phone's own message", async () => {
  const phone = await fakePhone("123456");
  process.env.B_D_PHONE = `127.0.0.1:${phone.port}`;
  await assert.rejects(sendToPhone(await findPhone(), "000000", ["x"], ""), /Wrong pairing code/);
  phone.close();
});

test("an unreachable phone gives a hint, not a stack trace", async () => {
  process.env.B_D_PHONE = "127.0.0.1:1";
  await assert.rejects(phoneStatus(await findPhone()), /Remote lens on/);
});
