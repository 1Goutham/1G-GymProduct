/* AATHLYTX brand marks, drawn as vectors so they stay crisp at any size.
 * The mark inherits `currentColor` (ink in light, white in dark); the lime
 * stride is fixed brand colour. */

export const BRAND_LIME = "#9be22d";

const MARK = "M0 82 L41 5.5 Q50.5 -5 60 5.5 L102 82 H80.5 L57 27 L23 82 Z";
const STRIDE = "M40.5 82 L55 56.5 Q56.5 54 59.2 54 H77.5 L63.2 79.5 Q61.7 82 59 82 Z";

export function Mark({ size = 28, className, title }: { size?: number; className?: string; title?: string }) {
  return (
    <svg viewBox="-2 -4 106 90" width={size} height={(size * 90) / 106} className={className} role={title ? "img" : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      <path d={MARK} fill="currentColor" />
      <path d={STRIDE} fill={BRAND_LIME} />
    </svg>
  );
}

/* Wordmark glyphs on a 10-unit cap height. The A's are crossbar-less (Λ). */
const G = {
  A: { w: 12.4, d: "M0 10 L5.2 0 H7.2 L12.4 10 H9.8 L6.2 2.8 L2.6 10 Z" },
  T: { w: 10.3, d: "M0 0 H10.3 V2 H6.2 V10 H4.1 V2 H0 Z" },
  H: { w: 10.7, d: "M0 0 H2.1 V4 H8.6 V0 H10.7 V10 H8.6 V6 H2.1 V10 H0 Z" },
  L: { w: 8.5, d: "M0 0 H2.1 V8 H8.5 V10 H0 Z" },
  Y: { w: 11.5, d: "M0 0 H2.6 L5.75 4 L8.9 0 H11.5 L6.8 5.6 V10 H4.7 V5.6 Z" },
  X: { w: 11.5, d: "M0 0 H2.7 L5.75 3.7 L8.8 0 H11.5 L7.1 5 L11.5 10 H8.8 L5.75 6.3 L2.7 10 H0 L4.4 5 Z" },
} as const;
const LAYOUT: [keyof typeof G, number][] = [
  ["A", 0],
  ["A", 14.9],
  ["T", 28.4],
  ["H", 42.5],
  ["L", 58],
  ["Y", 67.6],
  ["T", 83],
  ["X", 96.3],
];

export function Wordmark({ height = 12, className }: { height?: number; className?: string }) {
  return (
    <svg viewBox="0 0 107.8 10" height={height} width={(height * 107.8) / 10} className={className} role="img" aria-label="AATHLYTX">
      {LAYOUT.map(([k, x], i) => (
        <path key={i} d={G[k].d} transform={`translate(${x} 0)`} fill="currentColor" />
      ))}
    </svg>
  );
}

export function Lockup({ markSize = 26, wordHeight = 11, className }: { markSize?: number; wordHeight?: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 text-fg ${className ?? ""}`}>
      <Mark size={markSize} />
      <Wordmark height={wordHeight} />
    </span>
  );
}
