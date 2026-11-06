import { HeartPulse, PackageCheck, OctagonAlert, Sparkles, IndianRupee } from "lucide-react";
import { db } from "@/lib/store";
import { equipmentView } from "@/lib/derive";
import { Badge, Card, PageHeader, Stat } from "@/components/ui/primitives";
import { EquipmentBoard, type EqRow } from "@/components/modules/equipment-board";
import { TreadmillArt } from "@/components/illustrations";
import { ago, inrShort } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Equipment" };

export default async function EquipmentPage({ searchParams }: { searchParams: Promise<{ report?: string; focus?: string }> }) {
  const sp = await searchParams;
  const s = db();
  const eq = equipmentView();
  const rows: EqRow[] = eq.map((e) => ({
    id: e.id,
    tag: e.tag,
    name: e.name,
    category: e.category,
    brand: e.brand,
    model: e.model,
    zone: e.zone,
    status: e.status,
    health: e.health,
    risk14: e.risk14,
    serviceDue: e.serviceDue,
    usageHours: e.usageHours,
    lastService: e.lastService,
    warrantyUntil: e.warrantyUntil,
    inWarranty: e.inWarranty,
    cost: e.cost,
    vendorId: e.vendorId,
    reason: e.reason,
    openFaults: e.openFaults.length,
    hasTicket: s.tickets.some((t) => t.equipmentId === e.id && t.status !== "completed"),
  }));
  const avg = Math.round(eq.reduce((a, e) => a + e.health, 0) / eq.length);
  const atRisk = eq.filter((e) => e.status !== "down" && e.risk14 >= 0.5);
  const value = eq.reduce((a, e) => a + e.cost, 0);
  const openFaults = s.faults.filter((f) => f.status === "open");

  return (
    <>
      <PageHeader eyebrow="Assets" title="Equipment" subtitle="Every machine with a live health score. Aathlytx AI predicts breakdowns from usage hours, service debt, age and reports — so you service before it breaks." art={<TreadmillArt size={112} />} />
      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Fleet health" value={avg} hint={`${eq.length} assets tracked`} icon={<HeartPulse className="size-4" />} />
        <Stat label="Predicted to fail · 14d" value={atRisk.length} hint="risk ≥ 50%" icon={<Sparkles className="size-4" />} tone={atRisk.length ? "warn" : undefined} />
        <Stat label="Out of service" value={eq.filter((e) => e.status === "down").length} hint={`${openFaults.length} open fault reports`} icon={<OctagonAlert className="size-4" />} tone={eq.some((e) => e.status === "down") ? "bad" : undefined} />
        <Stat label="Asset value" value={inrShort(value)} hint={`${eq.filter((e) => e.inWarranty).length} under warranty`} icon={<IndianRupee className="size-4" />} />
      </div>

      {openFaults.length > 0 && (
        <Card title="Open fault reports" subtitle="Reported by members, trainers and staff — waiting for a ticket" className="mb-5">
          <div className="grid gap-3 md:grid-cols-2">
            {openFaults.map((f) => {
              const e = eq.find((x) => x.id === f.equipmentId)!;
              return (
                <div key={f.id} className="flex gap-3 rounded-2xl bg-surface-3 p-4">
                  <PackageCheck className="mt-0.5 size-4 shrink-0 text-muted" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[14px] font-medium text-fg">{e.name}</span>
                      <Badge tone={f.severity === "high" ? "bad" : f.severity === "medium" ? "warn" : "muted"}>{f.severity}</Badge>
                    </div>
                    <p className="mt-1 text-[13px] leading-relaxed text-fg-2">{f.issue}</p>
                    <div className="mt-1.5 text-[12px] text-muted">
                      {f.reportedBy} ({f.role}) · {ago(f.createdAt)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <Card pad={false} className="pt-5 md:pt-6">
        <EquipmentBoard rows={rows} vendors={s.vendors} openReport={sp.report === "1"} focus={sp.focus} />
      </Card>
    </>
  );
}
