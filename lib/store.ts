import "server-only";
import { buildSeed, CONFIG, crowdCurve, ZONES, zoneWeights, type Seed } from "@/lib/data/seed";
import { local } from "@/lib/format";
import type { ActivityItem, BiometricEvent, Device, Direction, LiveSnapshot, Method } from "@/lib/types";

/**
 * In-process operational store.
 *
 * Everything lives behind this module so the persistence layer can be swapped
 * (Postgres / Supabase) without touching a single screen. The live floor is an
 * event-sourced projection: every biometric punch — from a real terminal via
 * ADMS/webhook or from the built-in simulator — goes through `applyEvent`.
 */

interface Presence {
  at: number;
  zone: string;
  type: "member" | "trainer" | "staff";
  stay: number; // planned minutes
}

interface LiveState {
  day: string;
  inside: Map<string, Presence>;
  events: BiometricEvent[];
  hourly: Record<number, number>;
  entriesToday: number;
  peak: { count: number; at: number };
  lastTick: number;
  simulator: boolean;
  seq: number;
}

interface Store extends Seed {
  live: LiveState;
  bootedAt: number;
  seq: number;
}

const g = globalThis as unknown as { __aathlytx_store?: Store };

function boot(): Store {
  const now = Date.now();
  const seed = buildSeed(now);
  const store: Store = {
    ...seed,
    bootedAt: now,
    seq: 100,
    live: {
      day: local(now).ymd,
      inside: new Map(),
      events: [],
      hourly: {},
      entriesToday: 0,
      peak: { count: 0, at: now },
      lastTick: now,
      simulator: process.env.FLOOR_SIMULATOR !== "off",
      seq: 1,
    },
  };
  baseline(store, now);
  return store;
}

export function db(): Store {
  if (!g.__aathlytx_store) g.__aathlytx_store = boot();
  return g.__aathlytx_store;
}

export function nextId(prefix: string) {
  const s = db();
  s.seq += 1;
  return `${prefix}${s.seq}`;
}

export function log(kind: ActivityItem["kind"], text: string) {
  const s = db();
  s.activity.unshift({ id: nextId("a"), ts: new Date().toISOString(), kind, text });
  s.activity.length = Math.min(s.activity.length, 80);
}

/* ── Simulation helpers ─────────────────────────────────────────────────── */

const TEN_S = 10_000;

function wobble(t: number) {
  // smooth, deterministic noise in roughly ±8%
  const m = t / 60000;
  return 1 + 0.05 * Math.sin(m / 7.3) + 0.03 * Math.sin(m / 2.1 + 1.7);
}

function targetFor(t: number) {
  const l = local(t);
  return crowdCurve(l.h, l.dow) * CONFIG.capacity * wobble(t);
}

function pickZone(h: number) {
  const w = zoneWeights(h);
  let x = Math.random();
  for (const [k, v] of Object.entries(w)) {
    x -= v;
    if (x <= 0) return k;
  }
  return "strength";
}

