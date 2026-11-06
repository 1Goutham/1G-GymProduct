import Link from "next/link";
import { ArrowUpRight, ArrowDownRight, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { initials } from "@/lib/format";

export function PageHeader({ eyebrow, title, subtitle, actions, art }: { eyebrow?: string; title: string; subtitle?: React.ReactNode; actions?: React.ReactNode; art?: React.ReactNode }) {
  return (
    <header className="rise mb-7 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="flex items-end gap-5">
        {art && <div className="hidden shrink-0 sm:block">{art}</div>}
        <div>
          {eyebrow && <div className="eyebrow mb-1.5">{eyebrow}</div>}
          <h1 className="display text-[30px] leading-[1.08] text-fg md:text-[38px]">{title}</h1>
          {subtitle && <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-muted">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function Card({ children, className, title, subtitle, action, pad = true }: { children: React.ReactNode; className?: string; title?: React.ReactNode; subtitle?: React.ReactNode; action?: React.ReactNode; pad?: boolean }) {
  return (
    <section className={cn("card rise min-w-0", pad && "p-5 md:p-6", className)}>
      {(title || action) && (
        <div className={cn("mb-4 flex items-start justify-between gap-3", !pad && "px-5 pt-5 md:px-6 md:pt-6")}>
          <div className="min-w-0">
            {title && <h2 className="text-[16px] font-semibold tracking-[-0.015em] text-fg">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-[13px] text-muted">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Stat({ label, value, delta, deltaLabel, hint, icon, tone }: { label: string; value: React.ReactNode; delta?: number; deltaLabel?: string; hint?: React.ReactNode; icon?: React.ReactNode; tone?: "ok" | "warn" | "bad" }) {
  const up = (delta ?? 0) >= 0;
  return (
    <div className="card rise flex min-w-0 flex-col justify-between gap-3 p-5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[13px] font-medium text-muted">{label}</span>
        {icon && <span className="grid size-8 place-items-center rounded-full bg-surface-3 text-fg-2">{icon}</span>}
      </div>
      <div>
        <div className={cn("display num text-[30px] leading-none text-fg", tone === "bad" && "text-bad", tone === "warn" && "text-warn")}>{value}</div>
        <div className="mt-2 flex items-center gap-2 text-[12.5px]">
          {delta != null && (
            <span className={cn("inline-flex items-center gap-0.5 font-medium", up ? "text-ok" : "text-bad")}>
              {up ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
              {Math.abs(delta * 100).toFixed(1)}%
            </span>
          )}
          {deltaLabel && <span className="text-muted">{deltaLabel}</span>}
          {hint && <span className="truncate text-muted">{hint}</span>}
        </div>
      </div>
    </div>
  );
}

const TONES = {
  ok: "bg-ok-soft text-ok",
  warn: "bg-warn-soft text-warn",
  bad: "bg-bad-soft text-bad",
  info: "bg-[color-mix(in_srgb,var(--s1)_12%,transparent)] text-s1",
  brand: "bg-brand-soft text-brand-text",
  muted: "bg-surface-3 text-fg-2",
} as const;

export function Badge({ children, tone = "muted", className, dot }: { children: React.ReactNode; tone?: keyof typeof TONES; className?: string; dot?: boolean }) {
  return (
    <span className={cn("inline-flex h-[22px] items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-[11.5px] font-medium", TONES[tone], className)}>
      {dot && <span className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

export function Avatar({ name, hue, size = 32, ring }: { name: string; hue?: number; size?: number; ring?: boolean }) {
  const h = hue ?? [...name].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  return (
    <span
      className={cn("inline-grid shrink-0 place-items-center rounded-full font-semibold", ring && "ring-2 ring-[var(--surface)]")}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.36,
        background: `linear-gradient(140deg, hsl(${h} 70% 88%), hsl(${(h + 30) % 360} 60% 76%))`,
        color: `hsl(${h} 45% 24%)`,
      }}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}

export function Meter({ value, className, color, height = 6 }: { value: number; className?: string; color?: string; height?: number }) {
  const v = Math.max(0, Math.min(1, value));
  const c = color ?? (v > 0.85 ? "var(--bad)" : v > 0.65 ? "var(--warn)" : "var(--s1)");
  return (
    <div className={cn("w-full overflow-hidden rounded-full bg-surface-3", className)} style={{ height }}>
      <div className="h-full rounded-full" style={{ width: `${v * 100}%`, background: c, transition: "width 1s var(--ease-out-expo)" }} />
    </div>
  );
}

export function LinkRow({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) {
  return (
    <Link href={href} className={cn("row-line group flex items-center gap-3 border-b border-line py-3 last:border-0", className)}>
      {children}
      <ChevronRight className="ml-auto size-4 shrink-0 text-faint transition-transform duration-300 group-hover:translate-x-0.5" />
    </Link>
  );
}

export function Empty({ art, title, body, action }: { art?: React.ReactNode; title: string; body?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-10 text-center">
      {art}
      <div className="mt-3 text-[15px] font-semibold text-fg">{title}</div>
      {body && <p className="mt-1 max-w-sm text-[13.5px] text-muted">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className="rounded-md border border-line-strong bg-surface px-1.5 font-sans text-[11px] text-muted">{children}</kbd>;
}

export function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <th className={cn("whitespace-nowrap border-b border-line px-3 py-2.5 text-left text-[12px] font-medium text-muted first:pl-5 last:pr-5 md:first:pl-6 md:last:pr-6", className)}>{children}</th>;
}
export function Td({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <td className={cn("whitespace-nowrap border-b border-line px-3 py-3 text-[13.5px] text-fg first:pl-5 last:pr-5 md:first:pl-6 md:last:pr-6", className)}>{children}</td>;
}
