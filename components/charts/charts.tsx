"use client";

import { useId, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { inrShort } from "@/lib/format";

/** Formatters are named so Server Components can pass them across the boundary. */
export type Fmt = "int" | "inr";
const FORMATS: Record<Fmt, (v: number) => string> = { int: (v) => String(Math.round(v)), inr: inrShort };

/* Hand-built SVG charts. Thin marks, recessive grid, hover on every plot.
 * Colours come from CSS tokens so light/dark are selected, not flipped. */

function useWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(600);
  const cb = (el: HTMLDivElement | null) => {
    (ref as React.MutableRefObject<HTMLDivElement | null>).current = el;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(120, e.contentRect.width)));
    ro.observe(el);
  };
  return { ref: cb, w };
}

function niceMax(v: number) {
  if (v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  const n = v / p;
  const s = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
  return s * p;
}

function Tooltip({ x, y, w, children }: { x: number; y: number; w: number; children: React.ReactNode }) {
  const left = Math.min(Math.max(x, 70), w - 70);
  return (
    <div
      className="glass pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-xl px-3 py-2 text-[12px] shadow-[var(--shadow-pop)]"
      style={{ left, top: y - 10 }}
    >
      {children}
    </div>
  );
}

export function Legend({ items, className }: { items: { label: string; color: string; dashed?: boolean }[]; className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-muted", className)}>
      {items.map((i) => (
        <span key={i.label} className="inline-flex items-center gap-1.5">
          {i.dashed ? (
            <svg width="14" height="4" aria-hidden>
              <line x1="0" y1="2" x2="14" y2="2" stroke={i.color} strokeWidth="2" strokeDasharray="3 2" strokeLinecap="round" />
            </svg>
          ) : (
            <span className="inline-block size-2 rounded-full" style={{ background: i.color }} />
          )}
          {i.label}
        </span>
      ))}
    </div>
  );
}

/* ── Area: actual + forecast ─────────────────────────────────────────────── */
export function AreaChart({
  data,
  height = 220,
  max,
  format: fmt = "int",
  capacity,
  nowIndex,
}: {
  data: { label: string; actual: number | null; forecast?: number }[];
  height?: number;
  max?: number;
  format?: Fmt;
  capacity?: number;
  nowIndex?: number;
}) {
  const format = FORMATS[fmt];
  const { ref, w } = useWidth();
  const id = useId().replace(/:/g, "");
  const [hover, setHover] = useState<number | null>(null);
  const pad = { l: 34, r: 8, t: 12, b: 24 };
  const iw = w - pad.l - pad.r;
  const ih = height - pad.t - pad.b;
  const top = niceMax(max ?? Math.max(capacity ?? 0, ...data.map((d) => Math.max(d.actual ?? 0, d.forecast ?? 0))));
  const x = (i: number) => pad.l + (data.length <= 1 ? 0 : (i / (data.length - 1)) * iw);
  const y = (v: number) => pad.t + ih - (v / top) * ih;

  const actualPts = data.map((d, i) => (d.actual == null ? null : ([x(i), y(d.actual)] as const))).filter(Boolean) as (readonly [number, number])[];
  const smooth = (pts: (readonly [number, number])[]) => {
    if (pts.length < 2) return pts.length ? `M${pts[0][0]},${pts[0][1]}` : "";
    let d = `M${pts[0][0]},${pts[0][1]}`;
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1];
      const [x1, y1] = pts[i];
      const cx = (x0 + x1) / 2;
      d += ` C${cx},${y0} ${cx},${y1} ${x1},${y1}`;
    }
    return d;
  };
  const line = smooth(actualPts);
  const area = actualPts.length > 1 ? `${line} L${actualPts[actualPts.length - 1][0]},${pad.t + ih} L${actualPts[0][0]},${pad.t + ih} Z` : "";
  const fPts = data.map((d, i) => [x(i), y(d.forecast ?? 0)] as const);
  const fLine = smooth(fPts);
  const ticks = [0, top / 2, top];
  const every = Math.ceil(data.length / Math.max(2, Math.floor(iw / 56)));

  return (
    <div ref={ref} className="relative w-full select-none">
      <svg width={w} height={height} role="img" aria-label="Occupancy by hour" onMouseLeave={() => setHover(null)}>
        <defs>
          <linearGradient id={`g${id}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--s1)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="var(--s1)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={w - pad.r} y1={y(t)} y2={y(t)} stroke="var(--line)" />
            <text x={pad.l - 8} y={y(t) + 4} textAnchor="end" className="fill-[var(--faint)] text-[10.5px] num">
              {format(t)}
            </text>
          </g>
        ))}
        {capacity && (
          <g>
            <line x1={pad.l} x2={w - pad.r} y1={y(capacity)} y2={y(capacity)} stroke="var(--bad)" strokeOpacity="0.5" strokeDasharray="2 4" />
            <text x={w - pad.r} y={y(capacity) - 5} textAnchor="end" className="fill-[var(--muted)] text-[10.5px]">
              Capacity {capacity}
            </text>
          </g>
        )}
        {data.map((d, i) =>
          i % every === 0 ? (
            <text key={i} x={x(i)} y={height - 6} textAnchor="middle" className="fill-[var(--faint)] text-[10.5px]">
              {d.label}
            </text>
          ) : null,
        )}
        {data.some((d) => d.forecast != null) && <path d={fLine} fill="none" stroke="var(--muted)" strokeOpacity="0.7" strokeWidth="1.5" strokeDasharray="4 4" />}
        {area && <path d={area} fill={`url(#g${id})`} />}
        {line && <path d={line} fill="none" stroke="var(--s1)" strokeWidth="2" strokeLinecap="round" />}
        {nowIndex != null && actualPts.length > 0 && (
          <g>
            <circle cx={actualPts[actualPts.length - 1][0]} cy={actualPts[actualPts.length - 1][1]} r="7" fill="var(--s1)" opacity="0.18" />
            <circle cx={actualPts[actualPts.length - 1][0]} cy={actualPts[actualPts.length - 1][1]} r="4" fill="var(--s1)" stroke="var(--surface)" strokeWidth="2" />
          </g>
        )}
        {hover != null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={pad.t + ih} stroke="var(--line-strong)" />
            {data[hover].actual != null && <circle cx={x(hover)} cy={y(data[hover].actual!)} r="4" fill="var(--s1)" stroke="var(--surface)" strokeWidth="2" />}
            {data[hover].forecast != null && <circle cx={x(hover)} cy={y(data[hover].forecast!)} r="3" fill="var(--surface)" stroke="var(--muted)" strokeWidth="1.5" />}
          </g>
        )}
        {data.map((_, i) => (
          <rect key={i} x={x(i) - iw / data.length / 2} y={pad.t} width={iw / data.length} height={ih} fill="transparent" onMouseEnter={() => setHover(i)} />
        ))}
      </svg>
      {hover != null && (
        <Tooltip x={x(hover)} y={pad.t + 8} w={w}>
          <div className="font-medium text-fg">{data[hover].label}</div>
          {data[hover].actual != null && (
            <div className="mt-0.5 flex items-center gap-2 text-fg-2">
              <span className="size-2 rounded-full bg-s1" /> Actual <span className="num ml-auto font-medium text-fg">{format(data[hover].actual!)}</span>
            </div>
          )}
          {data[hover].forecast != null && (
            <div className="flex items-center gap-2 text-fg-2">
              <span className="size-2 rounded-full border border-muted" /> Forecast <span className="num ml-auto font-medium text-fg">{format(data[hover].forecast!)}</span>
            </div>
          )}
        </Tooltip>
      )}
    </div>
  );
}