/** Fill today's history and the current floor so the first screen is alive. */
function baseline(s: Store, now: number) {
  const l = local(now);
  const live = s.live;
  live.inside.clear();
  live.events = [];
  live.hourly = {};
  live.entriesToday = 0;
  let peak = { count: 0, at: now };
  for (let h = CONFIG.open; h <= Math.min(l.hour, CONFIG.close - 1); h++) {
    const sampleH = h === l.hour ? l.h : h + 0.5;
    const c = Math.round(crowdCurve(sampleH, l.dow) * CONFIG.capacity * (0.94 + Math.random() * 0.1));
    live.hourly[h] = c;
    live.entriesToday += Math.round(c * (60 / 70) * 1.05);
    if (c > peak.count) peak = { count: c, at: now - (l.h - (h + 0.5)) * 3600000 };
  }
  live.peak = peak;

  const target = Math.round(targetFor(now));
  const pool = s.members.filter((m) => m.status !== "expired" && m.status !== "frozen");
  for (let i = 0; i < target && pool.length; i++) {
    const m = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
    const minsIn = Math.random() * m.avgSessionMin;
    live.inside.set(m.id, { at: now - minsIn * 60000, zone: pickZone(l.h), type: "member", stay: m.avgSessionMin });
  }
  // trainers on shift are on the floor
  for (const t of s.trainers) {
    if (!t.onLeave && l.h >= t.shift.start && l.h < t.shift.end) {
      t.onFloor = true;
      t.lastPunch = new Date(now - (l.h - t.shift.start) * 3600000).toISOString();
      live.inside.set(t.id, { at: new Date(t.lastPunch).getTime(), zone: "strength", type: "trainer", stay: 0 });
    } else {
      t.onFloor = false;
    }
  }
  // a short believable recent log
  const recent = [...live.inside.entries()].filter(([, p]) => p.type === "member").sort((a, b) => b[1].at - a[1].at).slice(0, 24);
  for (const [id, p] of recent.reverse()) {
    const m = s.members.find((x) => x.id === id)!;
    pushEvent(s, { ts: p.at, deviceId: "d1", personId: id, personType: "member", name: m.name, direction: "in", method: methodFor(), verified: true });
  }
  live.lastTick = now;
  live.day = l.ymd;
}

function methodFor(): Method {
  const x = Math.random();
  return x < 0.72 ? "face" : x < 0.9 ? "finger" : x < 0.96 ? "palm" : "card";
}

function pushEvent(s: Store, e: Omit<BiometricEvent, "id" | "ts"> & { ts: number }) {
  const ev: BiometricEvent = { ...e, id: `ev${s.live.seq++}`, ts: new Date(e.ts).toISOString() };
  s.live.events.unshift(ev);
  if (s.live.events.length > 300) s.live.events.length = 300;
  return ev;
}

function step(s: Store, t: number) {
  const live = s.live;
  const l = local(t);
  const target = targetFor(t);
  const members = [...live.inside.entries()].filter(([, p]) => p.type === "member");
  const n = members.length;

  // exits — those past their planned stay are most likely to leave
  for (const [id, p] of members) {
    const mins = (t - p.at) / 60000;
    const over = mins / Math.max(30, p.stay);
    const pLeave = over > 1 ? 0.06 * over : 0.002;
    const closing = l.h >= CONFIG.close - 0.15;
    if (Math.random() < (closing ? 0.35 : pLeave)) {
      live.inside.delete(id);
      const m = s.members.find((x) => x.id === id)!;
      m.lastVisit = new Date(t).toISOString();
      pushEvent(s, { ts: t, deviceId: "d2", personId: id, personType: "member", name: m.name, direction: "out", method: methodFor(), verified: true });
    } else if (Math.random() < 0.01) {
      p.zone = pickZone(l.h);
    }
  }

  // arrivals — pull the count toward the expected curve
  if (l.h >= CONFIG.open && l.h < CONFIG.close - 0.25) {
    const gap = target - n;
    const base = target / 70 / 6; // ~steady-state turnover per 10s
    const lambda = Math.max(0, base + gap * 0.04);
    let arrivals = Math.floor(lambda) + (Math.random() < lambda % 1 ? 1 : 0);
    while (arrivals-- > 0) {
      // members whose habit hour is near now are more likely
      let m = s.members[Math.floor(Math.random() * s.members.length)];
      for (let tries = 0; tries < 6 && (live.inside.has(m.id) || Math.abs(m.habitHour - l.h) > 2.2); tries++) {
        m = s.members[Math.floor(Math.random() * s.members.length)];
      }
      if (live.inside.has(m.id)) continue;
      const deviceId = m.gender === "F" && Math.random() < 0.15 ? "d4" : "d1";
      if (m.status === "expired" || m.status === "frozen") {
        if (Math.random() < 0.25) {
          pushEvent(s, { ts: t, deviceId: "d1", personId: m.id, personType: "member", name: m.name, direction: "in", method: methodFor(), verified: false, note: m.status === "expired" ? "Membership expired — gate held" : "Membership frozen" });
        }
        continue;
      }
      live.inside.set(m.id, { at: t, zone: pickZone(l.h), type: "member", stay: m.avgSessionMin * (0.8 + Math.random() * 0.4) });
      live.entriesToday += 1;
      m.lastVisit = new Date(t).toISOString();
      pushEvent(s, { ts: t, deviceId: s.devices.find((d) => d.id === deviceId)?.status === "online" ? deviceId : "d1", personId: m.id, personType: "member", name: m.name, direction: "in", method: methodFor(), verified: true });
    }
    // the odd unknown face
    if (Math.random() < 0.003) {
      pushEvent(s, { ts: t, deviceId: "d1", personId: "?", personType: "unknown", name: "Unregistered face", direction: "in", method: "face", verified: false, note: "No matching template" });
    }
  }

  // trainers punch by shift
  for (const tr of s.trainers) {
    const should = !tr.onLeave && l.h >= tr.shift.start && l.h < tr.shift.end;
    if (should !== tr.onFloor) {
      tr.onFloor = should;
      tr.lastPunch = new Date(t).toISOString();
      if (should) live.inside.set(tr.id, { at: t, zone: "strength", type: "trainer", stay: 0 });
      else live.inside.delete(tr.id);
      pushEvent(s, { ts: t, deviceId: "d3", personId: tr.id, personType: "trainer", name: tr.name, direction: should ? "in" : "out", method: "finger", verified: true });
    }
  }

  const count = [...live.inside.values()].filter((p) => p.type === "member").length;
  live.hourly[l.hour] = Math.max(live.hourly[l.hour] ?? 0, count);
  if (count > live.peak.count) live.peak = { count, at: t };
}

