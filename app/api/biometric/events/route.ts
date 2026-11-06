import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { ingest } from "@/lib/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Generic biometric webhook — for middleware (eSSL eTimeTrackLite, BioTime,
 * Hikvision ISAPI bridges, or your own) that can POST JSON.
 *
 *   POST /api/biometric/events
 *   x-1g-signature: hex(HMAC-SHA256(BIOMETRIC_WEBHOOK_SECRET, rawBody))
 *   { "userId": "1042", "ts": "2026-11-06T18:42:10+05:30", "deviceSerial": "CKUH224960231", "direction": "in", "method": "face" }
 *   or { "events": [ ...same shape ] }
 */
const Event = z.object({
  userId: z.union([z.string(), z.number()]).transform(String),
  ts: z.union([z.string(), z.number()]).optional(),
  deviceSerial: z.string().optional(),
  direction: z.enum(["in", "out"]).optional(),
  method: z.enum(["face", "finger", "palm", "card"]).optional(),
});
const Body = z.union([z.object({ events: z.array(Event).max(500) }), Event]);

function verify(raw: string, sig: string | null) {
  const secret = process.env.BIOMETRIC_WEBHOOK_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production"; // open in local dev only
  if (!sig) return false;
  const want = createHmac("sha256", secret).update(raw).digest();
  let got: Buffer;
  try {
    got = Buffer.from(sig.replace(/^sha256=/, ""), "hex");
  } catch {
    return false;
  }
  return got.length === want.length && timingSafeEqual(got, want);
}

export async function POST(req: Request) {
  const raw = await req.text();
  if (!verify(raw, req.headers.get("x-1g-signature"))) {
    return Response.json({ ok: false, error: "invalid signature" }, { status: 401 });
  }
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return Response.json({ ok: false, error: "body must be JSON" }, { status: 400 });
  }
  const parsed = Body.safeParse(json);
  if (!parsed.success) return Response.json({ ok: false, error: parsed.error.issues }, { status: 422 });
  const list = "events" in parsed.data ? parsed.data.events : [parsed.data];
  const accepted = list.map((e) => ingest(e, "webhook"));
  return Response.json({ ok: true, accepted: accepted.length, events: accepted });
}
