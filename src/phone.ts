/**
 * Reach glasses through a phone on the same Wi-Fi.
 *
 * A computer can't hold a bonded link to Even G2, so text goes to a phone app
 * that already has the glasses (Odasho's "Remote lens", developer mode), which
 * draws it with its own layout and scrolling.
 *
 * The phone advertises `_b-d._tcp` over Bonjour and answers
 *   GET  /status
 *   POST /lens  {"code", "captions": [...], "live": "..."}   or  {"code", "clear": true}
 * Set B_D_PHONE=host:port to skip discovery, and B_D_CODE to the six-digit
 * pairing code the phone shows.
 */
import { Bonjour } from "bonjour-service";

export interface Phone {
  host: string;
  port: number;
  name?: string;
}

/** Find a phone advertising the remote lens, or use B_D_PHONE. */
export async function findPhone(timeoutMs = 3000): Promise<Phone> {
  const fixed = process.env.B_D_PHONE;
  if (fixed) {
    const [host, port] = fixed.split(":");
    if (!host) throw new Error("B_D_PHONE should look like 192.168.1.20:8787");
    return { host, port: Number(port || 8787) };
  }
  const bonjour = new Bonjour();
  try {
    return await new Promise<Phone>((resolve, reject) => {
      const timer = setTimeout(() => {
        browser.stop();
        reject(new Error("No phone found on this Wi-Fi. Turn on Odasho › Glasses › Remote lens (developer mode), or set B_D_PHONE=host:port."));
      }, timeoutMs);
      const browser = bonjour.find({ type: "b-d" }, (service) => {
        const host = service.addresses?.find((a) => a.includes(".")) ?? service.host;
        clearTimeout(timer);
        browser.stop();
        resolve({ host, port: service.port, name: service.name });
      });
    });
  } finally {
    bonjour.destroy();
  }
}

async function call(phone: Phone, path: string, body?: unknown): Promise<Record<string, unknown>> {
  const url = `http://${phone.host}:${phone.port}${path}`;
  let response: Response;
  try {
    response = await fetch(url, {
      method: body === undefined ? "GET" : "POST",
      headers: body === undefined ? undefined : { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(5000),
    });
  } catch (e) {
    throw new Error(`Couldn't reach the phone at ${phone.host}:${phone.port} — is Odasho open with Remote lens on? (${e instanceof Error ? e.message : e})`);
  }
  const json = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok || json.ok !== true) {
    throw new Error(String(json.error ?? `The phone answered HTTP ${response.status}.`));
  }
  return json;
}

export function phoneStatus(phone: Phone) {
  return call(phone, "/status");
}

export function sendToPhone(phone: Phone, code: string, captions: string[], live: string) {
  return call(phone, "/lens", { code, captions, live });
}

export function clearPhone(phone: Phone, code: string) {
  return call(phone, "/lens", { code, clear: true });
}
