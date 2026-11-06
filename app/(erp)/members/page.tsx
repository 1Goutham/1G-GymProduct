import { Users, UserPlus, CalendarClock, TriangleAlert } from "lucide-react";
import { advance } from "@/lib/store";
import { memberStats } from "@/lib/derive";
import { PLANS } from "@/lib/data/seed";
import { Card, PageHeader, Stat } from "@/components/ui/primitives";
import { MembersTable, type MemberRow } from "@/components/modules/members-table";
import { ShareBar } from "@/components/charts/charts";
import { DumbbellArt } from "@/components/illustrations";

export const dynamic = "force-dynamic";
export const metadata = { title: "Members" };

export default async function MembersPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const { filter = "all" } = await searchParams;
  const now = Date.now();
  const s = advance(now);
  const ms = memberStats(now);
  const inside = s.live.inside;

  let list = s.members;
  if (filter === "risk") list = list.filter((m) => m.status !== "expired" && m.churnRisk >= 0.6).sort((a, b) => b.churnRisk - a.churnRisk);
  else if (filter === "expiring") list = list.filter((m) => m.status === "expiring").sort((a, b) => +new Date(a.expires) - +new Date(b.expires));
  else if (filter === "expired") list = list.filter((m) => m.status === "expired").sort((a, b) => +new Date(b.expires) - +new Date(a.expires));
  else if (filter === "inside") list = list.filter((m) => inside.has(m.id));
  else list = [...list].sort((a, b) => +new Date(b.lastVisit ?? 0) - +new Date(a.lastVisit ?? 0));

  const rows: MemberRow[] = list.map((m) => ({
    id: m.id,
    name: m.name,
    phone: m.phone,
    plan: PLANS.find((p) => p.id === m.plan)!.name,
    status: m.status,
    expires: m.expires,
    visits30: m.visits30,
    lastVisit: m.lastVisit,
    churnRisk: m.churnRisk,
    balanceDue: m.balanceDue,
    trainer: m.trainerId ? s.trainers.find((t) => t.id === m.trainerId)!.name.split(" ")[0] : null,
    goal: m.goal,
    inside: inside.has(m.id),
  }));

  const PLAN_COLORS = ["var(--s1)", "var(--s2)", "var(--s3)", "var(--s4)", "var(--faint)"];

  return (
    <>
      <PageHeader eyebrow="Operate" title="Members" subtitle="Every member, their habits and their risk of leaving — scored nightly from biometric attendance." art={<DumbbellArt size={112} />} />
      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Active members" value={ms.active.toLocaleString("en-IN")} hint={`${ms.total.toLocaleString("en-IN")} on record`} icon={<Users className="size-4" />} />
        <Stat label="Joined · 30 days" value={`+${ms.newThisMonth.length}`} hint={`avg ${ms.avgVisits.toFixed(1)} visits / month`} icon={<UserPlus className="size-4" />} />
        <Stat label="Renewals due" value={ms.expiring.length} hint="next 10 days" icon={<CalendarClock className="size-4" />} />
        <Stat label="At churn risk" value={ms.atRisk.length} hint={`${ms.expired.length} already lapsed`} icon={<TriangleAlert className="size-4" />} tone="warn" />
      </div>
      <div className="mb-5 grid gap-5 lg:grid-cols-2">
        <Card title="Plan mix" subtitle="Active members by plan">
          <ShareBar parts={ms.planMix.map((p, i) => ({ label: p.name, value: p.count, color: PLAN_COLORS[i] }))} />
        </Card>
        <Card title="How churn is scored" subtitle="Explainable, not a black box">
          <ul className="grid gap-2 text-[13px] leading-relaxed text-fg-2">
            <li>• Visit frequency over the last 30 days (biometric check-ins)</li>
            <li>• Days since last visit — a 10-day gap raises risk sharply</li>
            <li>• Plan length and days to expiry</li>
            <li>• Above 60 → trainer check-in; above 75 → owner call + offer</li>
          </ul>
        </Card>
      </div>
      <Card pad={false} className="pt-5 md:pt-6">
        <MembersTable rows={rows} filter={filter} now={now} />
      </Card>
    </>
  );
}
