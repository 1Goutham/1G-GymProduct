"use client";

import { useMemo, useState, useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ScanFace, Fingerprint, Hand, CreditCard, ShieldAlert, LogIn, LogOut, Wifi, WifiOff, Users, Clock, TrendingUp, Activity } from "lucide-react";
import type { LiveSnapshot, Method } from "@/lib/types";
import { useLive } from "./use-live";
import { AreaChart, Legend, Ring } from "@/components/charts/charts";
import { Avatar, Badge, Card, Meter } from "@/components/ui/primitives";
import { ago, clock, clockSec, hourLabel, local } from "@/lib/format";
import { cn } from "@/lib/cn";
import { toggleSimulator } from "@/app/actions";
import { useToast } from "@/components/shell/shell";

const ZONE_GEOM: Record<string, { x: number; y: number; w: number; h: number }> = {
  cardio: { x: 4, y: 4, w: 40, h: 22 },
  strength: { x: 48, y: 4, w: 48, h: 30 },
  free: { x: 4, y: 30, w: 40, h: 26 },
  functional: { x: 48, y: 38, w: 26, h: 18 },
  studio: { x: 78, y: 38, w: 18, h: 18 },
};

const METHOD_ICON: Record<Method, typeof ScanFace> = { face: ScanFace, finger: Fingerprint, palm: Hand, card: CreditCard };

export function crowdLabel(p: number) {
  if (p < 0.35) return { text: "Quiet", tone: "ok" as const };
  if (p < 0.6) return { text: "Comfortable", tone: "ok" as const };
  if (p < 0.8) return { text: "Busy", tone: "warn" as const };
  return { text: "Packed", tone: "bad" as const };
}

