import Link from "next/link";
import { AlertOctagon, AlertTriangle, Lightbulb, Info, ChevronRight } from "lucide-react";
import type { Insight } from "@/lib/ai/engine";
import { cn } from "@/lib/cn";

const TONE = {
  critical: { I: AlertOctagon, c: "text-bad", bg: "bg-bad-soft", label: "Critical" },
  warning: { I: AlertTriangle, c: "text-warn", bg: "bg-warn-soft", label: "Warning" },
  opportunity: { I: Lightbulb, c: "text-ok", bg: "bg-ok-soft", label: "Opportunity" },
  info: { I: Info, c: "text-s1", bg: "bg-[color-mix(in_srgb,var(--s1)_12%,transparent)]", label: "Info" },
};

export function InsightList({ items, limit }: { items: Insight[]; limit?: number }) {
  return (
    <div className="grid">
      {items.slice(0, limit ?? items.length).map((i) => {
        const t = TONE[i.tone];
        const body = (
          <>
            <span className={cn("mt-0.5 grid size-8 shrink-0 place-items-center rounded-full", t.bg, t.c)} title={t.label}>
              <t.I className="size-4" strokeWidth={2} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[14px] font-medium leading-snug text-fg">{i.title}</div>
              <div className="mt-0.5 text-[13px] leading-relaxed text-muted">{i.detail}</div>
              {i.action && <div className="mt-1.5 text-[12.5px] font-medium text-s1">{i.action.label}</div>}
            </div>
            {i.action && <ChevronRight className="mt-1 size-4 shrink-0 text-faint transition-transform group-hover:translate-x-0.5" />}
          </>
        );
        return i.action ? (
          <Link key={i.id} href={i.action.href} className="row-line group flex gap-3 border-b border-line py-3.5 last:border-0">
            {body}
          </Link>
        ) : (
          <div key={i.id} className="flex gap-3 border-b border-line py-3.5 last:border-0">
            {body}
          </div>
        );
      })}
    </div>
  );
}
