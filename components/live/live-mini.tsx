"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { LiveSnapshot } from "@/lib/types";
import { useLive } from "./use-live";
import { AreaChart, Ring } from "@/components/charts/charts";
import { Badge } from "@/components/ui/primitives";
import { crowdLabel } from "./live-floor";
import { hourLabel, local } from "@/lib/format";

export function LiveMini({ initial }: { initial: LiveSnapshot }) {
  const { snap } = useLive(initial);
  const p = snap.inside / snap.capacity;
  const label = crowdLabel(p);
  const l = local(snap.now);
  return (
    <Link href="/live" className="card rise group grid gap-5 p-5 transition-transform duration-500 [transition-timing-function:var(--ease-out-expo)] hover:-translate-y-0.5 md:grid-cols-[auto_minmax(0,1fr)] md:p-6">
      <div className="flex items-center gap-5">
        <Ring value={snap.inside} max={snap.capacity} size={128} stroke={12} color={p > 0.85 ? "var(--bad)" : p > 0.65 ? "var(--warn)" : "var(--s1)"}>
          <div>
            <div className="display num text-[38px] leading-none text-fg">{snap.inside}</div>
            <div className="text-[11.5px] text-muted">inside now</div>
          </div>
        </Ring>
        <div className="grid gap-2 md:hidden xl:grid">
          <div className="flex items-center gap-2 text-[12.5px] font-medium text-muted">
            <span className="live-dot" /> Live floor
          </div>
          <Badge tone={label.tone} dot>
            {label.text} · {Math.round(p * 100)}%
          </Badge>
          <div className="text-[12.5px] text-muted">
            {snap.entriesToday} check-ins · {snap.trainersOnFloor} trainers
          </div>
        </div>
      </div>
      <div className="min-w-0">
        <div className="mb-1 flex items-center justify-between text-[12.5px] text-muted">
          <span>Today vs. forecast</span>
          <ArrowUpRight className="size-4 text-faint transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </div>
        <AreaChart data={snap.hourly.map((h) => ({ label: hourLabel(h.hour), actual: h.count, forecast: h.forecast }))} nowIndex={snap.hourly.findIndex((h) => h.hour === l.hour)} height={150} />
      </div>
    </Link>
  );
}
