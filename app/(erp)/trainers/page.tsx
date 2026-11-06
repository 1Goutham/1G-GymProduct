import { Star, Users, CalendarClock, Gauge, BadgeCheck } from "lucide-react";
import { advance, db } from "@/lib/store";
import { CONFIG } from "@/lib/data/seed";
import { Avatar, Badge, Card, Meter, PageHeader, Stat } from "@/components/ui/primitives";
import { TrainerTimeline } from "@/components/modules/trainer-timeline";
import { CoachArt } from "@/components/illustrations";
import { hourLabel, inr, local } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Trainers" };

export default function TrainersPage() {
  const s = advance();
  const l = local();
  const trainers = [...db().trainers].sort((a, b) => a.shift.start - b.shift.start);
  const util = (id: string) => {
    const t = s.trainers.find((x) => x.id === id)!;
    return s.sessions.filter((x) => x.trainerId === id).reduce((a, x) => a + x.minutes, 0) / ((t.shift.end - t.shift.start) * 60);
  };
  const avgUtil = trainers.reduce((a, t) => a + util(t.id), 0) / trainers.length;
  const ptToday = s.sessions.filter((x) => x.kind === "pt");
  const ptRevenue = ptToday.reduce((a, x) => a + (s.trainers.find((t) => t.id === x.trainerId)?.ptRate ?? 0), 0);

  return (
    <>
      <PageHeader eyebrow="Operate" title="Trainers" subtitle="Shifts, bookings and who's actually on the floor — attendance comes straight from the staff biometric terminal." art={<CoachArt size={112} />} />

      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="On the floor now" value={`${trainers.filter((t) => t.onFloor).length} / ${trainers.length}`} hint="from staff punches" icon={<BadgeCheck className="size-4" />} />
        <Stat label="Sessions today" value={s.sessions.length} hint={`${ptToday.length} PT · ${s.sessions.filter((x) => x.kind === "class").length} classes`} icon={<CalendarClock className="size-4" />} />
        <Stat label="Avg. utilisation" value={`${Math.round(avgUtil * 100)}%`} hint="booked minutes ÷ shift" icon={<Gauge className="size-4" />} />
        <Stat label="PT revenue today" value={inr(ptRevenue)} hint={`${ptToday.length} sessions`} icon={<Users className="size-4" />} />
      </div>

      <Card title="Today's schedule" subtitle={`Shift bands in grey, bookings in colour, the red line is now (${hourLabel(l.h)}).`} className="mb-5">
        <TrainerTimeline trainers={trainers} sessions={s.sessions} open={CONFIG.open} close={CONFIG.close} nowH={l.h} />
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {trainers.map((t) => {
          const u = util(t.id);
          const next = s.sessions.filter((x) => x.trainerId === t.id && x.start >= l.h).sort((a, b) => a.start - b.start)[0];
          return (
            <section key={t.id} className="card rise p-5">
              <div className="flex items-start gap-3">
                <span className="relative">
                  <Avatar name={t.name} hue={t.hue} size={48} />
                  {t.onFloor && <span className="absolute bottom-0 right-0 size-3 rounded-full border-2 border-[var(--surface)] bg-brand" />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[15px] font-semibold text-fg">{t.name}</div>
                  <div className="text-[12.5px] text-muted">
                    {t.role} · {t.years} yrs
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-fg">
                  <Star className="size-3.5 fill-current text-warn" /> {t.rating}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {t.specialties.map((x) => (
                  <Badge key={x}>{x}</Badge>
                ))}
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-surface-3 py-2">
                  <div className="num text-[15px] font-semibold text-fg">{t.clients}</div>
                  <div className="text-[11px] text-muted">clients</div>
                </div>
                <div className="rounded-xl bg-surface-3 py-2">
                  <div className="num text-[15px] font-semibold text-fg">{inr(t.ptRate)}</div>
                  <div className="text-[11px] text-muted">per PT</div>
                </div>
                <div className="rounded-xl bg-surface-3 py-2">
                  <div className="num text-[15px] font-semibold text-fg">
                    {hourLabel(t.shift.start)}
                  </div>
                  <div className="text-[11px] text-muted">to {hourLabel(t.shift.end)}</div>
                </div>
              </div>
              <div className="mt-4">
                <div className="mb-1.5 flex justify-between text-[12px]">
                  <span className="text-muted">Utilisation today</span>
                  <span className="num font-medium text-fg">{Math.round(u * 100)}%</span>
                </div>
                <Meter value={u} color="var(--s1)" />
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-line pt-3 text-[12.5px]">
                <span className="text-muted">{t.onFloor ? "On floor" : "Off shift"}</span>
                <span className="text-fg-2">{next ? `Next: ${hourLabel(next.start)} · ${next.title}` : "No more sessions today"}</span>
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
