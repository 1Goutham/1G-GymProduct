"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Sparkles, Wrench, ShieldCheck } from "lucide-react";
import type { EquipmentCategory, Severity, Vendor } from "@/lib/types";
import { Badge, Td, Th } from "@/components/ui/primitives";
import { Ring } from "@/components/charts/charts";
import { Sheet, Field } from "./sheet";
import { autoScheduleService, createTicket, reportFault } from "@/app/actions";
import { useToast } from "@/components/shell/shell";
import { dateShort, inrShort } from "@/lib/format";
import { cn } from "@/lib/cn";

export interface EqRow {
  id: string;
  tag: string;
  name: string;
  category: EquipmentCategory;
  brand: string;
  model: string;
  zone: string;
  status: "operational" | "attention" | "down";
  health: number;
  risk14: number;
  serviceDue: number;
  usageHours: number;
  lastService: string;
  warrantyUntil: string;
  inWarranty: boolean;
  cost: number;
  vendorId: string;
  reason: string;
  openFaults: number;
  hasTicket: boolean;
}

const CATS: ("All" | EquipmentCategory)[] = ["All", "Cardio", "Strength", "Free weights", "Functional", "Facility"];

function healthColor(h: number) {
  return h < 40 ? "var(--bad)" : h < 65 ? "var(--warn)" : "var(--ok)";
}

