"use client";

import { useState, useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import type { Session, Trainer } from "@/lib/types";
import { Avatar } from "@/components/ui/primitives";
import { Legend } from "@/components/charts/charts";
import { hourLabel } from "@/lib/format";
import { bookSession } from "@/app/actions";
import { useToast } from "@/components/shell/shell";
import { cn } from "@/lib/cn";

const KIND_COLOR = { pt: "var(--s1)", class: "var(--s2)", assessment: "var(--s3)" };

export function TrainerTimeline({ trainers, sessions, open, close, nowH }: { trainers: Trainer[]; sessions: Session[]; open: number; close: number; nowH: number }) {
  const span = close - open;
  const pos = (h: number) => `${((h - open) / span) * 100}%`;
  const [slot, setSlot] = useState<{ t: Trainer; start: number } | null>(null);
  const [name, setName] = useState("");
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const toast = useToast();
  const hours = Array.from({ length: span + 1 }, (_, i) => open + i);

  const onTrack = (e: React.MouseEvent<HTMLDivElement>, t: Trainer) => {
    const r = e.currentTarget.getBoundingClientRect();
    const h = open + ((e.clientX - r.left) / r.width) * span;
    const snapped = Math.floor(h * 2) / 2;
    if (snapped < t.shift.start || snapped + 1 > t.shift.end) return;
    if (sessions.some((x) => x.trainerId === t.id && snapped < x.start + x.minutes / 60 && x.start < snapped + 1)) return;
    setErr(null);
    setName("");
    setSlot({ t, start: snapped });
  };

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <Legend items={[{ label: "Personal training", color: KIND_COLOR.pt }, { label: "Group class", color: KIND_COLOR.class }, { label: "Assessment", color: KIND_COLOR.assessment }]} />
        <span className="text-[12px] text-muted">Click an open slot inside a shift to book</span>
      </div>
      <div className="overflow-x-auto">
        <div className="min-w-[860px]">
          <div className="relative ml-[190px] h-6">
            {hours.map((h, i) =>
              i % 2 === 0 ? (
                <span key={h} className="absolute -translate-x-1/2 text-[10.5px] text-faint" style={{ left: pos(h) }}>
                  {hourLabel(h)}
                </span>
              ) : null,
            )}
          </div>
          {trainers.map((t) => {
            const mine = sessions.filter((s) => s.trainerId === t.id);
            return (
              <div key={t.id} className="flex items-center border-t border-line py-2">
                <div className="flex w-[190px] shrink-0 items-center gap-2.5 pr-3">
                  <span className="relative">
                    <Avatar name={t.name} hue={t.hue} size={30} />
                    {t.onFloor && <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-[var(--surface)] bg-brand" />}
                  </span>
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-medium text-fg">{t.name}</div>
                    <div className="truncate text-[11.5px] text-muted">{t.role}</div>
                  </div>
                </div>
                <div className="relative h-9 flex-1 cursor-pointer rounded-lg" onClick={(e) => onTrack(e, t)}>
                  {hours.map((h) => (
                    <span key={h} className="absolute inset-y-0 w-px bg-line" style={{ left: pos(h) }} />
                  ))}
                  <span className="absolute inset-y-1 rounded-md bg-surface-3" style={{ left: pos(t.shift.start), width: `${((t.shift.end - t.shift.start) / span) * 100}%` }} />
                  {mine.map((s) => (
                    <span
                      key={s.id}
                      title={`${hourLabel(s.start)} · ${s.title}`}
                      onClick={(e) => e.stopPropagation()}
                      className="absolute inset-y-1.5 flex items-center overflow-hidden rounded-md px-1.5 text-[10.5px] font-medium text-white"
                      style={{ left: `calc(${pos(s.start)} + 1px)`, width: `calc(${(s.minutes / 60 / span) * 100}% - 2px)`, background: KIND_COLOR[s.kind] }}
                    >
                      <span className="truncate">{s.kind === "class" ? s.title.replace(" class", "") : s.title.replace("PT · ", "")}</span>
                    </span>
                  ))}
                  {nowH >= open && nowH <= close && <span className="pointer-events-none absolute -inset-y-2 w-[2px] rounded bg-bad" style={{ left: pos(nowH) }} />}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <AnimatePresence>
        {slot && (
          <motion.div className="fixed inset-0 z-[70] grid place-items-center bg-black/25 px-4 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSlot(null)}>
            <motion.form
              initial={{ scale: 0.96, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.97, opacity: 0 }}
              transition={{ type: "spring", stiffness: 480, damping: 36 }}
              onClick={(e) => e.stopPropagation()}
              onSubmit={(e) => {
                e.preventDefault();
                start(async () => {
                  try {
                    await bookSession({ trainerId: slot.t.id, start: slot.start, memberName: name, minutes: 60 });
                    toast(`Booked ${name.split(" ")[0]} with ${slot.t.name.split(" ")[0]} at ${hourLabel(slot.start)}`);
                    setSlot(null);
                  } catch (x) {
                    setErr(x instanceof Error ? x.message : "Couldn't book that slot");
                  }
                });
              }}
              className="card w-full max-w-[400px] p-6"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Avatar name={slot.t.name} hue={slot.t.hue} size={40} />
                  <div>
                    <div className="text-[16px] font-semibold text-fg">Book {slot.t.name.split(" ")[0]}</div>
                    <div className="text-[13px] text-muted">
                      {hourLabel(slot.start)} – {hourLabel(slot.start + 1)} · 60 min PT
                    </div>
                  </div>
                </div>
                <button type="button" className="btn btn-ghost !px-2" onClick={() => setSlot(null)} aria-label="Close">
                  <X className="size-4" />
                </button>
              </div>
              <label className="mt-5 block text-[12.5px] font-medium text-muted">
                Member name
                <input autoFocus required value={name} onChange={(e) => setName(e.target.value)} className="field mt-1.5" placeholder="e.g. Priya Venkatesh" />
              </label>
              {err && <div className="mt-2 text-[12.5px] text-bad">{err}</div>}
              <div className="mt-5 flex justify-end gap-2">
                <button type="button" className="btn btn-soft" onClick={() => setSlot(null)}>
                  Cancel
                </button>
                <button className={cn("btn btn-ink")} disabled={pending || !name.trim()}>
                  {pending ? "Booking…" : "Confirm booking"}
                </button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
