"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Search, Sun, Moon, Monitor, Menu, X, CornerDownLeft, Sparkles, CheckCircle2, AlertTriangle } from "lucide-react";
import { NAV, isActive } from "./nav";
import { cn } from "@/lib/cn";
import { Kbd } from "@/components/ui/primitives";
import { Mark, Wordmark } from "@/components/brand/logo";

/* ── Toasts ──────────────────────────────────────────────────────────────── */
type Toast = { id: number; text: string; tone: "ok" | "warn" };
const ToastCtx = createContext<(text: string, tone?: Toast["tone"]) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

/* ── Live count (shared via SSE) ─────────────────────────────────────────── */
const LiveCtx = createContext<{ inside: number; capacity: number } | null>(null);
export const useLiveCount = () => useContext(LiveCtx);

function ThemeToggle() {
  const [mode, setMode] = useState<"system" | "light" | "dark">("system");
  useEffect(() => {
    try {
      const m = localStorage.getItem("ax-theme");
      if (m === "light" || m === "dark") setMode(m);
    } catch {}
  }, []);
  const apply = (m: typeof mode) => {
    setMode(m);
    try {
      if (m === "system") {
        localStorage.removeItem("ax-theme");
        document.documentElement.removeAttribute("data-theme");
      } else {
        localStorage.setItem("ax-theme", m);
        document.documentElement.setAttribute("data-theme", m);
      }
    } catch {
      if (m === "system") document.documentElement.removeAttribute("data-theme");
      else document.documentElement.setAttribute("data-theme", m);
    }
  };
  const opts = [
    { m: "light" as const, I: Sun, l: "Light" },
    { m: "system" as const, I: Monitor, l: "System" },
    { m: "dark" as const, I: Moon, l: "Dark" },
  ];
  return (
    <div className="seg" role="radiogroup" aria-label="Theme">
      {opts.map(({ m, I, l }) => (
        <button key={m} data-active={mode === m} onClick={() => apply(m)} aria-label={l} title={l} className="!px-2">
          <I className="size-3.5" />
        </button>
      ))}
    </div>
  );
}

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const groups = ["Operate", "Assets", "Business", "System"] as const;
  const live = useLiveCount();
  return (
    <div className="flex h-full flex-col">
      <Link href="/" onClick={onNavigate} className="flex items-center gap-3 px-5 pb-5 pt-6 text-fg" aria-label="AATHLYTX home">
        <Mark size={30} />
        <span className="grid gap-1.5">
          <Wordmark height={11} />
          <span className="block text-[11.5px] leading-none text-muted">RP Fitness · Tenkasi</span>
        </span>
      </Link>
      <button
        onClick={() => window.dispatchEvent(new Event("ax:palette"))}
        className="mx-3 mb-4 flex h-9 items-center gap-2 rounded-[10px] bg-surface-3 px-3 text-[13px] text-muted transition-colors hover:text-fg"
      >
        <Search className="size-3.5" />
        <span className="flex-1 text-left">Search</span>
        <Kbd>⌘K</Kbd>
      </button>
      <nav className="flex-1 overflow-y-auto px-3 pb-4" aria-label="Primary">
        {groups.map((g) => (
          <div key={g} className="mb-3">
            <div className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-faint">{g}</div>
            {NAV.filter((n) => n.group === g).map((item) => {
              const active = isActive(pathname, item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={cn("relative flex h-9 items-center gap-3 rounded-[10px] px-3 text-[14px] transition-colors", active ? "font-medium text-fg" : "text-fg-2 hover:bg-hover")}
                >
                  {active && <motion.span layoutId="nav-active" className="absolute inset-0 rounded-[10px] bg-surface shadow-[0_1px_3px_rgba(0,0,0,0.08)]" transition={{ type: "spring", stiffness: 520, damping: 42 }} />}
                  <Icon className={cn("relative size-[17px]", active ? "text-s1" : "text-muted")} strokeWidth={1.8} />
                  <span className="relative flex-1">{item.label}</span>
                  {item.href === "/live" && live && (
                    <span className="relative inline-flex items-center gap-1.5 text-[11.5px] font-medium text-muted num">
                      <span className="live-dot !size-1.5" />
                      {live.inside}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
      <div className="flex items-center justify-between gap-2 border-t border-line px-4 py-3">
        <div className="flex items-center gap-2 text-[12px] text-muted">
          <span className="grid size-7 place-items-center rounded-full bg-surface-3 text-[11px] font-semibold text-fg-2">GG</span>
          Owner
        </div>
        <ThemeToggle />
      </div>
    </div>
  );
}

/* ── Command palette ─────────────────────────────────────────────────────── */
const ACTIONS = [
  { label: "Report an equipment fault", href: "/equipment?report=1", hint: "Equipment" },
  { label: "Raise a purchase request", href: "/procurement?new=1", hint: "Procurement" },
  { label: "Ask Copilot", href: "/copilot", hint: "AI" },
  { label: "Collect overdue dues", href: "/finance#dues", hint: "Finance" },
  { label: "At-risk members", href: "/members?filter=risk", hint: "Members" },
  { label: "Renewals due", href: "/members?filter=expiring", hint: "Members" },
  { label: "Connect a biometric terminal", href: "/devices#connect", hint: "Biometrics" },
];

function Palette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [i, setI] = useState(0);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") setOpen(false);
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("ax:palette", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("ax:palette", onOpen);
    };
  }, []);
  useEffect(() => {
    if (open) {
      setQ("");
      setI(0);
      setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [open]);
  const items = useMemo(() => {
    const all = [...NAV.map((n) => ({ label: n.label, href: n.href, hint: "Go to" })), ...ACTIONS];
    const s = q.trim().toLowerCase();
    const list = s ? all.filter((x) => x.label.toLowerCase().includes(s) || x.hint.toLowerCase().includes(s)) : all;
    if (s) list.push({ label: `Ask Copilot: “${q.trim()}”`, href: `/copilot?q=${encodeURIComponent(q.trim())}`, hint: "AI" });
    return list;
  }, [q]);
  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[80] flex items-start justify-center bg-black/25 px-4 pt-[12vh] backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)}>
          <motion.div
            className="glass w-full max-w-[560px] overflow-hidden rounded-[20px] shadow-[var(--shadow-pop)]"
            initial={{ y: -12, scale: 0.98, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: -8, scale: 0.98, opacity: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 38 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-line px-4">
              <Search className="size-4 text-muted" />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setI(0);
                }}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setI((x) => Math.min(items.length - 1, x + 1));
                  }
                  if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setI((x) => Math.max(0, x - 1));
                  }
                  if (e.key === "Enter" && items[i]) go(items[i].href);
                }}
                placeholder="Search modules, actions, or ask anything…"
                className="h-14 flex-1 bg-transparent text-[16px] text-fg outline-none placeholder:text-faint"
              />
              <Kbd>esc</Kbd>
            </div>
            <div className="max-h-[50vh] overflow-y-auto p-2">
              {items.map((it, k) => (
                <button
                  key={it.label + it.href}
                  onMouseEnter={() => setI(k)}
                  onClick={() => go(it.href)}
                  className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[14px]", k === i ? "bg-s1 text-white" : "text-fg")}
                >
                  {it.hint === "AI" ? <Sparkles className="size-4 opacity-80" /> : <span className="size-4" />}
                  <span className="flex-1 truncate">{it.label}</span>
                  <span className={cn("text-[12px]", k === i ? "text-white/80" : "text-muted")}>{it.hint}</span>
                  {k === i && <CornerDownLeft className="size-3.5 opacity-80" />}
                </button>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ── Shell ───────────────────────────────────────────────────────────────── */
export function Shell({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [drawer, setDrawer] = useState(false);
  const [live, setLive] = useState<{ inside: number; capacity: number } | null>(null);
  const pathname = usePathname();

  const toast = useCallback((text: string, tone: Toast["tone"] = "ok") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3600);
  }, []);

  useEffect(() => {
    let es: EventSource | null = null;
    try {
      es = new EventSource("/api/live/stream?lite=1");
      es.onmessage = (e) => {
        try {
          const d = JSON.parse(e.data);
          setLive({ inside: d.inside, capacity: d.capacity });
        } catch {}
      };
    } catch {}
    return () => es?.close();
  }, []);

  useEffect(() => setDrawer(false), [pathname]);

  return (
    <ToastCtx.Provider value={toast}>
      <LiveCtx.Provider value={live}>
        <div className="min-h-dvh">
          <aside className="fixed inset-y-0 left-0 z-40 hidden w-[248px] border-r border-line bg-[color-mix(in_srgb,var(--bg)_86%,var(--surface))] lg:block">
            <Sidebar />
          </aside>

          {/* mobile top bar */}
          <div className="glass sticky top-0 z-40 flex h-14 items-center justify-between border-b border-line px-4 lg:hidden">
            <button className="btn btn-ghost !px-2" aria-label="Open menu" onClick={() => setDrawer(true)}>
              <Menu className="size-5" />
            </button>
            <Link href="/" className="flex items-center gap-2.5 text-fg" aria-label="AATHLYTX home">
              <Mark size={24} />
              <Wordmark height={10} />
            </Link>
            <button className="btn btn-ghost !px-2" aria-label="Search" onClick={() => window.dispatchEvent(new Event("ax:palette"))}>
              <Search className="size-5" />
            </button>
          </div>
          <AnimatePresence>
            {drawer && (
              <>
                <motion.div className="fixed inset-0 z-50 bg-black/30 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDrawer(false)} />
                <motion.aside
                  className="fixed inset-y-0 left-0 z-50 w-[280px] bg-bg shadow-[var(--shadow-pop)] lg:hidden"
                  initial={{ x: -300 }}
                  animate={{ x: 0 }}
                  exit={{ x: -300 }}
                  transition={{ type: "spring", stiffness: 420, damping: 40 }}
                >
                  <button className="btn btn-ghost absolute right-3 top-5 !px-2" aria-label="Close menu" onClick={() => setDrawer(false)}>
                    <X className="size-5" />
                  </button>
                  <Sidebar onNavigate={() => setDrawer(false)} />
                </motion.aside>
              </>
            )}
          </AnimatePresence>

          <main className="lg:pl-[248px]">
            <div className="mx-auto w-full max-w-[1320px] px-4 pb-24 pt-6 sm:px-6 md:pt-10 lg:px-10">{children}</div>
          </main>
          <Palette />

          <div className="pointer-events-none fixed inset-x-0 bottom-5 z-[90] flex flex-col items-center gap-2 px-4">
            <AnimatePresence>
              {toasts.map((t) => (
                <motion.div
                  key={t.id}
                  initial={{ y: 16, opacity: 0, scale: 0.96 }}
                  animate={{ y: 0, opacity: 1, scale: 1 }}
                  exit={{ y: 8, opacity: 0, scale: 0.97 }}
                  transition={{ type: "spring", stiffness: 500, damping: 36 }}
                  className="glass pointer-events-auto flex items-center gap-2 rounded-full px-4 py-2.5 text-[13.5px] font-medium text-fg shadow-[var(--shadow-pop)]"
                >
                  {t.tone === "ok" ? <CheckCircle2 className="size-4 text-ok" /> : <AlertTriangle className="size-4 text-warn" />}
                  {t.text}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </LiveCtx.Provider>
    </ToastCtx.Provider>
  );
}
