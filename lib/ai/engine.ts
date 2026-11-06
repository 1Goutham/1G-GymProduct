import "server-only";
import { db, snapshot } from "@/lib/store";
import { CONFIG, crowdCurve } from "@/lib/data/seed";
import { equipmentView, financeSummary, inventoryView, memberStats, poTotal } from "@/lib/derive";
import { hourLabel, inr, inrShort, local, pct } from "@/lib/format";

export type InsightArea = "crowd" | "equipment" | "members" | "finance" | "inventory" | "trainers" | "devices";

export interface Insight {
  id: string;
  area: InsightArea;
  tone: "critical" | "warning" | "opportunity" | "info";
  title: string;
  detail: string;
  metric?: string;
  action?: { label: string; href: string };
}

/**
 * The 1G operations brain. Deterministic, explainable rules over live data —
 * every insight carries the evidence it was built from. The LLM copilot
 * receives this same picture as context, so the two never disagree.
 */
export function insights(now = Date.now()): Insight[] {
  const s = db();
  const live = snapshot(now);
  const l = local(now);
  const out: Insight[] = [];

  // Crowd — next peak
  let peakH = -1;
  let peakV = 0;
  for (let h = Math.ceil(l.h); h < CONFIG.close; h++) {
    const v = crowdCurve(h + 0.5, l.dow) * CONFIG.capacity;
    if (v > peakV) {
      peakV = v;
      peakH = h;
    }
  }
  if (peakH >= 0 && peakV / CONFIG.capacity > 0.7) {
    const trainersThen = s.trainers.filter((t) => peakH >= t.shift.start && peakH < t.shift.end).length;
    const ratio = Math.round(peakV / Math.max(1, trainersThen));
    out.push({
      id: "crowd-peak",
      area: "crowd",
      tone: ratio > 22 ? "warning" : "info",
      title: `Peak of ~${Math.round(peakV)} expected at ${hourLabel(peakH)}`,
      detail: `${pct(peakV / CONFIG.capacity)} of capacity with ${trainersThen} trainers on shift — 1 trainer per ${ratio} members.${ratio > 22 ? " Pull a floor trainer's break earlier or open the functional turf as overflow." : ""}`,
      metric: `${Math.round((peakV / CONFIG.capacity) * 100)}%`,
      action: { label: "Open live floor", href: "/live" },
    });
  }
  const busiestZone = [...live.zones].sort((a, b) => b.count / b.capacity - a.count / a.capacity)[0];
  if (busiestZone && busiestZone.count / busiestZone.capacity > 0.85) {
    out.push({
      id: "zone-hot",
      area: "crowd",
      tone: "warning",
      title: `${busiestZone.name} is at ${pct(busiestZone.count / busiestZone.capacity)}`,
      detail: `${busiestZone.count} people for ${busiestZone.capacity} stations. Nudge waiting members toward quieter zones.`,
      action: { label: "See zones", href: "/live" },
    });
  }

  // Equipment
  const eq = equipmentView(now);
  const risky = eq.filter((e) => e.status !== "down" && e.risk14 >= 0.5).sort((a, b) => b.risk14 - a.risk14);
  for (const e of risky.slice(0, 2)) {
    out.push({
      id: `eq-${e.id}`,
      area: "equipment",
      tone: e.risk14 > 0.7 ? "critical" : "warning",
      title: `${e.name} — ${pct(e.risk14)} breakdown risk in 14 days`,
      detail: `${e.reason}. A preventive visit now costs ~${inr(2500)}; a breakdown averages ${inr(14000)} plus downtime.`,
      metric: pct(e.risk14),
      action: { label: "Schedule service", href: `/equipment?focus=${e.id}` },
    });
  }
  const down = eq.filter((e) => e.status === "down");
  if (down.length) {
    out.push({
      id: "eq-down",
      area: "equipment",
      tone: "critical",
      title: `${down.length} machine${down.length > 1 ? "s" : ""} out of service`,
      detail: down.map((e) => e.name).join(", ") + ". Cardio deck capacity reduced during the evening peak.",
      action: { label: "View tickets", href: "/service" },
    });
  }

  // Members
  const ms = memberStats(now);
  const highRisk = ms.atRisk.filter((m) => m.churnRisk >= 0.75);
  if (highRisk.length) {
    const value = highRisk.length * 2499;
    out.push({
      id: "churn",
      area: "members",
      tone: "warning",
      title: `${highRisk.length} members likely to churn this month`,
      detail: `Visits dropped below once a week. A trainer check-in recovers roughly a third — about ${inrShort(value * 0.33)} in monthly revenue.`,
      metric: String(highRisk.length),
      action: { label: "Review at-risk list", href: "/members?filter=risk" },
    });
  }
  if (ms.expiring.length) {
    out.push({
      id: "renewals",
      area: "members",
      tone: "opportunity",
      title: `${ms.expiring.length} renewals due in the next 10 days`,
      detail: `Send a WhatsApp renewal link today; early-renewal offers convert 2× better than post-expiry follow-ups.`,
      action: { label: "Open renewals", href: "/members?filter=expiring" },
    });
  }

  // Inventory
  const low = inventoryView().filter((i) => i.low);
  if (low.length) {
    out.push({
      id: "restock",
      area: "inventory",
      tone: low.some((i) => i.stock === 0) ? "warning" : "info",
      title: `${low.length} items at or below reorder point`,
      detail: low
        .slice(0, 3)
        .map((i) => `${i.name} (${i.stock} left${i.daysLeft < 30 ? `, ~${i.daysLeft}d` : ""})`)
        .join(" · "),
      action: { label: "Draft purchase orders", href: "/procurement" },
    });
  }

  // Finance
  const fin = financeSummary();
  if (fin.overdue.length) {
    out.push({
      id: "overdue",
      area: "finance",
      tone: "warning",
      title: `${inrShort(fin.overdueTotal)} overdue across ${fin.overdue.length} invoices`,
      detail: `Collections are ${pct(fin.overdueTotal / Math.max(1, fin.curRev), 1)} of this month's revenue. Auto-reminders recover most within a week.`,
      action: { label: "Collect dues", href: "/finance" },
    });
  }
  const growth = fin.projected / fin.prevRev - 1;
  out.push({
    id: "rev-pace",
    area: "finance",
    tone: growth >= 0 ? "opportunity" : "warning",
    title: `On pace for ${inrShort(fin.projected)} this month`,
    detail: `${growth >= 0 ? "Up" : "Down"} ${pct(Math.abs(growth), 1)} on last month. Projected profit ${inrShort(fin.projectedProfit)}.`,
    action: { label: "Open finance", href: "/finance" },
  });

  // Devices
  const offline = s.devices.filter((d) => d.status === "offline" || Date.now() - new Date(d.lastHeartbeat).getTime() > 10 * 60000);
  if (offline.length) {
    out.push({
      id: "devices",
      area: "devices",
      tone: "warning",
      title: `${offline.map((d) => d.name).join(", ")} offline`,
      detail: "Check-ins through this terminal aren't reaching the live count. Power-cycle it or check the PoE switch.",
      action: { label: "Devices", href: "/devices" },
    });
  }

  // Trainers — utilisation
  const trainerLoad = s.trainers.map((t) => {
    const mins = s.sessions.filter((x) => x.trainerId === t.id).reduce((a, x) => a + x.minutes, 0);
    return { t, util: mins / ((t.shift.end - t.shift.start) * 60) };
  });
  const idle = trainerLoad.filter((x) => x.util < 0.35);
  if (idle.length) {
    out.push({
      id: "trainers-idle",
      area: "trainers",
      tone: "opportunity",
      title: `${idle.length} trainers under 35% booked today`,
      detail: `${idle.map((x) => x.t.name.split(" ")[0]).join(", ")} have open slots — offer free assessments to at-risk members.`,
      action: { label: "Trainer schedule", href: "/trainers" },
    });
  }

  const order = { critical: 0, warning: 1, opportunity: 2, info: 3 };
  return out.sort((a, b) => order[a.tone] - order[b.tone]);
}

