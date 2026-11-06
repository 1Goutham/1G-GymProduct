"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db, log, nextId, setSimulator } from "@/lib/store";
import { inventoryView, equipmentView } from "@/lib/derive";
import type { POStatus, Severity, TicketStatus } from "@/lib/types";

const DAY = 86400000;

function refresh(...paths: string[]) {
  for (const p of ["/", ...paths]) revalidatePath(p);
}

/* ── Equipment & service ────────────────────────────────────────────────── */

const FaultInput = z.object({
  equipmentId: z.string().min(1),
  issue: z.string().trim().min(4).max(500),
  severity: z.enum(["low", "medium", "high"]),
  reportedBy: z.string().trim().min(1).max(80),
  role: z.enum(["member", "trainer", "staff"]),
});

export async function reportFault(input: z.input<typeof FaultInput>) {
  const v = FaultInput.parse(input);
  const s = db();
  const eq = s.equipment.find((e) => e.id === v.equipmentId);
  if (!eq) throw new Error("Unknown equipment");
  const id = nextId("f");
  s.faults.unshift({ id, ...v, severity: v.severity as Severity, createdAt: new Date().toISOString(), status: "open", ticketId: null });
  if (v.severity === "high") eq.status = "down";
  else if (eq.status === "operational") eq.status = "attention";
  log("equipment", `${v.reportedBy} reported ${eq.name}: ${v.issue.slice(0, 60)}`);
  refresh("/equipment", "/service");
  return { id, name: eq.name };
}

const TicketInput = z.object({
  equipmentId: z.string(),
  faultId: z.string().optional(),
  type: z.enum(["preventive", "breakdown", "amc"]),
  vendorId: z.string(),
  inDays: z.number().min(0).max(60),
  notes: z.string().max(400).optional(),
});

export async function createTicket(input: z.input<typeof TicketInput>) {
  const v = TicketInput.parse(input);
  const s = db();
  const eq = s.equipment.find((e) => e.id === v.equipmentId);
  if (!eq) throw new Error("Unknown equipment");
  const id = nextId("st");
  s.tickets.unshift({
    id,
    equipmentId: v.equipmentId,
    vendorId: v.vendorId,
    type: v.type,
    status: "scheduled",
    opened: new Date().toISOString(),
    scheduledFor: new Date(Date.now() + v.inDays * DAY).toISOString(),
    closed: null,
    cost: v.type === "breakdown" ? 6000 : v.type === "amc" ? 0 : 2500,
    notes: v.notes || (v.type === "preventive" ? "Preventive service booked by 1G health model." : "Service requested."),
    slaHours: v.type === "breakdown" ? 48 : 96,
  });
  const faults = s.faults.filter((f) => f.equipmentId === v.equipmentId && f.status === "open" && (!v.faultId || f.id === v.faultId));
  for (const f of faults) {
    f.status = "in-service";
    f.ticketId = id;
  }
  const vendor = s.vendors.find((x) => x.id === v.vendorId);
  log("service", `Service ticket for ${eq.name} sent to ${vendor?.name ?? "vendor"}`);
  refresh("/equipment", "/service");
  return { id };
}

export async function setTicketStatus(id: string, status: TicketStatus) {
  const s = db();
  const t = s.tickets.find((x) => x.id === id);
  if (!t) throw new Error("Unknown ticket");
  t.status = status;
  const eq = s.equipment.find((e) => e.id === t.equipmentId);
  if (status === "completed") {
    t.closed = new Date().toISOString();
    if (eq) {
      eq.hoursSinceService = 0;
      eq.lastService = t.closed;
      eq.status = "operational";
    }
    for (const f of s.faults.filter((f) => f.ticketId === id)) f.status = "resolved";
    // book the cost
    const cur = s.finance[s.finance.length - 1];
    cur.expenses.maintenance += t.cost;
    log("service", `${eq?.name ?? "Equipment"} serviced and back in operation`);
  }
  refresh("/equipment", "/service", "/finance");
}

/** Book preventive visits for everything the health model flags above 50% risk. */
export async function autoScheduleService() {
  const s = db();
  const risky = equipmentView().filter((e) => e.status !== "down" && e.risk14 >= 0.5 && !s.tickets.some((t) => t.equipmentId === e.id && t.status !== "completed"));
  for (const e of risky) {
    s.tickets.unshift({
      id: nextId("st"),
      equipmentId: e.id,
      vendorId: e.vendorId,
      type: "preventive",
      status: "scheduled",
      opened: new Date().toISOString(),
      scheduledFor: new Date(Date.now() + 2 * DAY).toISOString(),
      closed: null,
      cost: 2500,
      notes: `Auto-booked by 1G AI: ${e.reason}.`,
      slaHours: 96,
    });
  }
  if (risky.length) log("ai", `1G AI booked ${risky.length} preventive service visits`);
  refresh("/equipment", "/service");
  return { count: risky.length };
}

/* ── Procurement ────────────────────────────────────────────────────────── */

const POInput = z.object({
  title: z.string().trim().min(3).max(120),
  vendorId: z.string(),
  lines: z.array(z.object({ name: z.string().trim().min(1), qty: z.number().int().min(1).max(10000), unitCost: z.number().min(0) })).min(1).max(30),
  reason: z.string().trim().max(300).default(""),
  requestedBy: z.string().trim().min(1).max(80).default("Owner"),
  source: z.enum(["manual", "ai"]).default("manual"),
});