function seeded(i: number) {
  const x = Math.sin(i * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

export function FloorPlan({ snap }: { snap: LiveSnapshot }) {
  const [hover, setHover] = useState<string | null>(null);
  return (
    <div className="relative">
      <svg viewBox="0 0 100 60" className="h-auto w-full" role="img" aria-label="Floor plan with live occupancy per zone">
        <rect x="0.5" y="0.5" width="99" height="59" rx="3" fill="var(--surface-2)" stroke="var(--line-strong)" strokeWidth="0.3" />
        {snap.zones.map((z) => {
          const g = ZONE_GEOM[z.id];
          const p = z.count / z.capacity;
          const fill = `color-mix(in srgb, var(--s1) ${Math.round(8 + p * 62)}%, var(--surface))`;
          const dots = Math.min(z.count, 60);
          return (
            <g key={z.id} onMouseEnter={() => setHover(z.id)} onMouseLeave={() => setHover(null)} className="cursor-default">
              <rect x={g.x} y={g.y} width={g.w} height={g.h} rx="2" fill={fill} stroke={hover === z.id ? "var(--s1)" : "var(--line-strong)"} strokeWidth={hover === z.id ? 0.5 : 0.25} style={{ transition: "fill 1s var(--ease-out-expo)" }} />
              {Array.from({ length: dots }).map((_, i) => (
                <circle key={i} cx={(g.x + 2 + seeded(i + z.id.length * 7) * (g.w - 4)).toFixed(2)} cy={(g.y + 6 + seeded(i * 3 + z.id.length) * (g.h - 8)).toFixed(2)} r="0.55" fill="var(--fg)" opacity="0.55">
                  <animate attributeName="opacity" values="0.35;0.7;0.35" dur={`${(2 + seeded(i) * 3).toFixed(1)}s`} repeatCount="indefinite" />
                </circle>
              ))}
              <text x={g.x + 2} y={g.y + 3.6} className="fill-[var(--fg)]" style={{ fontSize: 2.3, fontWeight: 600 }}>
                {z.name}
              </text>
              <text x={g.x + g.w - 2} y={g.y + 3.6} textAnchor="end" className="fill-[var(--fg-2)] num" style={{ fontSize: 2.3 }}>
                {z.count}/{z.capacity}
              </text>
            </g>
          );
        })}
        {/* entrance */}
        <rect x="44.5" y="57.5" width="11" height="2.5" rx="0.6" fill="var(--brand)" />
        <text x="50" y="56.6" textAnchor="middle" className="fill-[var(--muted)]" style={{ fontSize: 1.8 }}>
          Entrance · turnstiles
        </text>
      </svg>
    </div>
  );
}

export function LiveFloor({ initial }: { initial: LiveSnapshot }) {
  const { snap, connected } = useLive(initial);
  const toast = useToast();
  const [pending, start] = useTransition();
  const p = snap.inside / snap.capacity;
  const label = crowdLabel(p);
  const l = local(snap.now);
  const nowIdx = snap.hourly.findIndex((h) => h.hour === l.hour);
  const next = snap.hourly.filter((h) => h.hour > l.hour).slice(0, 3);
  const bestNext = useMemo(() => [...snap.hourly.filter((h) => h.hour > l.hour)].sort((a, b) => a.forecast - b.forecast)[0], [snap.hourly, l.hour]);
  const avgStay = 68;

  return (
    <div className="grid gap-5">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.55fr)]">
        <Card className="flex flex-col">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[13px] font-medium text-muted">
              <span className="live-dot" /> Live · {clockSec(snap.now)}
            </div>
            <Badge tone={connected ? "brand" : "muted"}>
              {connected ? <Wifi className="size-3" /> : <WifiOff className="size-3" />}
              {connected ? "Streaming" : "Reconnecting"}
            </Badge>
          </div>
          <div className="flex flex-1 flex-col items-center justify-center gap-5 py-6 sm:flex-row sm:justify-around">
            <Ring value={snap.inside} max={snap.capacity} size={196} stroke={16} color={p > 0.85 ? "var(--bad)" : p > 0.65 ? "var(--warn)" : "var(--s1)"}>
              <div>
                <motion.div key={snap.inside} initial={{ y: 6, opacity: 0.4 }} animate={{ y: 0, opacity: 1 }} className="display num text-[56px] leading-none text-fg">
                  {snap.inside}
                </motion.div>
                <div className="mt-1 text-[13px] text-muted">of {snap.capacity} inside</div>
              </div>
            </Ring>
            <div className="grid w-full max-w-[220px] gap-3.5">
              <div>
                <Badge tone={label.tone} dot>
                  {label.text}
                </Badge>
                <div className="mt-1.5 text-[13px] text-muted">{Math.round(p * 100)}% of capacity</div>
              </div>
              <Mini icon={<LogIn className="size-3.5" />} label="Check-ins today" value={snap.entriesToday.toLocaleString("en-IN")} />
              <Mini icon={<TrendingUp className="size-3.5" />} label="Peak today" value={`${snap.peakToday.count} · ${clock(snap.peakToday.at)}`} />
              <Mini icon={<Users className="size-3.5" />} label="Trainers on floor" value={String(snap.trainersOnFloor)} />
              <Mini icon={<Clock className="size-3.5" />} label="Avg. stay" value={`${avgStay} min`} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 border-t border-line pt-4">
            {next.map((h) => (
              <div key={h.hour} className="text-center">
                <div className="text-[11.5px] text-muted">{hourLabel(h.hour)}</div>
                <div className="num mt-0.5 text-[17px] font-semibold text-fg">~{h.forecast}</div>
                <div className={cn("text-[11px]", crowdLabel(h.forecast / snap.capacity).tone === "bad" ? "text-bad" : crowdLabel(h.forecast / snap.capacity).tone === "warn" ? "text-warn" : "text-ok")}>{crowdLabel(h.forecast / snap.capacity).text}</div>
              </div>
            ))}
            {next.length === 0 && <div className="col-span-3 text-center text-[13px] text-muted">Closing for the day</div>}
          </div>
        </Card>

        <Card title="Floor map" subtitle="Zone density from turnstile + zone presence" action={bestNext ? <Badge tone="info">Quietest next: {hourLabel(bestNext.hour)}</Badge> : null}>
          <FloorPlan snap={snap} />
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {snap.zones.map((z) => (
              <div key={z.id} className="min-w-0">
                <div className="mb-1.5 flex items-baseline justify-between text-[12.5px]">
                  <span className="truncate font-medium text-fg-2">{z.name}</span>
                  <span className="num text-muted">{Math.round((z.count / z.capacity) * 100)}%</span>
                </div>
                <Meter value={z.count / z.capacity} />
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card title="Today, hour by hour" subtitle="Peak occupancy each hour vs. the 1G forecast" action={<Legend items={[{ label: "Actual", color: "var(--s1)" }, { label: "Forecast", color: "var(--muted)", dashed: true }]} />}>
        <AreaChart data={snap.hourly.map((h) => ({ label: hourLabel(h.hour), actual: h.count, forecast: h.forecast }))} capacity={snap.capacity} nowIndex={nowIdx} height={240} />
      </Card>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Card title="Biometric stream" subtitle="Every punch, as it happens" pad={false} action={<span className="pr-5 text-[12px] text-muted md:pr-6">{snap.events.length} recent</span>}>
          <div className="max-h-[600px] overflow-y-auto px-5 pb-3 md:px-6">
            <AnimatePresence initial={false}>
              {snap.events.slice(0, 30).map((e) => {
                const M = METHOD_ICON[e.method];
                const dev = snap.devices.find((d) => d.id === e.deviceId);
                return (
                  <motion.div key={e.id} layout initial={{ opacity: 0, y: -8, backgroundColor: "var(--brand-soft)" }} animate={{ opacity: 1, y: 0, backgroundColor: "rgba(0,0,0,0)" }} transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }} className="flex items-center gap-3 border-b border-line py-2.5 last:border-0">
                    {e.verified ? <Avatar name={e.name} size={30} /> : <span className="grid size-[30px] shrink-0 place-items-center rounded-full bg-bad-soft text-bad"><ShieldAlert className="size-4" /></span>}
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13.5px] font-medium text-fg">
                        {e.name}
                        {e.personType === "trainer" && <span className="ml-1.5 text-[11.5px] font-normal text-s1">Trainer</span>}
                      </div>
                      <div className="truncate text-[12px] text-muted">{e.note ?? `${dev?.name ?? "Terminal"} · ${e.method}`}</div>
                    </div>
                    <M className="size-4 shrink-0 text-faint" />
                    <Badge tone={!e.verified ? "bad" : e.direction === "in" ? "ok" : "muted"}>
                      {e.direction === "in" ? <LogIn className="size-3" /> : <LogOut className="size-3" />}
                      {!e.verified ? "Denied" : e.direction === "in" ? "In" : "Out"}
                    </Badge>
                    <span className="num w-[62px] shrink-0 text-right text-[12px] text-muted">{clockSec(e.ts)}</span>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </Card>

        <div className="grid content-start gap-5">
          <Card title="Trainer availability" subtitle="From staff punches + today's bookings">
            <div className="grid gap-1">
              {snap.trainers
                .filter((t) => t.onFloor)
                .sort((a, b) => (a.nextFree ?? 99) - (b.nextFree ?? 99))
                .map((t) => {
                  const freeNow = t.nextFree != null && t.nextFree <= l.h + 0.01;
                  return (
                    <div key={t.id} className="flex items-center gap-3 py-1.5">
                      <Avatar name={t.name} hue={t.hue} size={30} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13.5px] font-medium text-fg">{t.name}</div>
                        <div className="truncate text-[12px] text-muted">{t.role}</div>
                      </div>
                      <Badge tone={freeNow ? "ok" : t.nextFree != null ? "warn" : "muted"} dot>
                        {freeNow ? "Free now" : t.nextFree != null ? `Free ${hourLabel(t.nextFree)}` : "Booked out"}
                      </Badge>
                    </div>
                  );
                })}
              {snap.trainers.filter((t) => t.onFloor).length === 0 && <div className="py-4 text-center text-[13px] text-muted">No trainers on the floor right now.</div>}
            </div>
          </Card>
          <Card title="Terminals" action={<Activity className="size-4 text-faint" />}>
            <div className="grid gap-2.5">
              {snap.devices.map((d) => (
                <div key={d.id} className="flex items-center gap-3">
                  <span className={cn("size-2 shrink-0 rounded-full", d.status === "online" ? "bg-ok" : "bg-bad")} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13.5px] text-fg">{d.name}</div>
                    <div className="truncate text-[11.5px] text-muted">{d.model}</div>
                  </div>
                  <span className="text-[12px] text-muted">{d.status === "online" ? "Online" : `Last seen ${ago(d.lastHeartbeat)}`}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-surface-3 px-4 py-3">
              <div className="min-w-0">
                <div className="text-[13px] font-medium text-fg">Floor simulator</div>
                <div className="text-[11.5px] text-muted">Demo traffic. Turn off once real terminals are connected.</div>
              </div>
              <button
                role="switch"
                aria-checked={snap.simulator}
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    await toggleSimulator(!snap.simulator);
                    toast(snap.simulator ? "Simulator paused" : "Simulator running");
                  })
                }
                className={cn("relative h-[31px] w-[51px] shrink-0 rounded-full transition-colors duration-300", snap.simulator ? "bg-ok" : "bg-line-strong")}
              >
                <span className={cn("absolute left-0 top-[2px] size-[27px] rounded-full bg-white shadow transition-transform duration-300 [transition-timing-function:var(--ease-spring)]", snap.simulator ? "translate-x-[22px]" : "translate-x-[2px]")} />
              </button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Mini({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="grid size-7 place-items-center rounded-full bg-surface-3 text-fg-2">{icon}</span>
      <div className="min-w-0">
        <div className="text-[11.5px] text-muted">{label}</div>
        <div className="num truncate text-[14px] font-semibold text-fg">{value}</div>
      </div>
    </div>
  );
}
