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

/* Hero: a product render of the entrance terminal — the device that makes the
 * whole system live. Graphite body, glass screen, a lime face-scan ring, and two
 * frosted cards carrying the real numbers. Lit like a product shot, in both themes. */
export function HeroArt({ className, inside = 0, entries = 0 }: { className?: string; inside?: number; entries?: number }) {
  return (
    <svg viewBox="24 22 496 300" className={className} fill="none" aria-hidden>
      <defs>
        <radialGradient id="hero-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--brand)" stopOpacity="0.28" />
          <stop offset="55%" stopColor="var(--s1)" stopOpacity="0.08" />
          <stop offset="100%" stopColor="var(--s1)" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="hero-body" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#3a3a3f" />
          <stop offset="45%" stopColor="#1c1c1f" />
          <stop offset="100%" stopColor="#0b0b0c" />
        </linearGradient>
        <linearGradient id="hero-edge" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="35%" stopColor="#ffffff" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.18" />
        </linearGradient>
        <linearGradient id="hero-screen" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#101a10" />
          <stop offset="60%" stopColor="#060807" />
          <stop offset="100%" stopColor="#020302" />
        </linearGradient>
        <linearGradient id="hero-sheen" x1="0" y1="0" x2="1" y2="0.6">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.16" />
          <stop offset="40%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="hero-scan" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--brand)" stopOpacity="0" />
          <stop offset="50%" stopColor="var(--brand)" stopOpacity="0.55" />
          <stop offset="100%" stopColor="var(--brand)" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="hero-stand" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#1a1a1c" />
          <stop offset="50%" stopColor="#4a4a50" />
          <stop offset="100%" stopColor="#141416" />
        </linearGradient>
        <filter id="hero-blur" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="10" />
        </filter>
        <filter id="hero-card" x="-30%" y="-30%" width="160%" height="180%">
          <feDropShadow dx="0" dy="14" stdDeviation="14" floodColor="#000" floodOpacity="0.16" />
        </filter>
        <clipPath id="hero-screen-clip">
          <rect x="222" y="58" width="116" height="164" rx="14" />
        </clipPath>
      </defs>

      {/* ambient light */}
      <ellipse cx="282" cy="160" rx="200" ry="150" fill="url(#hero-glow)" />

      {/* floor shadow */}
      <ellipse cx="282" cy="312" rx="92" ry="9" fill="#000" opacity="0.28" filter="url(#hero-blur)" />

      {/* stand */}
      <path d="M268 248 h28 l6 58 h-40 z" fill="url(#hero-stand)" />
      <rect x="240" y="302" width="84" height="8" rx="4" fill="url(#hero-stand)" />

      {/* device body */}
      <rect x="208" y="34" width="144" height="222" rx="28" fill="url(#hero-body)" />
      <rect x="208.5" y="34.5" width="143" height="221" rx="27.5" stroke="url(#hero-edge)" />
      {/* camera module */}
      <rect x="262" y="43" width="36" height="8" rx="4" fill="#050505" />
      <circle cx="272" cy="47" r="2.2" fill="#1d2a3a" />
      <circle cx="271.4" cy="46.4" r="0.7" fill="#7fb2ff" opacity="0.9" />
      <circle cx="289" cy="47" r="1.4" fill="#3a1010" />

      {/* screen */}
      <rect x="222" y="58" width="116" height="164" rx="14" fill="url(#hero-screen)" />
      <g clipPath="url(#hero-screen-clip)">
        {/* scan ring */}
        <circle cx="280" cy="122" r="36" stroke="var(--brand)" strokeOpacity="0.14" strokeWidth="8" />
        <circle cx="280" cy="122" r="36" stroke="var(--brand)" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="170 56" transform="rotate(-90 280 122)">
          <animateTransform attributeName="transform" type="rotate" from="-90 280 122" to="270 280 122" dur="6s" repeatCount="indefinite" />
        </circle>
        {/* minimal face glyph */}
        <circle cx="280" cy="114" r="10" stroke="#e9f9dc" strokeOpacity="0.85" strokeWidth="1.6" />
        <path d="M262 142 c4 -12 32 -12 36 0" stroke="#e9f9dc" strokeOpacity="0.85" strokeWidth="1.6" strokeLinecap="round" />
        {/* corner brackets */}
        <g stroke="var(--brand)" strokeWidth="1.6" strokeLinecap="round" opacity="0.8">
          <path d="M250 96 v-6 h6" />
          <path d="M310 96 v-6 h-6" />
          <path d="M250 148 v6 h6" />
          <path d="M310 148 v6 h-6" />
        </g>
        {/* scan sweep */}
        <rect x="222" y="0" width="116" height="26" fill="url(#hero-scan)" opacity="0.6">
          <animate attributeName="y" values="70;160;70" dur="3.6s" repeatCount="indefinite" />
        </rect>
        {/* verified pill */}
        <rect x="244" y="176" width="72" height="22" rx="11" fill="var(--brand)" />
        <path d="M256 187 l3.5 3.5 l6.5 -7" stroke="#0b1600" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <text x="292" y="191" textAnchor="middle" fill="#0b1600" style={{ fontSize: 10, fontWeight: 600, letterSpacing: "-0.01em" }}>
          Verified
        </text>
        <rect x="256" y="206" width="48" height="3" rx="1.5" fill="#ffffff" opacity="0.18" />
        {/* glass sheen */}
        <rect x="222" y="58" width="116" height="164" fill="url(#hero-sheen)" />
      </g>
      <rect x="208" y="34" width="144" height="222" rx="28" fill="url(#hero-sheen)" opacity="0.6" />

      {/* frosted card — live count */}
      <g filter="url(#hero-card)" className="float">
        <rect x="40" y="96" width="150" height="86" rx="18" fill="var(--surface)" fillOpacity="0.86" />
        <rect x="40.5" y="96.5" width="149" height="85" rx="17.5" stroke="var(--line-strong)" />
        <circle cx="60" cy="118" r="3.5" fill="var(--brand)" />
        <circle cx="60" cy="118" r="7" fill="var(--brand)" opacity="0.25">
          <animate attributeName="r" values="4;9;4" dur="2.4s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.35;0;0.35" dur="2.4s" repeatCount="indefinite" />
        </circle>
        <text x="72" y="122" fill="var(--muted)" style={{ fontSize: 11, fontWeight: 500 }}>
          Live now
        </text>
        <text x="56" y="160" fill="var(--fg)" style={{ fontSize: 32, fontWeight: 600, letterSpacing: "-0.04em", fontVariantNumeric: "tabular-nums" }}>
          {inside}
        </text>
        <text x={56 + String(inside).length * 19 + 6} y="160" fill="var(--muted)" style={{ fontSize: 11 }}>
          inside
        </text>
        {[10, 16, 13, 22, 18, 26].map((h, i) => (
          <rect key={i} x={142 + i * 7} y={164 - h} width="4" height={h} rx="2" fill="var(--s1)" opacity={0.35 + i * 0.12} />
        ))}
      </g>

      {/* frosted card — check-ins */}
      <g filter="url(#hero-card)" className="float" style={{ animationDelay: "-2.5s" }}>
        <rect x="376" y="176" width="124" height="62" rx="16" fill="var(--surface)" fillOpacity="0.86" />
        <rect x="376.5" y="176.5" width="123" height="61" rx="15.5" stroke="var(--line-strong)" />
        <text x="392" y="198" fill="var(--muted)" style={{ fontSize: 10.5, fontWeight: 500 }}>
          Check-ins today
        </text>
        <text x="392" y="224" fill="var(--fg)" style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.03em", fontVariantNumeric: "tabular-nums" }}>
          {entries.toLocaleString("en-IN")}
        </text>
        <path d="M452 224 C460 222 462 212 470 214 S480 204 488 202" stroke="var(--s1)" strokeWidth="2" strokeLinecap="round" />
        <circle cx="488" cy="202" r="2.5" fill="var(--s1)" />
      </g>
    </svg>
  );
}
