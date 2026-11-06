import { Wrench, Timer, IndianRupee, ShieldCheck, Star, Phone } from "lucide-react";
import { db } from "@/lib/store";
import { Badge, Card, PageHeader, Stat } from "@/components/ui/primitives";
import { ServiceBoard, type TicketCard } from "@/components/modules/service-board";
import { BarChart } from "@/components/charts/charts";
import { WrenchArt } from "@/components/illustrations";
import { inr, inrShort, monthLabel } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Service" };

export default function ServicePage() {
  const s = db();
  const now = Date.now();
  const cards: TicketCard[] = s.tickets.map((t) => ({
    id: t.id,
    equipment: s.equipment.find((e) => e.id === t.equipmentId)?.name ?? "—",
    vendor: s.vendors.find((v) => v.id === t.vendorId)?.name ?? "—",
    type: t.type,
    status: t.status,
    scheduledFor: t.scheduledFor,
    opened: t.opened,
    closed: t.closed,
    cost: t.cost,
    notes: t.notes,
    slaLeftHours: Math.round((new Date(t.opened).getTime() + t.slaHours * 3600000 - now) / 3600000),
  }));
  const open = s.tickets.filter((t) => t.status !== "completed");
  const done = s.tickets.filter((t) => t.status === "completed" && t.closed);
  const mttr = done.length ? done.reduce((a, t) => a + (new Date(t.closed!).getTime() - new Date(t.opened).getTime()) / 3600000, 0) / done.length : 0;
  const maint = s.finance.map((m) => ({ label: monthLabel(m.month), values: { maintenance: m.expenses.maintenance } }));
  const ytd = s.finance.reduce((a, m) => a + m.expenses.maintenance, 0);

  return (
    <>
      <PageHeader eyebrow="Assets" title="Service" subtitle="Breakdowns, preventive visits and AMCs in one board. Completing a ticket resets the machine's service clock and books the cost to finance." art={<WrenchArt size={112} />} />
      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Open tickets" value={open.length} hint={`${open.filter((t) => t.type === "breakdown").length} breakdowns`} icon={<Wrench className="size-4" />} />
        <Stat label="Mean time to repair" value={`${Math.round(mttr)}h`} hint="last 30 days" icon={<Timer className="size-4" />} />
        <Stat label="Maintenance · 12 mo" value={inrShort(ytd)} hint={`${inrShort(ytd / 12)} / month avg`} icon={<IndianRupee className="size-4" />} />
        <Stat label="AMC coverage" value={`${s.vendors.filter((v) => v.amc).length} vendors`} hint="cardio + HVAC" icon={<ShieldCheck className="size-4" />} />
      </div>

      <div className="mb-5">
        <ServiceBoard tickets={cards} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Card title="Maintenance spend" subtitle="Monthly, including parts and technician visits">
          <BarChart data={maint} series={[{ key: "maintenance", label: "Maintenance", color: "var(--s1)" }]} format="inr" highlightLast />
        </Card>
        <Card title="Service vendors" pad>
          <div className="grid">
            {s.vendors.map((v) => (
              <div key={v.id} className="flex items-center gap-3 border-b border-line py-3 last:border-0">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-[14px] font-medium text-fg">
                    {v.name} {v.amc && <Badge tone="info">AMC</Badge>}
                  </div>
                  <div className="truncate text-[12px] text-muted">
                    {v.category} · {v.contact} · {v.leadDays}d lead
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 text-[13px] text-fg-2">
                  <Star className="size-3.5 fill-current text-warn" />
                  {v.rating}
                </span>
                <a href={`tel:${v.phone.replace(/\s/g, "")}`} className="btn btn-ghost !px-2" aria-label={`Call ${v.name}`}>
                  <Phone className="size-4" />
                </a>
              </div>
            ))}
          </div>
          <div className="mt-3 text-[12px] text-muted">Average breakdown repair: {inr(14000)} · preventive visit: {inr(2500)}</div>
        </Card>
      </div>
    </>
  );
}
