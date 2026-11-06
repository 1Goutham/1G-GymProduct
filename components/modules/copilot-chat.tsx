"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { ArrowUp, Sparkles, Square, RotateCcw } from "lucide-react";
import { cn } from "@/lib/cn";

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "How busy will it be this evening, and do we have enough trainers?",
  "Which machines should I service this week?",
  "Draft a WhatsApp renewal message for members expiring this week",
  "Why is this month's profit different from last month?",
  "Which trainers are free right now?",
  "What should I reorder, and from whom?",
];

/** Tiny, safe markdown: **bold**, _italic_, `code`, and "- " bullets. */
function Rich({ text }: { text: string }) {
  const lines = text.split("\n");
  const inline = (s: string, k: number) => {
    const parts = s.split(/(\*\*[^*]+\*\*|_[^_]+_|`[^`]+`)/g);
    return parts.map((p, i) => {
      if (p.startsWith("**") && p.endsWith("**")) return <strong key={`${k}-${i}`} className="font-semibold text-fg">{p.slice(2, -2)}</strong>;
      if (p.startsWith("_") && p.endsWith("_") && p.length > 2) return <em key={`${k}-${i}`} className="text-muted">{p.slice(1, -1)}</em>;
      if (p.startsWith("`") && p.endsWith("`")) return <code key={`${k}-${i}`} className="rounded bg-surface-3 px-1 font-mono text-[12.5px]">{p.slice(1, -1)}</code>;
      return <span key={`${k}-${i}`}>{p}</span>;
    });
  };
  const out: React.ReactNode[] = [];
  let bullets: string[] = [];
  const flush = (k: number) => {
    if (bullets.length) {
      out.push(
        <ul key={`ul${k}`} className="my-1.5 grid gap-1 pl-1">
          {bullets.map((b, i) => (
            <li key={i} className="flex gap-2">
              <span className="mt-[9px] size-1 shrink-0 rounded-full bg-muted" />
              <span>{inline(b, i)}</span>
            </li>
          ))}
        </ul>,
      );
      bullets = [];
    }
  };
  lines.forEach((l, i) => {
    const m = l.match(/^\s*(?:[-*•]|\d+\.)\s+(.*)/);
    if (m) bullets.push(m[1]);
    else {
      flush(i);
      if (l.trim() === "") out.push(<div key={i} className="h-2" />);
      else if (/^#{1,4}\s/.test(l)) out.push(<div key={i} className="mt-1 font-semibold text-fg">{inline(l.replace(/^#{1,4}\s/, ""), i)}</div>);
      else out.push(<p key={i}>{inline(l, i)}</p>);
    }
  });
  flush(lines.length);
  return <div className="text-[14.5px] leading-relaxed text-fg-2">{out}</div>;
}

export function CopilotChat({ engine, initialQuestion }: { engine: "claude" | "offline"; initialQuestion?: string }) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [msgs]);

  const send = async (text: string) => {
    const q = text.trim();
    if (!q || busy) return;
    const history: Msg[] = [...msgs, { role: "user", content: q }];
    setMsgs([...history, { role: "assistant", content: "" }]);
    setInput("");
    setBusy(true);
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const res = await fetch("/api/copilot", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ messages: history }), signal: ctrl.signal });
      if (!res.ok || !res.body) throw new Error(await res.text());
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += dec.decode(value, { stream: true });
        setMsgs((m) => [...m.slice(0, -1), { role: "assistant", content: acc }]);
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") setMsgs((m) => [...m.slice(0, -1), { role: "assistant", content: "_Couldn't reach the copilot. Check your connection and try again._" }]);
    } finally {
      setBusy(false);
      abortRef.current = null;
    }
  };

  useEffect(() => {
    if (initialQuestion && !started.current) {
      started.current = true;
      send(initialQuestion);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuestion]);

  return (
    <div className="card rise flex min-h-[calc(100dvh-220px)] flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-line px-5 py-3">
        <div className="flex items-center gap-2 text-[13px] text-muted">
          <span className={cn("size-2 rounded-full", engine === "claude" ? "bg-ok" : "bg-s1")} />
          {engine === "claude" ? "Claude · grounded in live gym data" : "1G engine · offline mode (add ANTHROPIC_API_KEY for Claude)"}
        </div>
        {msgs.length > 0 && (
          <button className="btn btn-ghost btn-sm" onClick={() => setMsgs([])} disabled={busy}>
            <RotateCcw className="size-3.5" /> New chat
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-6 md:px-8">
        {msgs.length === 0 ? (
          <div className="mx-auto flex max-w-2xl flex-col items-center pt-6 text-center">
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 260, damping: 18 }} className="grid size-16 place-items-center rounded-[22px] bg-ink text-brand shadow-[var(--shadow-pop)]">
              <Sparkles className="size-7" />
            </motion.div>
            <h2 className="display mt-5 text-[28px] text-fg">
              Ask anything about <span className="shimmer">your gym</span>.
            </h2>
            <p className="mt-2 max-w-md text-[14.5px] text-muted">The copilot sees the live floor, trainers, members, machines, purchases and the books — and answers with numbers, not guesses.</p>
            <div className="mt-8 grid w-full gap-2 sm:grid-cols-2">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => send(s)} className="rounded-2xl border border-line bg-surface-2 px-4 py-3 text-left text-[13.5px] text-fg-2 transition-all duration-300 hover:-translate-y-0.5 hover:border-line-strong hover:text-fg">
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mx-auto grid max-w-3xl gap-5">
            {msgs.map((m, i) =>
              m.role === "user" ? (
                <div key={i} className="ml-auto max-w-[85%] rounded-[20px] rounded-br-md bg-s1 px-4 py-2.5 text-[14.5px] text-white">
                  {m.content}
                </div>
              ) : (
                <div key={i} className="flex gap-3">
                  <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-ink text-brand">
                    <Sparkles className="size-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    {m.content ? (
                      <Rich text={m.content} />
                    ) : (
                      <div className="flex h-6 items-center gap-1">
                        {[0, 1, 2].map((d) => (
                          <motion.span key={d} className="size-1.5 rounded-full bg-muted" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1, repeat: Infinity, delay: d * 0.15 }} />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ),
            )}
            <div ref={endRef} />
          </div>
        )}
      </div>

      <form
        className="border-t border-line p-3 md:p-4"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <div className="mx-auto flex max-w-3xl items-end gap-2 rounded-[22px] bg-surface-3 p-1.5 pl-4 transition-shadow focus-within:shadow-[0_0_0_4px_color-mix(in_srgb,var(--s1)_18%,transparent)]">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            rows={1}
            placeholder="Ask about crowd, trainers, machines, money…"
            className="max-h-40 min-h-[38px] flex-1 resize-none bg-transparent py-2 text-[15px] text-fg outline-none placeholder:text-faint"
            aria-label="Message"
          />
          {busy ? (
            <button type="button" onClick={() => abortRef.current?.abort()} className="grid size-9 shrink-0 place-items-center rounded-full bg-ink text-ink-fg" aria-label="Stop">
              <Square className="size-3.5 fill-current" />
            </button>
          ) : (
            <button disabled={!input.trim()} className="grid size-9 shrink-0 place-items-center rounded-full bg-s1 text-white transition-opacity disabled:opacity-30" aria-label="Send">
              <ArrowUp className="size-4" />
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
