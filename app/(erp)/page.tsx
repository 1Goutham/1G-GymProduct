import Link from "next/link";
import { Wallet, Users, HeartPulse, Sparkles, Wrench, ShoppingBag, Fingerprint, Dumbbell, ArrowRight, Radio, Receipt, UserRound } from "lucide-react";
import { db, snapshot } from "@/lib/store";
import { insights } from "@/lib/ai/engine";
import { equipmentView, financeSummary, memberStats } from "@/lib/derive";
import { CONFIG } from "@/lib/data/seed";
import { Card, Stat, Avatar, Badge } from "@/components/ui/primitives";
import { LiveMini } from "@/components/live/live-mini";
import { InsightList } from "@/components/ai/insight-list";
import { HeroArt } from "@/components/illustrations";
import { Spark } from "@/components/charts/charts";
import { ago, dateLong, hourLabel, inrShort, local } from "@/lib/format";
import { monthRevenue } from "@/lib/derive";

export const dynamic = "force-dynamic";

const KIND_ICON = { equipment: Dumbbell, service: Wrench, purchase: ShoppingBag, finance: Receipt, member: Users, device: Fingerprint, ai: Sparkles };

export default function Today() {
  const now = Date.now();
  const s = db();
  const snap = snapshot(now);
  const l = local(now);
  const fin = financeSummary();
  const ms = memberStats(now);
  const eq = equipmentView(now);
  const ins = insights(now);
  const avgHealth = Math.round(eq.reduce((a, e) => a + e.health, 0) / eq.length);
  const greeting = l.hour < 12 ? "Good morning" : l.hour < 17 ? "Good afternoon" : "Good evening";
  const sessionsLeft = s.sessions.filter((x) => x.start >= l.h).sort((a, b) => a.start - b.start).slice(0, 5);

  return (
    <>
      <section className="rise relative mb-7 overflow-hidden rounded-[28px] bg-surface p-6 shadow-[var(--shadow-card)] md:p-9">
        <div className="relative z-10 max-w-xl">
          <div className="eyebrow">{dateLong(now)} · {CONFIG.name}, {CONFIG.branch}</div>
          <h1 className="display mt-2 text-[34px] leading-[1.05] text-fg md:text-[46px]">{greeting}.</h1>
          <p className="mt-3 text-[16px] leading-relaxed text-muted md:text-[17px]">
            <span className="font-medium text-fg">{snap.inside} people</span> are training right now.{" "}
            {ins.filter((i) => i.tone === "critical" || i.tone === "warning").length} things need you today, and revenue is pacing to{" "}
            <span className="font-medium text-fg">{inrShort(fin.projected)}</span> this month.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link href="/copilot" className="btn btn-ink">
              <Sparkles className="size-4" /> Ask Copilot
            </Link>
            <Link href="/live" className="btn btn-soft">
              <Radio className="size-4" /> Live floor
            </Link>
          </div>
        </div>
        <HeroArt className="pointer-events-none absolute -bottom-2 right-0 hidden w-[440px] opacity-95 md:block lg:w-[500px]" />
      </section>

      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Revenue this month" value={inrShort(fin.curRev)} delta={fin.projected / fin.prevRev - 1} deltaLabel="projected vs last" icon={<Wallet className="size-4" />} />
        <Stat label="Active members" value={ms.active.toLocaleString("en-IN")} hint={`+${ms.newThisMonth.length} joined in 30 days`} icon={<Users className="size-4" />} />
        <Stat label="Equipment health" value={`${avgHealth}`} hint={`${eq.filter((e) => e.status === "down").length} down · ${eq.filter((e) => e.status === "attention").length} attention`} icon={<HeartPulse className="size-4" />} tone={avgHealth < 60 ? "warn" : undefined} />
        <Stat label="Dues outstanding" value={inrShort(fin.overdueTotal + fin.dueTotal)} hint={`${fin.overdue.length} overdue invoices`} icon={<Receipt className="size-4" />} tone={fin.overdueTotal > 0 ? "warn" : undefined} />
      </div>

      <div className="mb-5">
        <LiveMini initial={snap} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
        <Card
          title={
            <span className="inline-flex items-center gap-2">
              <Sparkles className="size-4 text-s1" /> Your briefing
            </span>
          }
          subtitle="1G AI reads the floor, the machines, the books and the members — and ranks what matters."
          action={
            <Link href="/copilot" className="btn btn-soft btn-sm">
              Ask a question
            </Link>
          }
        >
          <InsightList items={ins} limit={6} />
        </Card>

        <div className="grid content-start gap-5">
          <Card title="Up next" subtitle="Sessions and classes still to come today" action={<Link href="/trainers" className="text-[13px] font-medium text-s1">Schedule</Link>}>
            <div className="grid">
              {sessionsLeft.map((x) => {
                const t = s.trainers.find((t) => t.id === x.trainerId)!;
                return (
                  <div key={x.id} className="flex items-center gap-3 border-b border-line py-2.5 last:border-0">
                    <div className="num w-[52px] shrink-0 text-[13px] font-semibold text-fg">{hourLabel(x.start)}</div>
                    <Avatar name={t.name} hue={t.hue} size={28} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13.5px] text-fg">{x.title}</div>
                      <div className="truncate text-[12px] text-muted">{t.name}</div>
                    </div>
                    <Badge tone={x.kind === "class" ? "info" : x.kind === "assessment" ? "brand" : "muted"}>{x.kind === "class" ? `${x.booked}/${x.capacity}` : x.kind === "pt" ? "PT" : "Assess"}</Badge>
                  </div>
                );
              })}
              {sessionsLeft.length === 0 && <div className="py-6 text-center text-[13px] text-muted">That's a wrap for today.</div>}
            </div>
          </Card>

          <Card title="Revenue, 12 months" subtitle={`TTM ${inrShort(fin.ttmRev)} · margin ${(fin.margin * 100).toFixed(1)}%`} action={<Link href="/finance" className="text-[13px] font-medium text-s1">Finance</Link>}>
            <div className="flex items-end justify-between gap-4">
              <div>
                <div className="display num text-[28px] text-fg">{inrShort(fin.mrr)}</div>
                <div className="text-[12.5px] text-muted">monthly recurring</div>
              </div>
              <Spark values={fin.months.slice(0, -1).map(monthRevenue)} width={150} height={44} />
            </div>
          </Card>

          <Card title="Activity" pad>
            <div className="grid">
              {s.activity.slice(0, 6).map((a) => {
                const I = KIND_ICON[a.kind];
                return (
                  <div key={a.id} className="flex items-start gap-3 py-2">
                    <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-surface-3 text-fg-2">
                      <I className="size-3.5" />
                    </span>
                    <div className="min-w-0 flex-1 text-[13px] leading-snug text-fg-2">{a.text}</div>
                    <span className="shrink-0 text-[11.5px] text-muted">{ago(a.ts, now)}</span>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { href: "/equipment?report=1", I: Wrench, t: "Report a fault", d: "Log a broken machine in seconds" },
          { href: "/procurement?new=1", I: ShoppingBag, t: "Purchase request", d: "Raise a PO for approval" },
          { href: "/trainers", I: UserRound, t: "Book a trainer", d: "See who's free right now" },
          { href: "/devices#connect", I: Fingerprint, t: "Connect terminal", d: "ZKTeco, eSSL & more" },
        ].map(({ href, I, t, d }) => (
          <Link key={href} href={href} className="card rise group flex flex-col gap-3 p-5 transition-transform duration-500 [transition-timing-function:var(--ease-out-expo)] hover:-translate-y-0.5">
            <span className="grid size-10 place-items-center rounded-2xl bg-surface-3 text-fg transition-colors group-hover:bg-brand group-hover:text-brand-ink">
              <I className="size-[18px]" />
            </span>
            <div>
              <div className="flex items-center gap-1 text-[14.5px] font-semibold text-fg">
                {t} <ArrowRight className="size-3.5 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
              </div>
              <div className="mt-0.5 text-[12.5px] text-muted">{d}</div>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
