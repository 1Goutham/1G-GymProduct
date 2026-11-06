/* Minimal line illustrations. One stroke weight, soft fills, a single lime
 * accent. Drawn on a 160×120 grid so they sit together like a set. */

type P = { className?: string; size?: number };

const S = {
  stroke: "var(--fg)",
  soft: "var(--surface-3)",
  mid: "var(--line-strong)",
  accent: "var(--brand)",
  blue: "var(--s1)",
};

function Frame({ children, className, size = 160 }: P & { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 160 120" width={size} height={(size * 120) / 160} className={className} fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <ellipse cx="80" cy="108" rx="58" ry="5" fill={S.soft} />
      {children}
    </svg>
  );
}

export function DumbbellArt(p: P) {
  return (
    <Frame {...p}>
      <g className="float">
        <rect x="30" y="44" width="14" height="40" rx="5" fill={S.soft} stroke={S.stroke} strokeWidth="2" />
        <rect x="44" y="50" width="10" height="28" rx="4" fill={S.accent} stroke={S.stroke} strokeWidth="2" />
        <rect x="116" y="44" width="14" height="40" rx="5" fill={S.soft} stroke={S.stroke} strokeWidth="2" />
        <rect x="106" y="50" width="10" height="28" rx="4" fill={S.accent} stroke={S.stroke} strokeWidth="2" />
        <path d="M54 64h52" stroke={S.stroke} strokeWidth="5" />
        <path d="M66 60v8M74 60v8M86 60v8M94 60v8" stroke="var(--surface)" strokeWidth="1.5" />
      </g>
      <path d="M22 30l4 4M26 30l-4 4M136 22h6M139 19v6" stroke={S.mid} strokeWidth="2" />
    </Frame>
  );
}

export function TreadmillArt(p: P) {
  return (
    <Frame {...p}>
      <path d="M28 96 L118 96 Q130 96 132 88 L134 82" stroke={S.stroke} strokeWidth="2" />
      <rect x="26" y="84" width="104" height="12" rx="6" fill={S.soft} stroke={S.stroke} strokeWidth="2" />
      <path d="M38 90h80" stroke={S.mid} strokeWidth="2" strokeDasharray="4 5" />
      <path d="M112 84 L122 36" stroke={S.stroke} strokeWidth="2.5" />
      <rect x="108" y="22" width="34" height="18" rx="5" fill="var(--surface)" stroke={S.stroke} strokeWidth="2" />
      <path d="M114 31h8" stroke={S.blue} strokeWidth="2.5" />
      <circle cx="134" cy="31" r="2.5" fill={S.accent} stroke={S.stroke} strokeWidth="1.5" />
      <path d="M104 46 L84 50" stroke={S.stroke} strokeWidth="2" />
      <path d="M16 64h18M10 72h14M20 56h10" stroke={S.mid} strokeWidth="2" />
    </Frame>
  );
}

export function FingerprintArt(p: P) {
  return (
    <Frame {...p}>
      <rect x="48" y="14" width="64" height="88" rx="14" fill="var(--surface)" stroke={S.stroke} strokeWidth="2" />
      <rect x="56" y="22" width="48" height="40" rx="8" fill={S.soft} />
      <g stroke={S.stroke} strokeWidth="1.6">
        <path d="M70 52c0-8 4.5-14 10-14s10 6 10 14" />
        <path d="M74 54c0-6 2.5-10 6-10s6 4 6 10" />
        <path d="M80 50v8" />
        <path d="M66 48c1-10 6.5-16 14-16s13 6 14 16" />
      </g>
      <rect x="62" y="70" width="36" height="20" rx="6" fill={S.accent} stroke={S.stroke} strokeWidth="2" />
      <path d="M72 80l5 4 10-9" stroke="var(--brand-ink)" strokeWidth="2.2" />
      <path d="M122 34c6 4 6 16 0 20M130 28c10 7 10 25 0 32" stroke={S.blue} strokeWidth="2" />
      <path d="M38 34c-6 4-6 16 0 20M30 28c-10 7-10 25 0 32" stroke={S.mid} strokeWidth="2" />
    </Frame>
  );
}

