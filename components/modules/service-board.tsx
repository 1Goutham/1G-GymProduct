"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Clock, ArrowRight, Check } from "lucide-react";
import type { TicketStatus } from "@/lib/types";
import { Badge } from "@/components/ui/primitives";
import { setTicketStatus } from "@/app/actions";
import { useToast } from "@/components/shell/shell";
import { dateShort, inr } from "@/lib/format";
import { cn } from "@/lib/cn";

export interface TicketCard {
  id: string;
  equipment: string;
  vendor: string;
  type: "preventive" | "breakdown" | "amc";
  status: TicketStatus;
  scheduledFor: string;
  opened: string;
  closed: string | null;
  cost: number;
  notes: string;
  slaLeftHours: number;
}

const COLS: { id: TicketStatus; label: string; next?: TicketStatus; nextLabel?: string }[] = [
  { id: "scheduled", label: "Scheduled", next: "in-progress", nextLabel: "Start" },
  { id: "in-progress", label: "In progress", next: "completed", nextLabel: "Complete" },
  { id: "awaiting-parts", label: "Awaiting parts", next: "in-progress", nextLabel: "Parts in" },
  { id: "completed", label: "Completed" },
];

export function ServiceBoard({ tickets }: { tickets: TicketCard[] }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const toast = useToast();
  const move = (t: TicketCard, to: TicketStatus) =>
    start(async () => {
      await setTicketStatus(t.id, to);
      toast(to === "completed" ? `${t.equipment} is back in service` : `${t.equipment} → ${to.replace("-", " ")}`);
      router.refresh();
    });
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {COLS.map((c) => {
        const list = tickets.filter((t) => t.status === c.id);
        return (
          <div key={c.id} className="min-w-0 rounded-[22px] bg-surface-3/70 p-3">
            <div className="flex items-center justify-between px-2 pb-3 pt-1">
              <span className="text-[13.5px] font-semibold text-fg">{c.label}</span>
              <span className="num grid h-6 min-w-6 place-items-center rounded-full bg-surface px-2 text-[12px] text-muted">{list.length}</span>
            </div>
            <div className="grid gap-2.5">
              {list.slice(0, c.id === "completed" ? 5 : 20).map((t) => (
                <div key={t.id} className={cn("card rise p-4", pending && "opacity-80")}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-[14px] font-medium text-fg">{t.equipment}</div>
                      <div className="truncate text-[12px] text-muted">{t.vendor}</div>
                    </div>
                    <Badge tone={t.type === "breakdown" ? "bad" : t.type === "amc" ? "info" : "muted"}>{t.type === "amc" ? "AMC" : t.type}</Badge>
                  </div>
                  <p className="mt-2 line-clamp-2 text-[12.5px] leading-relaxed text-fg-2">{t.notes}</p>
                  <div className="mt-3 flex items-center justify-between gap-2 text-[12px]">
                    {t.status === "completed" ? (
                      <span className="text-muted">Closed {t.closed ? dateShort(t.closed) : ""}</span>
                    ) : (
                      <span className={cn("inline-flex items-center gap-1", t.slaLeftHours < 0 ? "text-bad" : t.slaLeftHours < 12 ? "text-warn" : "text-muted")}>
                        <Clock className="size-3" />
                        {t.slaLeftHours < 0 ? `SLA breached ${-t.slaLeftHours}h` : `Visit ${dateShort(t.scheduledFor)}`}
                      </span>
                    )}
                    <span className="num text-fg-2">{t.cost ? inr(t.cost) : "Under AMC"}</span>
                  </div>
                  {c.next && (
                    <div className="mt-3 flex gap-2">
                      <button className="btn btn-soft btn-sm flex-1" disabled={pending} onClick={() => move(t, c.next!)}>
                        {c.next === "completed" ? <Check className="size-3.5" /> : <ArrowRight className="size-3.5" />} {c.nextLabel}
                      </button>
                      {c.id === "in-progress" && (
                        <button className="btn btn-ghost btn-sm" disabled={pending} onClick={() => move(t, "awaiting-parts")}>
                          Parts
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
              {list.length === 0 && <div className="px-2 py-6 text-center text-[12.5px] text-muted">Nothing here</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
