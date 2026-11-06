"use client";

import { useState, useTransition } from "react";
import { Copy, Check, Send } from "lucide-react";
import { testPunch } from "@/app/actions";
import { useToast } from "@/components/shell/shell";
import { cn } from "@/lib/cn";

export function CopyBlock({ code, label }: { code: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <div className="relative">
      {label && <div className="mb-1.5 text-[12px] font-medium text-muted">{label}</div>}
      <pre className="overflow-x-auto rounded-2xl bg-[#1d1d1f] p-4 pr-12 font-mono text-[12.5px] leading-relaxed text-[#f5f5f7]">{code}</pre>
      <button
        type="button"
        className="absolute bottom-3 right-3 grid size-7 place-items-center rounded-lg bg-white/10 text-white/80 transition hover:bg-white/20"
        aria-label="Copy"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(code);
            setDone(true);
            setTimeout(() => setDone(false), 1400);
          } catch {}
        }}
      >
        {done ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      </button>
    </div>
  );
}

export function TestPunch() {
  const [id, setId] = useState("1042");
  const [dir, setDir] = useState<"auto" | "in" | "out">("auto");
  const [pending, start] = useTransition();
  const [last, setLast] = useState<{ name: string; direction: string; verified: boolean; note: string | null } | null>(null);
  const toast = useToast();
  return (
    <form
      className="grid gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await testPunch(id, dir);
          setLast(r);
          toast(r.verified ? `${r.name} checked ${r.direction}` : `${r.name}: ${r.note ?? "denied"}`, r.verified ? "ok" : "warn");
        });
      }}
    >
      <div className="flex flex-wrap gap-2">
        <input className="field num !w-36" value={id} onChange={(e) => setId(e.target.value)} placeholder="User ID / PIN" aria-label="User ID" />
        <div className="seg">
          {(["auto", "in", "out"] as const).map((d) => (
            <button type="button" key={d} data-active={dir === d} onClick={() => setDir(d)} className="capitalize">
              {d}
            </button>
          ))}
        </div>
        <button className="btn btn-ink" disabled={pending || !id.trim()}>
          <Send className="size-3.5" /> Send punch
        </button>
      </div>
      <p className="text-[12px] text-muted">Members are enrolled as 1001–2240, trainers as 9001–9012. Try an ID on an expired plan to see the gate hold.</p>
      {last && (
        <div className={cn("rounded-xl px-3 py-2 text-[13px]", last.verified ? "bg-ok-soft text-ok" : "bg-bad-soft text-bad")}>
          {last.name} — {last.verified ? `checked ${last.direction}` : last.note}
        </div>
      )}
    </form>
  );
}