/** Bring the live floor up to `now`. Cheap; safe to call on every request. */
export function advance(now = Date.now()) {
  const s = db();
  const live = s.live;
  const today = local(now).ymd;
  if (today !== live.day) {
    baseline(s, now);
    return s;
  }
  for (const d of s.devices) if (d.status === "online" && d.source === "simulator") d.lastHeartbeat = new Date(now).toISOString();
  if (!live.simulator) {
    live.lastTick = now;
    return s;
  }
  const gap = now - live.lastTick;
  if (gap > 90 * 60000) {
    baseline(s, now);
    return s;
  }
  let t = live.lastTick + TEN_S;
  while (t <= now) {
    step(s, t);
    t += TEN_S;
  }
  live.lastTick = t - TEN_S;
  return s;
}

/* ── External biometric ingestion ───────────────────────────────────────── */

export interface IngestInput {
  /** user id enrolled on the terminal (PIN) */
  userId: string;
  ts?: string | number;
  deviceSerial?: string;
  /** 0/"in" check-in, 1/"out" check-out; omitted → inferred from device / presence */
  direction?: Direction;
  method?: Method;
}

export function ingest(input: IngestInput, source: Device["source"]) {
  const s = advance();
  const t = input.ts ? new Date(input.ts).getTime() : Date.now();
  let device = s.devices.find((d) => d.serial === input.deviceSerial);
  if (!device && input.deviceSerial) {
    device = {
      id: nextId("d"),
      name: `Terminal ${input.deviceSerial.slice(-4)}`,
      model: "Auto-registered",
      serial: input.deviceSerial,
      location: "Unassigned",
      kind: "entry",
      ip: "—",
      status: "online",
      lastHeartbeat: new Date().toISOString(),
      templates: 0,
      firmware: "—",
      source,
    };
    s.devices.push(device);
    log("device", `New terminal ${input.deviceSerial} registered itself`);
  }
  if (device) {
    device.status = "online";
    device.lastHeartbeat = new Date().toISOString();
    device.source = source;
  }
  const member = s.members.find((m) => m.biometricId === input.userId);
  const trainer = s.trainers.find((x) => x.biometricId === input.userId);
  const personId = member?.id ?? trainer?.id ?? `u${input.userId}`;
  const inside = s.live.inside.has(personId);
  const direction: Direction = input.direction ?? (device?.kind === "exit" ? "out" : device?.kind === "entry" ? "in" : inside ? "out" : "in");
  const blocked = member && (member.status === "expired" || member.status === "frozen") && direction === "in";

  if (!blocked) {
    if (direction === "in") {
      s.live.inside.set(personId, { at: t, zone: pickZone(local(t).h), type: trainer ? "trainer" : "member", stay: member?.avgSessionMin ?? 60 });
      if (member) {
        s.live.entriesToday += 1;
        member.lastVisit = new Date(t).toISOString();
      }
      if (trainer) {
        trainer.onFloor = true;
        trainer.lastPunch = new Date(t).toISOString();
      }
    } else {
      s.live.inside.delete(personId);
      if (trainer) {
        trainer.onFloor = false;
        trainer.lastPunch = new Date(t).toISOString();
      }
    }
  }
  const count = [...s.live.inside.values()].filter((p) => p.type === "member").length;
  const h = local(t).hour;
  s.live.hourly[h] = Math.max(s.live.hourly[h] ?? 0, count);
  if (count > s.live.peak.count) s.live.peak = { count, at: t };

  return pushEvent(s, {
    ts: t,
    deviceId: device?.id ?? "api",
    personId,
    personType: member ? "member" : trainer ? "trainer" : "unknown",
    name: member?.name ?? trainer?.name ?? `User ${input.userId}`,
    direction,
    method: input.method ?? "face",
    verified: !!(member || trainer) && !blocked,
    note: blocked ? `Membership ${member!.status} — gate held` : !(member || trainer) ? "Not enrolled in Aathlytx" : undefined,
  });
}

