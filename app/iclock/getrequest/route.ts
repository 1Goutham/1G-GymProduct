import { heartbeat } from "@/lib/store";

export const dynamic = "force-dynamic";

/** ADMS command poll — terminals call this every few seconds. No queued commands. */
export function GET(req: Request) {
  const sn = new URL(req.url).searchParams.get("SN");
  if (sn) heartbeat(sn);
  return new Response("OK", { headers: { "content-type": "text/plain" } });
}
