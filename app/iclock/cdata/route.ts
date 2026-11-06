import { heartbeat, ingest } from "@/lib/store";
import type { Method } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * ZKTeco / eSSL "ADMS" push protocol (a.k.a. iclock / PUSH SDK).
 * Point the terminal's Cloud Server / ADMS setting at this host, port 443/80.
 *
 *   GET  /iclock/cdata?SN=…&options=all   → handshake, returns push options
 *   POST /iclock/cdata?SN=…&table=ATTLOG  → tab-separated attendance lines:
 *        PIN \t YYYY-MM-DD HH:MM:SS \t status \t verify \t workcode …
 */
const text = (body: string, status = 200) => new Response(body, { status, headers: { "content-type": "text/plain" } });

export function GET(req: Request) {
  const sn = new URL(req.url).searchParams.get("SN") ?? "";
  if (sn) heartbeat(sn);
  return text(
    [
      `GET OPTION FROM: ${sn}`,
      "ATTLOGStamp=None",
      "OPERLOGStamp=9999",
      "ATTPHOTOStamp=None",
      "ErrorDelay=30",
      "Delay=10",
      "TransTimes=00:00;14:05",
      "TransInterval=1",
      "TransFlag=TransData AttLog",
      "TimeZone=5.5",
      "Realtime=1",
      "Encrypt=None",
    ].join("\n"),
  );
}

const VERIFY: Record<string, Method> = { "1": "finger", "4": "card", "15": "face", "25": "palm" };

export async function POST(req: Request) {
  const url = new URL(req.url);
  const sn = url.searchParams.get("SN") ?? "";
  const table = (url.searchParams.get("table") ?? "").toUpperCase();
  const body = await req.text();
  if (sn) heartbeat(sn);
  if (table !== "ATTLOG") return text("OK");
  let n = 0;
  for (const line of body.split(/\r?\n/)) {
    const f = line.split("\t");
    if (f.length < 2 || !f[0]) continue;
    // device clocks are local (IST)
    const ts = f[1].trim().replace(" ", "T") + "+05:30";
    const status = f[2]?.trim();
    ingest(
      {
        userId: f[0].trim(),
        ts: Number.isNaN(new Date(ts).getTime()) ? undefined : ts,
        deviceSerial: sn || undefined,
        direction: status === "0" ? "in" : status === "1" ? "out" : undefined,
        method: VERIFY[f[3]?.trim() ?? ""] ?? "face",
      },
      "adms",
    );
    n++;
  }
  return text(`OK: ${n}`);
}