export function heartbeat(serial: string) {
  const s = db();
  const d = s.devices.find((x) => x.serial === serial);
  if (d) {
    d.status = "online";
    d.lastHeartbeat = new Date().toISOString();
  }
}

export function setSimulator(on: boolean) {
  const s = db();
  s.live.simulator = on;
  s.live.lastTick = Date.now();
}

/* ── Snapshot for the live floor ────────────────────────────────────────── */

export function snapshot(now = Date.now()): LiveSnapshot {
  const s = advance(now);
  const l = local(now);
  const live = s.live;
  const presences = [...live.inside.values()];
  const membersIn = presences.filter((p) => p.type === "member");
  const zones = ZONES.map((z) => ({ id: z.id, name: z.name, capacity: z.capacity, count: membersIn.filter((p) => p.zone === z.id).length }));
  const hourly = [];
  for (let h = CONFIG.open; h < CONFIG.close; h++) {
    hourly.push({
      hour: h,
      count: h <= l.hour ? (live.hourly[h] ?? null) : null,
      forecast: Math.round(crowdCurve(h + 0.5, l.dow) * CONFIG.capacity),
    });
  }
  const trainers = s.trainers.map((t) => {
    const todays = s.sessions.filter((x) => x.trainerId === t.id).sort((a, b) => a.start - b.start);
    const current = todays.find((x) => l.h >= x.start && l.h < x.start + x.minutes / 60);
    let nextFree: number | null = null;
    if (t.onFloor) {
      if (!current) nextFree = l.h;
      else {
        let end = current.start + current.minutes / 60;
        for (const x of todays) if (Math.abs(x.start - end) < 0.01) end = x.start + x.minutes / 60;
        nextFree = end < t.shift.end ? end : null;
      }
    }
    return { id: t.id, name: t.name, onFloor: t.onFloor, busyUntil: current ? current.start + current.minutes / 60 : null, nextFree, hue: t.hue, role: t.role };
  });

  return {
    now: new Date(now).toISOString(),
    inside: membersIn.length,
    capacity: CONFIG.capacity,
    members: membersIn.length,
    trainersOnFloor: presences.filter((p) => p.type === "trainer").length,
    staffOnFloor: 3,
    entriesToday: live.entriesToday,
    peakToday: { count: live.peak.count, at: new Date(live.peak.at).toISOString() },
    zones,
    hourly,
    events: live.events.slice(0, 40),
    devices: s.devices,
    trainers,
    simulator: live.simulator,
  };
}