export function WrenchArt(p: P) {
  return (
    <Frame {...p}>
      <circle cx="80" cy="58" r="34" fill={S.soft} />
      <g transform="rotate(-38 80 58)">
        <rect x="74" y="34" width="12" height="62" rx="6" fill="var(--surface)" stroke={S.stroke} strokeWidth="2" />
        <path d="M66 26a14 14 0 1 0 28 0l-6 4h-16z" fill={S.accent} stroke={S.stroke} strokeWidth="2" />
        <circle cx="80" cy="86" r="3" stroke={S.stroke} strokeWidth="2" />
      </g>
      <path d="M118 30l6-6M124 40h8M30 84h-8M36 92l-6 6" stroke={S.mid} strokeWidth="2" />
    </Frame>
  );
}

export function CartArt(p: P) {
  return (
    <Frame {...p}>
      <path d="M22 28h14l12 52h64l10-38H42" stroke={S.stroke} strokeWidth="2.2" />
      <rect x="54" y="30" width="22" height="20" rx="4" fill={S.soft} stroke={S.stroke} strokeWidth="2" />
      <rect x="80" y="22" width="26" height="28" rx="4" fill={S.accent} stroke={S.stroke} strokeWidth="2" />
      <path d="M88 30h10" stroke="var(--brand-ink)" strokeWidth="2" />
      <rect x="62" y="54" width="44" height="20" rx="4" fill="var(--surface)" stroke={S.stroke} strokeWidth="2" />
      <circle cx="58" cy="94" r="7" fill="var(--surface)" stroke={S.stroke} strokeWidth="2" />
      <circle cx="104" cy="94" r="7" fill="var(--surface)" stroke={S.stroke} strokeWidth="2" />
    </Frame>
  );
}

export function CoinsArt(p: P) {
  return (
    <Frame {...p}>
      <g stroke={S.stroke} strokeWidth="2">
        <ellipse cx="62" cy="88" rx="26" ry="8" fill={S.soft} />
        <path d="M36 88v-10M88 88v-10" />
        <ellipse cx="62" cy="78" rx="26" ry="8" fill={S.soft} />
        <path d="M36 78v-10M88 78v-10" />
        <ellipse cx="62" cy="68" rx="26" ry="8" fill={S.accent} />
      </g>
      <path d="M100 86 L112 64 L124 72 L140 40" stroke={S.blue} strokeWidth="2.5" />
      <path d="M132 40h8v8" stroke={S.blue} strokeWidth="2.5" />
      <text x="56" y="72" className="fill-[var(--brand-ink)] text-[11px] font-semibold">₹</text>
    </Frame>
  );
}

export function CoachArt(p: P) {
  return (
    <Frame {...p}>
      <circle cx="80" cy="34" r="14" fill={S.soft} stroke={S.stroke} strokeWidth="2" />
      <path d="M52 100c0-22 12-38 28-38s28 16 28 38" fill="var(--surface)" stroke={S.stroke} strokeWidth="2" />
      <path d="M80 62v18" stroke={S.stroke} strokeWidth="2" />
      <circle cx="80" cy="84" r="5" fill={S.accent} stroke={S.stroke} strokeWidth="2" />
      <rect x="112" y="40" width="30" height="38" rx="5" fill="var(--surface)" stroke={S.stroke} strokeWidth="2" />
      <path d="M119 50h16M119 58h10M119 66h14" stroke={S.mid} strokeWidth="2" />
      <path d="M118 50l2 2 4-4" stroke={S.blue} strokeWidth="2" />
      <path d="M26 46h12M32 40v12" stroke={S.mid} strokeWidth="2" />
    </Frame>
  );
}