export async function createPO(input: z.input<typeof POInput>) {
  const v = POInput.parse(input);
  const s = db();
  const n = Math.max(...s.orders.map((o) => Number(o.id.split("-")[1]) || 1000)) + 1;
  const id = `PO-${n}`;
  s.orders.unshift({ id, ...v, status: "pending", createdAt: new Date().toISOString(), expected: null });
  log("purchase", `${v.requestedBy} raised ${id} — ${v.title}`);
  refresh("/procurement");
  return { id };
}

export async function setPOStatus(id: string, status: POStatus) {
  const s = db();
  const po = s.orders.find((o) => o.id === id);
  if (!po) throw new Error("Unknown PO");
  po.status = status;
  const vendor = s.vendors.find((v) => v.id === po.vendorId);
  if (status === "ordered") po.expected = new Date(Date.now() + (vendor?.leadDays ?? 5) * DAY).toISOString();
  if (status === "received") {
    for (const line of po.lines) {
      const item = s.inventory.find((i) => i.name === line.name);
      if (item) item.stock += line.qty;
    }
    const cur = s.finance[s.finance.length - 1];
    cur.expenses.procurement += po.lines.reduce((a, l) => a + l.qty * l.unitCost, 0);
  }
  log("purchase", `${id} ${status}`);
  refresh("/procurement", "/finance");
}

/** Turn every low-stock item into vendor-grouped draft POs. */
export async function autoDraftPOs() {
  const s = db();
  const low = inventoryView().filter((i) => i.low && !s.orders.some((o) => ["pending", "approved", "ordered"].includes(o.status) && o.lines.some((l) => l.name === i.name)));
  const byVendor = new Map<string, typeof low>();
  for (const i of low) byVendor.set(i.vendorId, [...(byVendor.get(i.vendorId) ?? []), i]);
  const ids: string[] = [];
  for (const [vendorId, items] of byVendor) {
    const vendor = s.vendors.find((v) => v.id === vendorId)!;
    const r = await createPO({
      title: `Restock — ${vendor.category.split(" ")[0].toLowerCase()}`,
      vendorId,
      lines: items.map((i) => ({ name: i.name, qty: i.suggestQty, unitCost: i.unitCost })),
      reason: `1G AI: ${items.length} item${items.length > 1 ? "s" : ""} at or below reorder point. Quantities cover ~6 weeks of usage.`,
      requestedBy: "1G AI",
      source: "ai",
    });
    ids.push(r.id);
  }
  return { ids };
}

/* ── Finance ────────────────────────────────────────────────────────────── */

export async function markInvoicePaid(id: string) {
  const s = db();
  const inv = s.invoices.find((i) => i.id === id);
  if (!inv || inv.status === "paid") return;
  inv.status = "paid";
  const m = s.members.find((x) => x.id === inv.memberId);
  if (m) m.balanceDue = 0;
  s.finance[s.finance.length - 1].revenue.memberships += inv.amount;
  s.transactions.unshift({ id: nextId("tx"), ts: new Date().toISOString(), kind: "in", label: inv.description, category: "Memberships", amount: inv.amount, method: "UPI" });
  log("finance", `${inv.id} paid — ${m?.name ?? ""}`);
  refresh("/finance", "/members");
}

export async function sendReminders(ids: string[]) {
  const s = db();
  const n = s.invoices.filter((i) => ids.includes(i.id) && i.status !== "paid").length;
  log("finance", `WhatsApp payment reminders sent to ${n} members`);
  refresh("/finance");
  return { n };
}

/* ── Members & trainers ─────────────────────────────────────────────────── */

export async function nudgeMembers(memberIds: string[], channel: "whatsapp" | "trainer") {
  const n = memberIds.length;
  log("member", channel === "whatsapp" ? `Renewal links sent to ${n} members on WhatsApp` : `${n} at-risk members assigned to trainers for a check-in`);
  refresh("/members");
  return { n };
}

const BookInput = z.object({ trainerId: z.string(), start: z.number().min(0).max(24), memberName: z.string().trim().min(1).max(80), minutes: z.number().int().min(15).max(120).default(60) });

export async function bookSession(input: z.input<typeof BookInput>) {
  const v = BookInput.parse(input);
  const s = db();
  const t = s.trainers.find((x) => x.id === v.trainerId);
  if (!t) throw new Error("Unknown trainer");
  const clash = s.sessions.some((x) => x.trainerId === v.trainerId && v.start < x.start + x.minutes / 60 && x.start < v.start + v.minutes / 60);
  if (clash) throw new Error("That slot overlaps an existing session");
  const m = s.members.find((x) => x.name.toLowerCase() === v.memberName.toLowerCase());
  s.sessions.push({ id: nextId("s"), trainerId: v.trainerId, title: `PT · ${v.memberName.split(" ")[0]}`, kind: "pt", start: v.start, minutes: v.minutes, memberId: m?.id ?? null, zone: "strength" });
  log("member", `${v.memberName} booked with ${t.name}`);
  refresh("/trainers", "/live");
}

/* ── Devices ────────────────────────────────────────────────────────────── */

export async function toggleSimulator(on: boolean) {
  setSimulator(on);
  log("device", on ? "Floor simulator turned on" : "Floor simulator paused — live count now from real terminals only");
  refresh("/live", "/devices");
}

/** Send a test punch through the same pipeline real terminals use. */
export async function testPunch(userId: string, direction: "in" | "out" | "auto") {
  const { ingest } = await import("@/lib/store");
  const ev = ingest({ userId: userId.trim(), deviceSerial: "CKUH224960231", direction: direction === "auto" ? undefined : direction, method: "face" }, "webhook");
  refresh("/live", "/devices");
  return { name: ev.name, direction: ev.direction, verified: ev.verified, note: ev.note ?? null };
}
