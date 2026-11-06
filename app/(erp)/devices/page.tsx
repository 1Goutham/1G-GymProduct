import { headers } from "next/headers";
import { ScanFace, Fingerprint, Server, Webhook, FlaskConical, Cpu } from "lucide-react";
import { db, snapshot } from "@/lib/store";
import { Badge, Card, PageHeader, Td, Th } from "@/components/ui/primitives";
import { CopyBlock, TestPunch } from "@/components/modules/device-tools";
import { FingerprintArt } from "@/components/illustrations";
import { ago, clockSec } from "@/lib/format";
import { cn } from "@/lib/cn";

export const dynamic = "force-dynamic";
export const metadata = { title: "Biometrics" };

export default async function DevicesPage() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "your-1g-domain.com";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const base = `${proto}://${host}`;
  const snap = snapshot();
  const s = db();

  const curl = `BODY='{"userId":"1042","deviceSerial":"CKUH224960231","direction":"in","method":"face"}'
SIG=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "$BIOMETRIC_WEBHOOK_SECRET" -hex | sed 's/^.* //')
curl -X POST ${base}/api/biometric/events \\
  -H "content-type: application/json" \\
  -H "x-1g-signature: $SIG" \\
  -d "$BODY"`;

  return (
    <>
      <PageHeader eyebrow="System" title="Biometrics" subtitle="Face, fingerprint and palm terminals feed the live floor. Connect over the ZKTeco/eSSL ADMS push protocol or any middleware via a signed webhook." art={<FingerprintArt size={112} />} />

      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {s.devices.map((d) => {
          const online = d.status === "online";
          return (
            <section key={d.id} className="card rise p-5">
              <div className="flex items-start justify-between">
                <span className="grid size-10 place-items-center rounded-2xl bg-surface-3 text-fg">{d.kind === "staff" ? <Fingerprint className="size-5" /> : <ScanFace className="size-5" />}</span>
                <Badge tone={online ? "ok" : "bad"} dot>
                  {online ? "Online" : "Offline"}
                </Badge>
              </div>
              <div className="mt-4 text-[15px] font-semibold text-fg">{d.name}</div>
              <div className="text-[12.5px] text-muted">{d.model}</div>
              <dl className="mt-4 grid grid-cols-2 gap-y-2 text-[12px]">
                <dt className="text-muted">Location</dt>
                <dd className="truncate text-right text-fg-2">{d.location}</dd>
                <dt className="text-muted">Serial</dt>
                <dd className="num truncate text-right text-fg-2">{d.serial}</dd>
                <dt className="text-muted">Templates</dt>
                <dd className="num text-right text-fg-2">{d.templates.toLocaleString("en-IN")}</dd>
                <dt className="text-muted">Heartbeat</dt>
                <dd className={cn("text-right", online ? "text-fg-2" : "text-bad")}>{ago(d.lastHeartbeat)}</dd>
                <dt className="text-muted">Source</dt>
                <dd className="text-right text-fg-2">{d.source === "adms" ? "ADMS push" : d.source === "webhook" ? "Webhook" : "Simulator"}</dd>
              </dl>
            </section>
          );
        })}
      </div>

      <div id="connect" className="mb-5 grid scroll-mt-20 gap-5 lg:grid-cols-2">
        <Card
          title={
            <span className="inline-flex items-center gap-2">
              <Server className="size-4 text-s1" /> Option A · ADMS push (ZKTeco, eSSL)
            </span>
          }
          subtitle="No middleware. The terminal talks to 1Gtemplates directly."
        >
          <ol className="grid gap-2.5 text-[13.5px] leading-relaxed text-fg-2">
            <li>
              <span className="font-medium text-fg">1.</span> On the terminal: <span className="text-fg">Menu → Comm. → Cloud Server Setting</span> (or <span className="text-fg">ADMS</span>).
            </li>
            <li>
              <span className="font-medium text-fg">2.</span> Server address <code className="rounded bg-surface-3 px-1.5 font-mono text-[12.5px]">{host}</code>, port <code className="rounded bg-surface-3 px-1.5 font-mono text-[12.5px]">{proto === "https" ? 443 : 80}</code>, HTTPS {proto === "https" ? "on" : "off"}.
            </li>
            <li>
              <span className="font-medium text-fg">3.</span> Enrol members with their 1G member number as the user ID (PIN).
            </li>
            <li>
              <span className="font-medium text-fg">4.</span> The device appears here within a minute. Punches stream to the live floor in real time.
            </li>
          </ol>
          <div className="mt-4">
            <CopyBlock label="Endpoints the terminal will call" code={`GET  ${base}/iclock/cdata?SN=<serial>      # handshake\nPOST ${base}/iclock/cdata?SN=<serial>&table=ATTLOG\nGET  ${base}/iclock/getrequest?SN=<serial>  # heartbeat`} />
          </div>
        </Card>

        <Card
          title={
            <span className="inline-flex items-center gap-2">
              <Webhook className="size-4 text-s1" /> Option B · Signed webhook
            </span>
          }
          subtitle="For BioTime, eTimeTrackLite, Hikvision bridges or your own scripts."
        >
          <p className="text-[13.5px] leading-relaxed text-fg-2">
            POST JSON to the events endpoint, signed with HMAC-SHA256 using <code className="rounded bg-surface-3 px-1.5 font-mono text-[12.5px]">BIOMETRIC_WEBHOOK_SECRET</code>. Send one event or <code className="rounded bg-surface-3 px-1.5 font-mono text-[12.5px]">{`{ "events": [...] }`}</code> up to 500 at a time.
          </p>
          <div className="mt-4">
            <CopyBlock code={curl} />
          </div>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <div className="grid content-start gap-5">
          <Card
            title={
              <span className="inline-flex items-center gap-2">
                <FlaskConical className="size-4 text-s1" /> Test a punch
              </span>
            }
            subtitle="Runs through the exact pipeline real terminals use."
          >
            <TestPunch />
          </Card>
          <Card
            title={
              <span className="inline-flex items-center gap-2">
                <Cpu className="size-4 text-s1" /> Works with
              </span>
            }
          >
            <div className="flex flex-wrap gap-2">
              {["ZKTeco SpeedFace", "ZKTeco ProFace X", "ZKTeco MB/K series", "eSSL X990 / AiFace", "Realtime T502", "Matrix COSEC (via webhook)", "Hikvision (via bridge)", "Suprema (via BioStar webhook)"].map((x) => (
                <Badge key={x}>{x}</Badge>
              ))}
            </div>
          </Card>
        </div>

        <Card title="Event log" subtitle="Latest punches across all terminals" pad={false}>
          <div className="max-h-[460px] overflow-auto">
            <table className="w-full border-collapse">
              <thead className="sticky top-0 bg-surface">
                <tr>
                  <Th>Time</Th>
                  <Th>Person</Th>
                  <Th>Terminal</Th>
                  <Th>Method</Th>
                  <Th className="text-right">Result</Th>
                </tr>
              </thead>
              <tbody>
                {snap.events.map((e) => (
                  <tr key={e.id} className="hover:bg-hover">
                    <Td className="num text-fg-2">{clockSec(e.ts)}</Td>
                    <Td>
                      <div className="font-medium">{e.name}</div>
                      <div className="text-[12px] text-muted">{e.personType}</div>
                    </Td>
                    <Td className="text-fg-2">{s.devices.find((d) => d.id === e.deviceId)?.name ?? "API"}</Td>
                    <Td className="capitalize text-fg-2">{e.method}</Td>
                    <Td className="text-right">
                      <Badge tone={!e.verified ? "bad" : e.direction === "in" ? "ok" : "muted"}>{!e.verified ? "Denied" : e.direction === "in" ? "In" : "Out"}</Badge>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </>
  );
}
