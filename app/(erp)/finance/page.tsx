import { Wallet, TrendingUp, Repeat, Receipt, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { db } from "@/lib/store";
import { financeSummary, monthExpense, monthRevenue } from "@/lib/derive";
import { Card, PageHeader, Stat, Td, Th } from "@/components/ui/primitives";
import { BarChart, Legend, ShareBar } from "@/components/charts/charts";
import { DuesTable, type DueRow } from "@/components/modules/dues-table";
import { CoinsArt } from "@/components/illustrations";
import { ago, inr, inrShort, monthLabel, pct } from "@/lib/format";
import { cn } from "@/lib/cn";

export const dynamic = "force-dynamic";
export const metadata = { title: "Finance" };

export default function FinancePage() {
  const now = Date.now();
  const s = db();
  const f = financeSummary();
  const bars = f.months.map((m) => ({ label: monthLabel(m.month), values: { revenue: monthRevenue(m), expenses: monthExpense(m) } }));
  const last = f.prev; // last full month for mix
  const revMix = [
    { label: "Memberships", value: last.revenue.memberships, color: "var(--s1)" },
    { label: "Personal training", value: last.revenue.pt, color: "var(--s2)" },
    { label: "Retail", value: last.revenue.retail, color: "var(--s3)" },
    { label: "Other", value: last.revenue.other, color: "var(--faint)" },
  ];
  const e = last.expenses;
  const expMix = [
    { label: "Payroll", value: e.payroll, color: "var(--s1)" },
    { label: "Rent", value: e.rent, color: "var(--s2)" },
    { label: "Utilities", value: e.utilities, color: "var(--s3)" },
    { label: "Procurement", value: e.procurement, color: "var(--s4)" },
    { label: "Other", value: e.maintenance + e.marketing + e.other, color: "var(--faint)" },
  ];
  const pl: { k: string; cur: number; prev: number; neg?: boolean; strong?: boolean }[] = [
    { k: "Memberships", cur: f.cur.revenue.memberships, prev: f.prev.revenue.memberships },
    { k: "Personal training", cur: f.cur.revenue.pt, prev: f.prev.revenue.pt },
    { k: "Retail & supplements", cur: f.cur.revenue.retail, prev: f.prev.revenue.retail },
    { k: "Other income", cur: f.cur.revenue.other, prev: f.prev.revenue.other },
    { k: "Total revenue", cur: f.curRev, prev: f.prevRev, strong: true },
    { k: "Payroll", cur: f.cur.expenses.payroll, prev: f.prev.expenses.payroll, neg: true },
    { k: "Rent", cur: f.cur.expenses.rent, prev: f.prev.expenses.rent, neg: true },
    { k: "Utilities", cur: f.cur.expenses.utilities, prev: f.prev.expenses.utilities, neg: true },
    { k: "Maintenance", cur: f.cur.expenses.maintenance, prev: f.prev.expenses.maintenance, neg: true },
    { k: "Procurement", cur: f.cur.expenses.procurement, prev: f.prev.expenses.procurement, neg: true },
    { k: "Marketing", cur: f.cur.expenses.marketing, prev: f.prev.expenses.marketing, neg: true },
    { k: "Other", cur: f.cur.expenses.other, prev: f.prev.expenses.other, neg: true },
    { k: "Operating profit", cur: f.curRev - monthExpense(f.cur), prev: f.prevRev - monthExpense(f.prev), strong: true },
  ];
  const dues: DueRow[] = [...f.overdue, ...f.due]
    .map((i) => {
      const m = s.members.find((x) => x.id === i.memberId)!;
      return { id: i.id, member: m.name, phone: m.phone, description: i.description, amount: i.amount, due: i.due, status: i.status as "due" | "overdue" };
    })
    .sort((a, b) => +new Date(a.due) - +new Date(b.due));

  return (
    <>
      <PageHeader eyebrow="Business" title="Finance" subtitle="Revenue, costs, dues and GST — every service ticket, PO and payment flows in automatically." art={<CoinsArt size={112} />} />
      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Revenue · month to date" value={inrShort(f.curRev)} hint={`pacing ${inrShort(f.projected)}`} icon={<Wallet className="size-4" />} />
        <Stat label="Projected profit" value={inrShort(f.projectedProfit)} delta={f.projectedProfit / f.prevProfit - 1} deltaLabel="vs last month" icon={<TrendingUp className="size-4" />} />
        <Stat label="Monthly recurring" value={inrShort(f.mrr)} hint={`ARPU ${inr(f.arpu)}`} icon={<Repeat className="size-4" />} />
        <Stat label="Overdue" value={inrShort(f.overdueTotal)} hint={`${f.overdue.length} invoices · ${inrShort(f.dueTotal)} due soon`} icon={<Receipt className="size-4" />} tone={f.overdueTotal ? "warn" : undefined} />
      </div>

      <Card title="Revenue vs. expenses" subtitle={`Trailing 12 months · ${inrShort(f.ttmRev)} revenue · ${pct(f.margin, 1)} operating margin`} action={<Legend items={[{ label: "Revenue", color: "var(--s1)" }, { label: "Expenses", color: "var(--s2)" }]} />} className="mb-5">
        <BarChart data={bars} series={[{ key: "revenue", label: "Revenue", color: "var(--s1)" }, { key: "expenses", label: "Expenses", color: "var(--s2)" }]} format="inr" height={260} />
        <p className="mt-2 text-[12px] text-muted">The current month is month-to-date.</p>
      </Card>

      <div className="mb-5 grid gap-5 lg:grid-cols-2">
        <Card title="Where revenue comes from" subtitle={`${monthLabel(last.month)} · ${inrShort(monthRevenue(last))}`}>
          <ShareBar parts={revMix} format="inr" />
        </Card>
        <Card title="Where it goes" subtitle={`${monthLabel(last.month)} · ${inrShort(monthExpense(last))}`}>
          <ShareBar parts={expMix} format="inr" />
        </Card>
      </div>

      <div className="mb-5 grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <Card title="Profit & loss" subtitle="This month to date vs. last month" pad={false}>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <Th>Line</Th>
                  <Th className="text-right">{monthLabel(f.cur.month)} (MTD)</Th>
                  <Th className="text-right">{monthLabel(f.prev.month)}</Th>
                </tr>
              </thead>
              <tbody>
                {pl.map((r) => (
                  <tr key={r.k} className={cn(r.strong && "bg-surface-2")}>
                    <Td className={cn(r.strong ? "font-semibold" : "text-fg-2", r.neg && "pl-8 md:pl-10")}>{r.k}</Td>
                    <Td className={cn("num text-right", r.strong && "font-semibold")}>{r.neg ? `(${inr(r.cur)})` : inr(r.cur)}</Td>
                    <Td className={cn("num text-right text-fg-2", r.strong && "font-semibold text-fg")}>{r.neg ? `(${inr(r.prev)})` : inr(r.prev)}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="grid content-start gap-5">
          <Card title="GST this month" subtitle="Estimated at 18% — reconcile with your CA before filing">
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                { l: "Output tax", v: f.gst.output },
                { l: "Input credit", v: f.gst.input },
                { l: "Net payable", v: f.gst.output - f.gst.input },
              ].map((x) => (
                <div key={x.l} className="rounded-2xl bg-surface-3 px-2 py-3">
                  <div className="num text-[16px] font-semibold text-fg">{inrShort(x.v)}</div>
                  <div className="text-[11.5px] text-muted">{x.l}</div>
                </div>
              ))}
            </div>
          </Card>
          <Card title="Recent transactions">
            <div className="grid">
              {s.transactions.slice(0, 8).map((t) => (
                <div key={t.id} className="flex items-center gap-3 border-b border-line py-2.5 last:border-0">
                  <span className={cn("grid size-8 shrink-0 place-items-center rounded-full", t.kind === "in" ? "bg-ok-soft text-ok" : "bg-surface-3 text-fg-2")}>
                    {t.kind === "in" ? <ArrowDownLeft className="size-4" /> : <ArrowUpRight className="size-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13.5px] text-fg">{t.label}</div>
                    <div className="text-[12px] text-muted">
                      {t.category} · {t.method} · {ago(t.ts, now)}
                    </div>
                  </div>
                  <span className={cn("num text-[13.5px] font-medium", t.kind === "in" ? "text-ok" : "text-fg")}>
                    {t.kind === "in" ? "+" : "−"}
                    {inr(t.amount)}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <section id="dues" className="card rise min-w-0 scroll-mt-20 pt-5 md:pt-6">
        <DuesTable rows={dues} now={now} />
      </section>
    </>
  );
}