/* ── Bars (grouped) ──────────────────────────────────────────────────────── */
export function BarChart({
  data,
  series,
  height = 220,
  format: fmt = "int",
  highlightLast,
}: {
  data: { label: string; values: Record<string, number> }[];
  series: { key: string; label: string; color: string }[];
  height?: number;
  format?: Fmt;
  highlightLast?: boolean;
}) {
  const format = FORMATS[fmt];
  const { ref, w } = useWidth();
  const [hover, setHover] = useState<number | null>(null);
  const pad = { l: 46, r: 6, t: 10, b: 24 };
  const iw = w - pad.l - pad.r;
  const ih = height - pad.t - pad.b;
  const top = niceMax(Math.max(...data.flatMap((d) => series.map((s) => d.values[s.key] ?? 0))));
  const band = iw / data.length;
  const gap = 2;
  const groupW = Math.min(band * 0.68, series.length * 18);
  const bw = (groupW - gap * (series.length - 1)) / series.length;
  const y = (v: number) => pad.t + ih - (v / top) * ih;
  const ticks = [0, top / 2, top];
  return (
    <div ref={ref} className="relative w-full select-none">
      <svg width={w} height={height} role="img" aria-label="Bar chart" onMouseLeave={() => setHover(null)}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={w - pad.r} y1={y(t)} y2={y(t)} stroke="var(--line)" />
            <text x={pad.l - 8} y={y(t) + 4} textAnchor="end" className="fill-[var(--faint)] text-[10.5px] num">
              {format(t)}
            </text>
          </g>
        ))}
        {data.map((d, i) => {
          const gx = pad.l + i * band + (band - groupW) / 2;
          const dim = hover != null && hover !== i;
          return (
            <g key={d.label} opacity={dim ? 0.45 : highlightLast && i !== data.length - 1 && hover == null ? 0.82 : 1} style={{ transition: "opacity .2s" }}>
              {series.map((s, k) => {
                const v = d.values[s.key] ?? 0;
                const h = Math.max(0, pad.t + ih - y(v));
                const bx = gx + k * (bw + gap);
                const r = Math.min(4, bw / 2, h);
                return (
                  <path
                    key={s.key}
                    d={`M${bx},${pad.t + ih} L${bx},${pad.t + ih - h + r} Q${bx},${pad.t + ih - h} ${bx + r},${pad.t + ih - h} L${bx + bw - r},${pad.t + ih - h} Q${bx + bw},${pad.t + ih - h} ${bx + bw},${pad.t + ih - h + r} L${bx + bw},${pad.t + ih} Z`}
                    fill={s.color}
                  />
                );
              })}
              <text x={pad.l + i * band + band / 2} y={height - 6} textAnchor="middle" className="fill-[var(--faint)] text-[10.5px]">
                {d.label}
              </text>
              <rect x={pad.l + i * band} y={pad.t} width={band} height={ih} fill="transparent" onMouseEnter={() => setHover(i)} />
            </g>
          );
        })}
      </svg>
      {hover != null && (
        <Tooltip x={pad.l + hover * band + band / 2} y={pad.t + 10} w={w}>
          <div className="font-medium text-fg">{data[hover].label}</div>
          {series.map((s) => (
            <div key={s.key} className="mt-0.5 flex items-center gap-2 text-fg-2">
              <span className="size-2 rounded-full" style={{ background: s.color }} /> {s.label}
              <span className="num ml-auto pl-4 font-medium text-fg">{format(data[hover].values[s.key] ?? 0)}</span>
            </div>
          ))}
        </Tooltip>
      )}
    </div>
  );
}