export function SparkArt(p: P) {
  return (
    <Frame {...p}>
      <circle cx="80" cy="58" r="36" fill={S.soft} />
      <path d="M80 26 C84 50 90 54 112 58 C90 62 84 66 80 90 C76 66 70 62 48 58 C70 54 76 50 80 26Z" fill={S.accent} stroke={S.stroke} strokeWidth="2" />
      <path d="M120 24 C121 30 123 32 128 33 C123 34 121 36 120 42 C119 36 117 34 112 33 C117 32 119 30 120 24Z" fill="var(--surface)" stroke={S.stroke} strokeWidth="1.6" />
      <path d="M36 80 C37 84 38 85 42 86 C38 87 37 88 36 92 C35 88 34 87 30 86 C34 85 35 84 36 80Z" fill={S.blue} />
    </Frame>
  );
}

export function EmptyArt(p: P) {
  return (
    <Frame {...p}>
      <rect x="44" y="26" width="72" height="62" rx="12" fill="var(--surface)" stroke={S.stroke} strokeWidth="2" />
      <path d="M58 46h44M58 58h30M58 70h36" stroke={S.mid} strokeWidth="2.2" />
      <circle cx="112" cy="84" r="14" fill={S.accent} stroke={S.stroke} strokeWidth="2" />
      <path d="M106 84l4 4 8-8" stroke="var(--brand-ink)" strokeWidth="2.2" />
    </Frame>
  );
}

/* Hero: the whole gym in one breath — a building with a live pulse. */
export function HeroArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 360 200" className={className} fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <ellipse cx="180" cy="186" rx="150" ry="8" fill={S.soft} />
      <rect x="70" y="60" width="220" height="122" rx="16" fill="var(--surface)" stroke={S.stroke} strokeWidth="2" />
      <path d="M70 88h220" stroke={S.mid} strokeWidth="2" />
      <text x="88" y="80" className="fill-[var(--fg)] text-[13px] font-semibold" style={{ letterSpacing: "-0.02em" }}>1G</text>
      <circle cx="270" cy="74" r="5" fill={S.accent} />
      <circle cx="270" cy="74" r="10" stroke={S.accent} strokeOpacity="0.5" strokeWidth="2">
        <animate attributeName="r" values="6;14;6" dur="2.4s" repeatCount="indefinite" />
        <animate attributeName="stroke-opacity" values="0.7;0;0.7" dur="2.4s" repeatCount="indefinite" />
      </circle>
      {/* windows = zones */}
      <rect x="88" y="102" width="56" height="34" rx="8" fill={S.soft} />
      <rect x="152" y="102" width="56" height="34" rx="8" fill="color-mix(in srgb, var(--s1) 22%, var(--surface-3))" />
      <rect x="216" y="102" width="56" height="34" rx="8" fill="color-mix(in srgb, var(--s1) 50%, var(--surface-3))" />
      <path d="M100 126l10-10 8 6 14-12" stroke={S.stroke} strokeWidth="2" />
      <path d="M164 128h32M164 120h22" stroke={S.stroke} strokeWidth="2" />
      <path d="M228 112v16M238 116v12M248 108v20M258 118v10" stroke="var(--surface)" strokeWidth="3" />
      <rect x="160" y="146" width="40" height="36" rx="6" fill={S.soft} stroke={S.stroke} strokeWidth="2" />
      <path d="M180 146v36" stroke={S.stroke} strokeWidth="2" />
      {/* the pulse line */}
      <path d="M10 40 H96 l8 -16 l10 32 l8 -22 l6 6 H350" stroke={S.blue} strokeWidth="2" strokeOpacity="0.8" />
      <circle cx="40" cy="160" r="12" fill={S.accent} stroke={S.stroke} strokeWidth="2" />
      <path d="M36 160h8M40 156v8" stroke="var(--brand-ink)" strokeWidth="2" />
      <rect x="306" y="140" width="34" height="42" rx="6" fill="var(--surface)" stroke={S.stroke} strokeWidth="2" />
      <path d="M314 152c0-4 2-6 4-6s4 2 4 6M323 152c0-6 3-9 5-9" stroke={S.stroke} strokeWidth="1.6" />
      <rect x="312" y="164" width="22" height="10" rx="3" fill={S.accent} />
    </svg>
  );
}
