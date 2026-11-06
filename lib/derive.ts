import "server-only";
import { db } from "@/lib/store";
import { PLANS } from "@/lib/data/seed";
import type { Equipment, FaultReport, FinanceMonth, InventoryItem, PurchaseOrder } from "@/lib/types";

const DAY = 86400000;

/* ── Equipment health model ──────────────────────────────────────────────
 * health  — 0..100, a blend of service debt, age, open reports and status
 * risk14  — probability of a breakdown in the next 14 days (logistic)
 * ──────────────────────────────────────────────────────────────────────── */
export interface EquipmentView extends Equipment {
  health: number;
  risk14: number;
  serviceDue: number; // hours remaining until service (negative = overdue)
  openFaults: FaultReport[];
  ageYears: number;
  inWarranty: boolean;
  reason: string;
}

export function equipmentView(now = Date.now()): EquipmentView[] {
  const s = db();
  return s.equipment.map((e) => {
    const openFaults = s.faults.filter((f) => f.equipmentId === e.id && f.status !== "resolved");
    const debt = e.hoursSinceService / e.serviceIntervalHours; // 1 = due
    const ageYears = (now - new Date(e.purchased).getTime()) / (365 * DAY);
    const faultPenalty = openFaults.reduce((a, f) => a + (f.severity === "high" ? 22 : f.severity === "medium" ? 12 : 5), 0);
    let health = 100 - Math.min(1.4, debt) * 34 - Math.min(5, ageYears) * 3.2 - faultPenalty;
    if (e.status === "down") health = Math.min(health, 18);
    if (e.status === "attention") health = Math.min(health, 58);
    health = Math.max(4, Math.min(99, Math.round(health)));
    const z = -4.2 + debt * 2.6 + ageYears * 0.22 + faultPenalty * 0.06 + (e.category === "Cardio" ? 0.6 : 0);
    const risk14 = e.status === "down" ? 1 : Math.round((1 / (1 + Math.exp(-z))) * 100) / 100;
    const reasons: string[] = [];
    if (debt >= 1) reasons.push(`${Math.round(e.hoursSinceService - e.serviceIntervalHours)}h past its service interval`);
    else if (debt > 0.8) reasons.push(`service due in ${Math.round(e.serviceIntervalHours - e.hoursSinceService)}h`);
    if (openFaults.length) reasons.push(`${openFaults.length} open report${openFaults.length > 1 ? "s" : ""}`);
    if (ageYears > 3.5) reasons.push(`${ageYears.toFixed(1)} yrs old`);
    return {
      ...e,
      health,
      risk14,
      serviceDue: Math.round(e.serviceIntervalHours - e.hoursSinceService),
      openFaults,
      ageYears,
      inWarranty: new Date(e.warrantyUntil).getTime() > now,
      reason: reasons.join(" · ") || "Healthy",
    };
  });
}

/* ── Inventory ───────────────────────────────────────────────────────────── */
export interface InventoryView extends InventoryItem {
  daysLeft: number;
  low: boolean;
  suggestQty: number;
}
export function inventoryView(): InventoryView[] {
  return db().inventory.map((i) => {
    const daily = i.monthlyUsage / 30;
    const daysLeft = daily > 0 ? Math.floor(i.stock / daily) : 999;
    const low = i.stock <= i.reorderPoint;
    // order up to ~6 weeks of cover, at least reorder point × 2
    const suggestQty = low ? Math.max(Math.ceil(i.monthlyUsage * 1.5) - i.stock, i.reorderPoint * 2 - i.stock, 1) : 0;
    return { ...i, daysLeft, low, suggestQty };
  });
}

export function poTotal(po: PurchaseOrder) {
  return po.lines.reduce((a, l) => a + l.qty * l.unitCost, 0);
}

/* ── Finance ─────────────────────────────────────────────────────────────── */
export function monthRevenue(m: FinanceMonth) {
  const r = m.revenue;
  return r.memberships + r.pt + r.retail + r.other;
}
export function monthExpense(m: FinanceMonth) {
  const e = m.expenses;
  return e.payroll + e.rent + e.utilities + e.maintenance + e.marketing + e.procurement + e.other;
}

export function financeSummary() {
  const s = db();
  const months = s.finance;
  const cur = months[months.length - 1];
  const prev = months[months.length - 2];
  const curRev = monthRevenue(cur);
  const prevRev = monthRevenue(prev);
  const dayOfMonth = new Date().getUTCDate();
  const daysInMonth = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth() + 1, 0)).getUTCDate();
  const projected = (curRev / Math.max(1, dayOfMonth)) * daysInMonth;
  const projectedExp = (monthExpense(cur) / Math.max(1, dayOfMonth)) * daysInMonth;
  const ttmRev = months.slice(-12).reduce((a, m) => a + monthRevenue(m), 0);
  const ttmExp = months.slice(-12).reduce((a, m) => a + monthExpense(m), 0);
  const overdue = s.invoices.filter((i) => i.status === "overdue");
  const due = s.invoices.filter((i) => i.status === "due");
  const activeMembers = s.members.filter((m) => m.status === "active" || m.status === "expiring");
  const mrr = activeMembers.reduce((a, m) => {
    const p = PLANS.find((x) => x.id === m.plan)!;
    return a + p.price / p.months;
  }, 0);
  return {
    months,
    cur,
    prev,
    curRev,
    prevRev,
    projected,
    projectedExp,
    projectedProfit: projected - projectedExp,
    prevProfit: prevRev - monthExpense(prev),
    ttmRev,
    ttmExp,
    margin: (ttmRev - ttmExp) / ttmRev,
    mrr,
    arpu: mrr / Math.max(1, activeMembers.length),
    overdue,
    overdueTotal: overdue.reduce((a, i) => a + i.amount, 0),
    due,
    dueTotal: due.reduce((a, i) => a + i.amount, 0),
    gst: { output: curRev * 0.18 / 1.18, input: (cur.expenses.procurement + cur.expenses.maintenance + cur.expenses.marketing) * 0.18 / 1.18 },
  };
}

/* ── Members ─────────────────────────────────────────────────────────────── */
export function memberStats(now = Date.now()) {
  const s = db();
  const m = s.members;
  const active = m.filter((x) => x.status === "active" || x.status === "expiring");
  const expiring = m.filter((x) => x.status === "expiring");
  const expired = m.filter((x) => x.status === "expired");
  const atRisk = active.filter((x) => x.churnRisk >= 0.6);
  const newThisMonth = m.filter((x) => now - new Date(x.joined).getTime() < 30 * DAY);
  const planMix = PLANS.map((p) => ({ ...p, count: active.filter((x) => x.plan === p.id).length }));
  const avgVisits = active.reduce((a, x) => a + x.visits30, 0) / Math.max(1, active.length);
  return { total: m.length, active: active.length, expiring, expired, atRisk, newThisMonth, planMix, avgVisits };
}