export function EquipmentBoard({ rows, vendors, openReport, focus }: { rows: EqRow[]; vendors: Vendor[]; openReport: boolean; focus?: string }) {
  const [cat, setCat] = useState<(typeof CATS)[number]>("All");
  const [sort, setSort] = useState<"risk" | "health" | "name">("risk");
  const [report, setReport] = useState(openReport);
  const [schedule, setSchedule] = useState<EqRow | null>(null);
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();

  useEffect(() => {
    if (focus) {
      const r = rows.find((x) => x.id === focus);
      if (r) setSchedule(r);
    }
  }, [focus, rows]);

  const list = useMemo(() => {
    const f = cat === "All" ? rows : rows.filter((r) => r.category === cat);
    return [...f].sort((a, b) => (sort === "risk" ? b.risk14 - a.risk14 : sort === "health" ? a.health - b.health : a.name.localeCompare(b.name)));
  }, [rows, cat, sort]);

  /* report form */
  const [eqId, setEqId] = useState(rows[0]?.id ?? "");
  const [issue, setIssue] = useState("");
  const [sev, setSev] = useState<Severity>("medium");
  const [who, setWho] = useState("");
  const [role, setRole] = useState<"member" | "trainer" | "staff">("staff");

  /* schedule form */
  const [vendorId, setVendorId] = useState("");
  const [days, setDays] = useState(2);
  const [type, setType] = useState<"preventive" | "breakdown" | "amc">("preventive");
  useEffect(() => {
    if (schedule) {
      setVendorId(schedule.vendorId);
      setType(schedule.status === "down" ? "breakdown" : "preventive");
      setDays(schedule.status === "down" ? 0 : 2);
    }
  }, [schedule]);

  return (
    <>
      <div className="flex flex-col gap-3 px-5 pb-4 md:flex-row md:items-center md:justify-between md:px-6">
        <div className="seg overflow-x-auto">
          {CATS.map((c) => (
            <button key={c} data-active={cat === c} onClick={() => setCat(c)}>
              {c}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className="field !h-[30px] !w-auto !rounded-[9px] !py-0 !text-[12.5px]" aria-label="Sort">
            <option value="risk">Sort: breakdown risk</option>
            <option value="health">Sort: health</option>
            <option value="name">Sort: name</option>
          </select>
          <button
            className="btn btn-soft btn-sm"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const r = await autoScheduleService();
                toast(r.count ? `Booked ${r.count} preventive visits` : "Nothing above 50% risk without a ticket", r.count ? "ok" : "warn");
                router.refresh();
              })
            }
          >
            <Sparkles className="size-3.5" /> Auto-schedule
          </button>
          <button className="btn btn-ink btn-sm" onClick={() => setReport(true)}>
            <Plus className="size-3.5" /> Report fault
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <Th>Asset</Th>
              <Th>Health</Th>
              <Th>14-day risk</Th>
              <Th>Service</Th>
              <Th>Usage</Th>
              <Th>Warranty</Th>
              <Th className="text-right">Action</Th>
            </tr>
          </thead>
          <tbody>
            {list.map((r) => (
              <tr key={r.id} className={cn("transition-colors hover:bg-hover", focus === r.id && "bg-[color-mix(in_srgb,var(--s1)_7%,transparent)]")}>
                <Td>
                  <div className="flex items-center gap-3">
                    <span className={cn("size-2 shrink-0 rounded-full", r.status === "down" ? "bg-bad" : r.status === "attention" ? "bg-warn" : "bg-ok")} title={r.status} />
                    <div className="min-w-0">
                      <div className="font-medium">
                        {r.name} {r.openFaults > 0 && <Badge tone="warn" className="ml-1">{r.openFaults} report{r.openFaults > 1 ? "s" : ""}</Badge>}
                      </div>
                      <div className="text-[12px] text-muted">
                        {r.tag} · {r.brand} {r.model}
                      </div>
                    </div>
                  </div>
                </Td>
                <Td>
                  <div className="flex items-center gap-2">
                    <Ring value={r.health} max={100} size={30} stroke={4} color={healthColor(r.health)} />
                    <span className="num font-medium">{r.health}</span>
                  </div>
                </Td>
                <Td>
                  {r.status === "down" ? (
                    <Badge tone="bad" dot>
                      Down
                    </Badge>
                  ) : (
                    <div>
                      <span className={cn("num font-medium", r.risk14 >= 0.7 ? "text-bad" : r.risk14 >= 0.5 ? "text-warn" : "text-fg")}>{Math.round(r.risk14 * 100)}%</span>
                      <div className="max-w-[220px] truncate text-[11.5px] text-muted" title={r.reason}>
                        {r.reason}
                      </div>
                    </div>
                  )}
                </Td>
                <Td className={cn("text-[13px]", r.serviceDue < 0 ? "text-bad" : r.serviceDue < 100 ? "text-warn" : "text-fg-2")}>{r.serviceDue < 0 ? `${-r.serviceDue}h overdue` : `in ${r.serviceDue}h`}</Td>
                <Td className="num text-fg-2">{r.usageHours.toLocaleString("en-IN")}h</Td>
                <Td>{r.inWarranty ? <span className="inline-flex items-center gap-1 text-[12.5px] text-ok"><ShieldCheck className="size-3.5" /> {dateShort(r.warrantyUntil)}</span> : <span className="text-[12.5px] text-muted">Expired</span>}</Td>
                <Td className="text-right">
                  {r.hasTicket ? (
                    <Badge tone="info">Ticket open</Badge>
                  ) : (
                    <button className="btn btn-soft btn-sm" onClick={() => setSchedule(r)}>
                      <Wrench className="size-3.5" /> Service
                    </button>
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Sheet open={report} onClose={() => setReport(false)} title="Report a fault" subtitle="Goes straight to the service queue. High severity takes the machine out of use.">
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              try {
                const r = await reportFault({ equipmentId: eqId, issue, severity: sev, reportedBy: who || "Front desk", role });
                toast(`Fault logged on ${r.name}`);
                setReport(false);
                setIssue("");
                router.refresh();
              } catch {
                toast("Describe the issue in a few words", "warn");
              }
            });
          }}
        >
          <Field label="Machine">
            <select className="field" value={eqId} onChange={(e) => setEqId(e.target.value)}>
              {CATS.slice(1).map((c) => (
                <optgroup key={c} label={c}>
                  {rows
                    .filter((r) => r.category === c)
                    .map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.tag})
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
          </Field>
          <Field label="What's wrong?">
            <textarea className="field" rows={3} required minLength={4} value={issue} onChange={(e) => setIssue(e.target.value)} placeholder="e.g. Belt slipping above 10 km/h" />
          </Field>
          <Field label="Severity">
            <div className="seg w-full">
              {(["low", "medium", "high"] as const).map((s) => (
                <button type="button" key={s} data-active={sev === s} onClick={() => setSev(s)} className="flex-1 justify-center capitalize">
                  {s}
                </button>
              ))}
            </div>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Reported by">
              <input className="field" value={who} onChange={(e) => setWho(e.target.value)} placeholder="Name" />
            </Field>
            <Field label="Role">
              <select className="field" value={role} onChange={(e) => setRole(e.target.value as typeof role)}>
                <option value="staff">Staff</option>
                <option value="trainer">Trainer</option>
                <option value="member">Member</option>
              </select>
            </Field>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" className="btn btn-soft" onClick={() => setReport(false)}>
              Cancel
            </button>
            <button className="btn btn-ink" disabled={pending}>
              {pending ? "Logging…" : "Log fault"}
            </button>
          </div>
        </form>
      </Sheet>

      <Sheet open={!!schedule} onClose={() => setSchedule(null)} title={schedule ? `Service ${schedule.name}` : ""} subtitle={schedule?.reason}>
        {schedule && (
          <form
            className="grid gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              start(async () => {
                await createTicket({ equipmentId: schedule.id, type, vendorId, inDays: days });
                toast(`Ticket raised with ${vendors.find((v) => v.id === vendorId)?.name}`);
                setSchedule(null);
                router.refresh();
              });
            }}
          >
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-surface-3 py-2.5">
                <div className="num text-[16px] font-semibold" style={{ color: healthColor(schedule.health) }}>
                  {schedule.health}
                </div>
                <div className="text-[11px] text-muted">health</div>
              </div>
              <div className="rounded-xl bg-surface-3 py-2.5">
                <div className="num text-[16px] font-semibold text-fg">{Math.round(schedule.risk14 * 100)}%</div>
                <div className="text-[11px] text-muted">14-day risk</div>
              </div>
              <div className="rounded-xl bg-surface-3 py-2.5">
                <div className="num text-[16px] font-semibold text-fg">{inrShort(schedule.cost)}</div>
                <div className="text-[11px] text-muted">asset value</div>
              </div>
            </div>
            <Field label="Type">
              <div className="seg w-full">
                {(["preventive", "breakdown", "amc"] as const).map((t) => (
                  <button type="button" key={t} data-active={type === t} onClick={() => setType(t)} className="flex-1 justify-center capitalize">
                    {t === "amc" ? "AMC" : t}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Vendor">
              <select className="field" value={vendorId} onChange={(e) => setVendorId(e.target.value)}>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} — {v.category} · ★{v.rating}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={`Visit in ${days === 0 ? "today" : `${days} day${days > 1 ? "s" : ""}`}`}>
              <input type="range" min={0} max={14} value={days} onChange={(e) => setDays(Number(e.target.value))} className="w-full accent-[var(--s1)]" />
            </Field>
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" className="btn btn-soft" onClick={() => setSchedule(null)}>
                Cancel
              </button>
              <button className="btn btn-ink" disabled={pending}>
                {pending ? "Sending…" : "Raise ticket"}
              </button>
            </div>
          </form>
        )}
      </Sheet>
    </>
  );
}
