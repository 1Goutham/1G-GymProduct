"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { Search, MessageCircle, UserCheck } from "lucide-react";
import { Avatar, Badge, Meter, Td, Th } from "@/components/ui/primitives";
import { ago, dateShort, inr } from "@/lib/format";
import { nudgeMembers } from "@/app/actions";
import { useToast } from "@/components/shell/shell";
import { cn } from "@/lib/cn";

export interface MemberRow {
  id: string;
  name: string;
  phone: string;
  plan: string;
  status: "active" | "expiring" | "expired" | "frozen";
  expires: string;
  visits30: number;
  lastVisit: string | null;
  churnRisk: number;
  balanceDue: number;
  trainer: string | null;
  goal: string;
  inside: boolean;
}

const FILTERS = [
  { id: "all", label: "All" },
  { id: "inside", label: "In the gym" },
  { id: "risk", label: "At risk" },
  { id: "expiring", label: "Renewals" },
  { id: "expired", label: "Lapsed" },
];

const STATUS_TONE = { active: "ok", expiring: "warn", expired: "bad", frozen: "muted" } as const;

export function MembersTable({ rows, filter, now }: { rows: MemberRow[]; filter: string; now: number }) {
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [pending, start] = useTransition();
  const toast = useToast();
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    const f = s ? rows.filter((r) => r.name.toLowerCase().includes(s) || r.phone.includes(s) || r.id.includes(s)) : rows;
    return f.slice(0, 150);
  }, [q, rows]);
  const allSel = list.length > 0 && list.every((r) => sel.has(r.id));
  const toggle = (id: string) => setSel((x) => {
    const n = new Set(x);
    if (n.has(id)) n.delete(id);
    else n.add(id);
    return n;
  });
  const act = (channel: "whatsapp" | "trainer") =>
    start(async () => {
      const ids = sel.size ? [...sel] : list.map((r) => r.id);
      const r = await nudgeMembers(ids, channel);
      toast(channel === "whatsapp" ? `Renewal links sent to ${r.n} members` : `${r.n} members assigned for trainer check-ins`);
      setSel(new Set());
    });

  return (
    <div>
      <div className="flex flex-col gap-3 px-5 pb-4 md:flex-row md:items-center md:justify-between md:px-6">
        <div className="seg overflow-x-auto">
          {FILTERS.map((f) => (
            <Link key={f.id} href={f.id === "all" ? "/members" : `/members?filter=${f.id}`} data-active={filter === f.id} scroll={false}>
              {f.label}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-full md:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, phone, ID" className="field !h-[34px] !pl-9 !text-[13.5px]" />
          </div>
          <button className="btn btn-soft btn-sm" disabled={pending} onClick={() => act("whatsapp")} title="Send renewal / win-back link on WhatsApp">
            <MessageCircle className="size-3.5" /> {sel.size ? `Message ${sel.size}` : "Message all"}
          </button>
          <button className="btn btn-ink btn-sm hidden sm:inline-flex" disabled={pending} onClick={() => act("trainer")}>
            <UserCheck className="size-3.5" /> Trainer check-in
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <Th className="w-8">
                <input type="checkbox" aria-label="Select all" checked={allSel} onChange={() => setSel(allSel ? new Set() : new Set(list.map((r) => r.id)))} className="accent-[var(--s1)]" />
              </Th>
              <Th>Member</Th>
              <Th>Plan</Th>
              <Th>Status</Th>
              <Th>Visits · 30d</Th>
              <Th>Last visit</Th>
              <Th>Churn risk</Th>
              <Th className="text-right">Due</Th>
            </tr>
          </thead>
          <tbody>
            {list.map((r) => (
              <tr key={r.id} className={cn("transition-colors hover:bg-hover", sel.has(r.id) && "bg-hover")}>
                <Td>
                  <input type="checkbox" aria-label={`Select ${r.name}`} checked={sel.has(r.id)} onChange={() => toggle(r.id)} className="accent-[var(--s1)]" />
                </Td>
                <Td>
                  <div className="flex items-center gap-2.5">
                    <span className="relative">
                      <Avatar name={r.name} size={30} />
                      {r.inside && <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-[var(--surface)] bg-brand" title="In the gym" />}
                    </span>
                    <div className="min-w-0">
                      <div className="font-medium">{r.name}</div>
                      <div className="text-[12px] text-muted">
                        {r.id.toUpperCase()} · {r.goal}
                        {r.trainer ? ` · ${r.trainer}` : ""}
                      </div>
                    </div>
                  </div>
                </Td>
                <Td className="text-fg-2">{r.plan}</Td>
                <Td>
                  <Badge tone={STATUS_TONE[r.status]} dot>
                    {r.status === "expiring" ? `Ends ${dateShort(r.expires)}` : r.status === "expired" ? `Lapsed ${dateShort(r.expires)}` : r.status[0].toUpperCase() + r.status.slice(1)}
                  </Badge>
                </Td>
                <Td>
                  <div className="flex items-center gap-2">
                    <span className="num w-5 text-right">{r.visits30}</span>
                    <div className="flex h-4 items-end gap-[2px]" aria-hidden>
                      {Array.from({ length: 8 }).map((_, i) => (
                        <span key={i} className="w-[3px] rounded-sm" style={{ height: `${25 + ((i * 37 + r.visits30 * 11) % 75)}%`, background: i < Math.round((r.visits30 / 26) * 8) ? "var(--s1)" : "var(--surface-3)" }} />
                      ))}
                    </div>
                  </div>
                </Td>
                <Td className="text-fg-2">{r.inside ? <span className="text-brand-text">Training now</span> : ago(r.lastVisit, now)}</Td>
                <Td>
                  {r.status === "expired" ? (
                    <span className="text-[12.5px] text-muted">—</span>
                  ) : (
                    <div className="flex w-28 items-center gap-2">
                      <Meter value={r.churnRisk} height={5} color={r.churnRisk >= 0.75 ? "var(--bad)" : r.churnRisk >= 0.5 ? "var(--warn)" : "var(--ok)"} />
                      <span className="num w-8 text-right text-[12px] text-muted">{Math.round(r.churnRisk * 100)}</span>
                    </div>
                  )}
                </Td>
                <Td className={cn("num text-right", r.balanceDue > 0 ? "font-medium text-warn" : "text-faint")}>{r.balanceDue > 0 ? inr(r.balanceDue) : "—"}</Td>
              </tr>
            ))}
          </tbody>
        </table>
        {list.length === 0 && <div className="py-12 text-center text-[13.5px] text-muted">No members match “{q}”.</div>}
      </div>
      <div className="px-5 py-3 text-[12px] text-muted md:px-6">
        Showing {list.length} of {rows.length.toLocaleString("en-IN")}
      </div>
    </div>
  );
}