/** A compact, factual picture of the business for the LLM. */
export function businessContext(now = Date.now()) {
  const s = db();
  const live = snapshot(now);
  const eq = equipmentView(now);
  const fin = financeSummary();
  const ms = memberStats(now);
  const inv = inventoryView();
  const l = local(now);
  return {
    gym: `${CONFIG.name}, ${CONFIG.branch}, ${CONFIG.city}`,
    localTime: `${hourLabel(l.h)} (${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][l.dow]})`,
    hours: `${hourLabel(CONFIG.open)}–${hourLabel(CONFIG.close)}`,
    live: {
      inside: live.inside,
      capacity: live.capacity,
      entriesToday: live.entriesToday,
      peakToday: live.peakToday.count,
      zones: live.zones.map((z) => `${z.name}: ${z.count}/${z.capacity}`),
      forecastNextHours: live.hourly.filter((h) => h.hour > l.hour).slice(0, 6).map((h) => `${hourLabel(h.hour)} ~${h.forecast}`),
      trainersOnFloor: live.trainers.filter((t) => t.onFloor).map((t) => `${t.name}${t.nextFree != null ? ` (free ${t.nextFree <= l.h ? "now" : "at " + hourLabel(t.nextFree)})` : " (booked)"}`),
      devicesOffline: s.devices.filter((d) => d.status === "offline").map((d) => d.name),
    },
    members: {
      total: ms.total,
      active: ms.active,
      expiringIn10Days: ms.expiring.length,
      expired: ms.expired.length,
      highChurnRisk: ms.atRisk.length,
      newLast30Days: ms.newThisMonth.length,
      avgVisitsPer30Days: Math.round(ms.avgVisits * 10) / 10,
      planMix: ms.planMix.map((p) => `${p.name}: ${p.count}`),
    },
    trainers: s.trainers.map((t) => ({
      name: t.name,
      role: t.role,
      shift: `${hourLabel(t.shift.start)}–${hourLabel(t.shift.end)}`,
      rating: t.rating,
      sessionsToday: s.sessions.filter((x) => x.trainerId === t.id).length,
    })),
    equipment: {
      total: eq.length,
      down: eq.filter((e) => e.status === "down").map((e) => e.name),
      attention: eq.filter((e) => e.status === "attention").map((e) => e.name),
      highestRisk: [...eq].sort((a, b) => b.risk14 - a.risk14).slice(0, 6).map((e) => `${e.name}: health ${e.health}, risk ${pct(e.risk14)} — ${e.reason}`),
      openReports: s.faults.filter((f) => f.status !== "resolved").map((f) => `${eq.find((e) => e.id === f.equipmentId)?.name}: ${f.issue} (${f.severity})`),
      openServiceTickets: s.tickets.filter((t) => t.status !== "completed").map((t) => `${eq.find((e) => e.id === t.equipmentId)?.name}: ${t.type}, ${t.status}`),
    },
    procurement: {
      lowStock: inv.filter((i) => i.low).map((i) => `${i.name}: ${i.stock} left (reorder at ${i.reorderPoint})`),
      openPOs: s.orders.filter((o) => !["received", "rejected"].includes(o.status)).map((o) => `${o.id} ${o.title} — ${o.status}, ${inr(poTotal(o))}`),
    },
    finance: {
      thisMonthSoFar: inr(fin.curRev),
      projectedThisMonth: inr(fin.projected),
      lastMonth: inr(fin.prevRev),
      projectedProfit: inr(fin.projectedProfit),
      mrr: inr(fin.mrr),
      ttmMargin: pct(fin.margin, 1),
      overdue: `${inr(fin.overdueTotal)} across ${fin.overdue.length} invoices`,
      expenseBreakdownThisMonth: Object.entries(fin.cur.expenses).map(([k, v]) => `${k}: ${inr(v)}`),
    },
    insights: insights(now).map((i) => `[${i.tone}] ${i.title} — ${i.detail}`),
  };
}