/* ── Ring gauge ──────────────────────────────────────────────────────────── */
export function Ring({ value, max, size = 168, stroke = 14, children, color = "var(--s1)" }: { value: number; max: number; size?: number; stroke?: number; children?: React.ReactNode; color?: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(1, value / max));
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-3)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${c * p} ${c}`}
          style={{ transition: "stroke-dasharray 1.2s var(--ease-out-expo), stroke .4s" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}

/* ── Sparkline ───────────────────────────────────────────────────────────── */
export function Spark({ values, width = 96, height = 28, color = "var(--s1)" }: { values: number[]; width?: number; height?: number; color?: string }) {
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const pts = values.map((v, i) => [(i / Math.max(1, values.length - 1)) * (width - 4) + 2, height - 3 - ((v - min) / Math.max(1, max - min)) * (height - 6)]);
  const d = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const last = pts[pts.length - 1];
  return (
    <svg width={width} height={height} aria-hidden>
      <path d={d} fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      {last && <circle cx={last[0]} cy={last[1]} r="2.5" fill={color} />}
    </svg>
  );
}

/* ── Heatmap (sequential, one hue) ───────────────────────────────────────── */
export function Heatmap({ rows, cols, values, format = (v) => `${Math.round(v * 100)}%` }: { rows: string[]; cols: string[]; values: number[][]; format?: (v: number) => string }) {
  const [hover, setHover] = useState<{ r: number; c: number } | null>(null);
  const steps = [8, 22, 40, 62, 86];
  const shade = (v: number) => {
    const i = Math.min(steps.length - 1, Math.floor(v * steps.length));
    return `color-mix(in srgb, var(--s1) ${steps[i]}%, var(--surface-3))`;
  };
  return (
    <div className="relative w-full">
      <div className="grid gap-[3px]" style={{ gridTemplateColumns: `34px repeat(${cols.length}, minmax(0, 1fr))` }} onMouseLeave={() => setHover(null)}>
        {rows.map((row, r) => (
          <Row key={row} label={row}>
            {cols.map((c, ci) => (
              <div
                key={c}
                onMouseEnter={() => setHover({ r, c: ci })}
                className={cn("h-6 rounded-[5px] transition-transform duration-200", hover?.r === r && hover?.c === ci && "scale-110 ring-2 ring-[var(--surface)]")}
                style={{ background: shade(values[r][ci]) }}
                title={`${row} ${c}: ${format(values[r][ci])}`}
              />
            ))}
          </Row>
        ))}
        <div />
        {cols.map((c, i) => (
          <div key={c} className="pt-1 text-center text-[10px] text-faint">
            {i % 3 === 0 ? c : ""}
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between text-[11.5px] text-muted">
        <span>{hover ? `${rows[hover.r]} · ${cols[hover.c]} — ${format(values[hover.r][hover.c])} of capacity` : "Hover a cell for detail"}</span>
        <span className="inline-flex items-center gap-1">
          Quiet
          {steps.map((s) => (
            <span key={s} className="inline-block h-2.5 w-4 rounded-[3px]" style={{ background: `color-mix(in srgb, var(--s1) ${s}%, var(--surface-3))` }} />
          ))}
          Packed
        </span>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <div className="flex items-center text-[11px] font-medium text-muted">{label}</div>
      {children}
    </>
  );
}

/* ── Stacked horizontal share bar ───────────────────────────────────────── */
export function ShareBar({ parts, format: fmt = "int" }: { parts: { label: string; value: number; color: string }[]; format?: Fmt }) {
  const format = FORMATS[fmt];
  const total = parts.reduce((a, p) => a + p.value, 0) || 1;
  const [hover, setHover] = useState<number | null>(null);
  const sorted = useMemo(() => parts, [parts]);
  return (
    <div>
      <div className="flex h-3 w-full gap-[2px] overflow-hidden rounded-full" onMouseLeave={() => setHover(null)}>
        {sorted.map((p, i) => (
          <div
            key={p.label}
            onMouseEnter={() => setHover(i)}
            className="h-full transition-opacity first:rounded-l-full last:rounded-r-full"
            style={{ width: `${(p.value / total) * 100}%`, background: p.color, opacity: hover == null || hover === i ? 1 : 0.4 }}
          />
        ))}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5">
        {sorted.map((p, i) => (
          <div key={p.label} className={cn("flex items-center gap-2 text-[12.5px] transition-opacity", hover != null && hover !== i && "opacity-50")}>
            <span className="size-2 shrink-0 rounded-full" style={{ background: p.color }} />
            <span className="truncate text-fg-2">{p.label}</span>
            <span className="num ml-auto text-fg">{format(p.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