/* ── Offline copilot ───────────────────────────────────────────────────────
 * Answers common operator questions straight from live data when no LLM key
 * is configured. Short, specific, actionable.
 * ──────────────────────────────────────────────────────────────────────── */
export function offlineAnswer(q: string, now = Date.now()): string {
  const text = q.toLowerCase();
  const c = businessContext(now);
  const has = (...w: string[]) => w.some((x) => text.includes(x));

  if (has("crowd", "busy", "count", "inside", "peak", "floor", "live")) {
    return [
      `**${c.live.inside} members on the floor** right now (${Math.round((c.live.inside / c.live.capacity) * 100)}% of ${c.live.capacity}). ${c.live.entriesToday} check-ins today, peak so far ${c.live.peakToday}.`,
      "",
      `**Zones** — ${c.live.zones.join(" · ")}`,
      `**Next hours** — ${c.live.forecastNextHours.join(" · ") || "closing soon"}`,
    ].join("\n");
  }
  if (has("trainer", "coach", "available", "free", "pt")) {
    return [`**Trainers on the floor**`, ...c.live.trainersOnFloor.map((t) => `- ${t}`), "", `Book a free slot from **Trainers → Today**.`].join("\n");
  }
  if (has("equipment", "machine", "treadmill", "broken", "service", "maintenance", "repair")) {
    return [
      `**${c.equipment.down.length} down**${c.equipment.down.length ? ` (${c.equipment.down.join(", ")})` : ""}, ${c.equipment.attention.length} need attention.`,
      "",
      `**Highest breakdown risk**`,
      ...c.equipment.highestRisk.slice(0, 4).map((e) => `- ${e}`),
      "",
      `Schedule preventive visits for anything above 50% — it's ~6× cheaper than a breakdown.`,
    ].join("\n");
  }
  if (has("stock", "inventory", "purchase", "order", "buy", "procure", "restock")) {
    return [`**Low stock**`, ...c.procurement.lowStock.map((x) => `- ${x}`), "", `**Open POs**`, ...c.procurement.openPOs.map((x) => `- ${x}`), "", `Use **Procurement → Auto-draft** to turn the low-stock list into POs.`].join("\n");
  }
  if (has("revenue", "money", "finance", "profit", "income", "expense", "cost", "due", "overdue", "cash")) {
    return [
      `**This month** ${c.finance.thisMonthSoFar} so far, projected **${c.finance.projectedThisMonth}** (last month ${c.finance.lastMonth}).`,
      `Projected profit ${c.finance.projectedProfit} · MRR ${c.finance.mrr} · TTM margin ${c.finance.ttmMargin}.`,
      `Overdue: ${c.finance.overdue}.`,
    ].join("\n");
  }
  if (has("member", "churn", "renew", "retention", "expire")) {
    return [
      `**${c.members.active} active members**, ${c.members.newLast30Days} joined in the last 30 days.`,
      `${c.members.expiringIn10Days} renewals due in 10 days · ${c.members.highChurnRisk} at high churn risk · avg ${c.members.avgVisitsPer30Days} visits / 30 days.`,
      "",
      `Start with the at-risk list: a personal trainer message within 48h of a missed week is the strongest save.`,
    ].join("\n");
  }
  return [`Here's what needs you today:`, ...c.insights.slice(0, 5).map((i) => `- ${i}`)].join("\n");
}
