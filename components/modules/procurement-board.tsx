"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Sparkles, Check, X, Truck, PackageCheck, Trash2 } from "lucide-react";
import type { POStatus, Vendor } from "@/lib/types";
import { Badge, Meter, Td, Th } from "@/components/ui/primitives";
import { Sheet, Field } from "./sheet";
import { autoDraftPOs, createPO, setPOStatus } from "@/app/actions";
import { useToast } from "@/components/shell/shell";
import { ago, dateShort, inr } from "@/lib/format";
import { cn } from "@/lib/cn";

export interface PORow {
  id: string;
  title: string;
  vendor: string;
  total: number;
  status: POStatus;
  requestedBy: string;
  createdAt: string;
  expected: string | null;
  reason: string;
  source: "manual" | "ai";
  lines: { name: string; qty: number; unitCost: number }[];
}

export interface InvRow {
  id: string;
  sku: string;
  name: string;
  category: string;
  stock: number;
  reorderPoint: number;
  unitCost: number;
  daysLeft: number;
  low: boolean;
  suggestQty: number;
  vendor: string;
}

const STATUS: Record<POStatus, { tone: "muted" | "warn" | "info" | "ok" | "bad" | "brand"; label: string }> = {
  draft: { tone: "muted", label: "Draft" },
  pending: { tone: "warn", label: "Awaiting approval" },
  approved: { tone: "info", label: "Approved" },
  ordered: { tone: "brand", label: "Ordered" },
  received: { tone: "ok", label: "Received" },
  rejected: { tone: "bad", label: "Rejected" },
};

const STEPS: POStatus[] = ["pending", "approved", "ordered", "received"];

export function ProcurementBoard({ orders, inventory, vendors, openNew }: { orders: PORow[]; inventory: InvRow[]; vendors: Vendor[]; openNew: boolean }) {
  const [pending, start] = useTransition();
  const [sheet, setSheet] = useState(openNew);
  const [tab, setTab] = useState<"open" | "all">("open");
  const router = useRouter();
  const toast = useToast();

  const [title, setTitle] = useState("");
  const [vendorId, setVendorId] = useState(vendors[0]?.id ?? "");
  const [reason, setReason] = useState("");
  const [lines, setLines] = useState([{ name: "", qty: 1, unitCost: 0 }]);
  const total = lines.reduce((a, l) => a + l.qty * l.unitCost, 0);

  const act = (id: string, s: POStatus, msg: string) =>
    start(async () => {
      await setPOStatus(id, s);
      toast(msg);
      router.refresh();
    });

  const list = tab === "open" ? orders.filter((o) => !["received", "rejected"].includes(o.status)) : orders;
  const low = inventory.filter((i) => i.low);

  return (
    <div className="grid gap-5">
      {low.length > 0 && (
        <div className="card rise flex flex-col gap-4 overflow-hidden p-5 md:flex-row md:items-center md:p-6">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-brand text-brand-ink">
            <Sparkles className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[15px] font-semibold text-fg">{low.length} items need restocking</div>
            <div className="mt-0.5 text-[13px] text-muted">
              1G AI groups them by vendor and sizes each order for ~6 weeks of usage. {low.slice(0, 3).map((i) => i.name).join(", ")}
              {low.length > 3 ? ` and ${low.length - 3} more.` : "."}
            </div>
          </div>
          <button
            className="btn btn-ink"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const r = await autoDraftPOs();
                toast(r.ids.length ? `Drafted ${r.ids.join(", ")} for approval` : "Everything low already has an open PO", r.ids.length ? "ok" : "warn");
                router.refresh();
              })
            }
          >
            <Sparkles className="size-4" /> Auto-draft POs
          </button>
        </div>
      )}

      <section className="card rise min-w-0 pt-5 md:pt-6">
        <div className="flex flex-col gap-3 px-5 pb-4 sm:flex-row sm:items-center sm:justify-between md:px-6">
          <div>
            <h2 className="text-[16px] font-semibold tracking-[-0.015em] text-fg">Purchase orders</h2>
            <p className="text-[13px] text-muted">Request → approve → order → receive. Receiving updates stock and books the spend.</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="seg">
              <button data-active={tab === "open"} onClick={() => setTab("open")}>
                Open
              </button>
              <button data-active={tab === "all"} onClick={() => setTab("all")}>
                All
              </button>
            </div>
            <button className="btn btn-ink btn-sm" onClick={() => setSheet(true)}>
              <Plus className="size-3.5" /> New request
            </button>
          </div>
        </div>
        <div className="grid">
          {list.map((o) => {
            const step = STEPS.indexOf(o.status);
            return (
              <div key={o.id} className="row-line grid gap-3 border-t border-line px-5 py-4 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto] md:items-center md:px-6">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="num text-[12.5px] text-muted">{o.id}</span>
                    <span className="text-[14.5px] font-medium text-fg">{o.title}</span>
                    {o.source === "ai" && (
                      <Badge tone="brand">
                        <Sparkles className="size-3" /> AI
                      </Badge>
                    )}
                  </div>
                  <div className="mt-0.5 truncate text-[12.5px] text-muted">
                    {o.vendor} · {o.lines.length} line{o.lines.length > 1 ? "s" : ""} · by {o.requestedBy} {ago(o.createdAt)}
                  </div>
                  {o.reason && <div className="mt-1 line-clamp-1 text-[12.5px] text-fg-2">{o.reason}</div>}
                </div>
                <div>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <Badge tone={STATUS[o.status].tone} dot>
                      {STATUS[o.status].label}
                    </Badge>
                    <span className="num text-[15px] font-semibold text-fg">{inr(o.total)}</span>
                  </div>
                  {o.status !== "rejected" && (
                    <div className="flex gap-1">
                      {STEPS.map((s, i) => (
                        <span key={s} className={cn("h-1 flex-1 rounded-full", i <= step ? "bg-s1" : "bg-surface-3")} />
                      ))}
                    </div>
                  )}
                  {o.expected && o.status === "ordered" && <div className="mt-1.5 text-[11.5px] text-muted">ETA {dateShort(o.expected)}</div>}
                </div>
                <div className="flex gap-2 md:justify-end">
                  {o.status === "pending" && (
                    <>
                      <button className="btn btn-soft btn-sm" disabled={pending} onClick={() => act(o.id, "rejected", `${o.id} rejected`)}>
                        <X className="size-3.5" /> Reject
                      </button>
                      <button className="btn btn-ink btn-sm" disabled={pending} onClick={() => act(o.id, "approved", `${o.id} approved`)}>
                        <Check className="size-3.5" /> Approve
                      </button>
                    </>
                  )}
                  {o.status === "approved" && (
                    <button className="btn btn-ink btn-sm" disabled={pending} onClick={() => act(o.id, "ordered", `${o.id} sent to ${o.vendor}`)}>
                      <Truck className="size-3.5" /> Place order
                    </button>
                  )}
                  {o.status === "ordered" && (
                    <button className="btn btn-soft btn-sm" disabled={pending} onClick={() => act(o.id, "received", `${o.id} received — stock updated`)}>
                      <PackageCheck className="size-3.5" /> Mark received
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          {list.length === 0 && <div className="border-t border-line py-10 text-center text-[13.5px] text-muted">No open purchase orders.</div>}
        </div>
      </section>

      <section className="card rise min-w-0 pt-5 md:pt-6">
        <div className="px-5 pb-4 md:px-6">
          <h2 className="text-[16px] font-semibold tracking-[-0.015em] text-fg">Inventory</h2>
          <p className="text-[13px] text-muted">Supplements, consumables, merchandise and spare parts — with days of cover at current usage.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <Th>Item</Th>
                <Th>Category</Th>
                <Th>Stock</Th>
                <Th>Cover</Th>
                <Th>Vendor</Th>
                <Th className="text-right">Unit cost</Th>
              </tr>
            </thead>
            <tbody>
              {inventory.map((i) => (
                <tr key={i.id} className="hover:bg-hover">
                  <Td>
                    <div className="font-medium">{i.name}</div>
                    <div className="text-[12px] text-muted">{i.sku}</div>
                  </Td>
                  <Td className="text-fg-2">{i.category}</Td>
                  <Td>
                    <div className="flex w-36 items-center gap-2">
                      <Meter value={Math.min(1, i.stock / Math.max(1, i.reorderPoint * 2))} height={5} color={i.stock === 0 ? "var(--bad)" : i.low ? "var(--warn)" : "var(--ok)"} />
                      <span className={cn("num w-10 text-right", i.low && "font-medium text-warn", i.stock === 0 && "text-bad")}>{i.stock}</span>
                    </div>
                  </Td>
                  <Td className={cn(i.daysLeft < 14 ? "text-warn" : "text-fg-2")}>{i.daysLeft >= 999 ? "—" : i.stock === 0 ? <span className="text-bad">Out of stock</span> : `${i.daysLeft} days`}</Td>
                  <Td className="text-fg-2">{i.vendor}</Td>
                  <Td className="num text-right">{inr(i.unitCost)}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <Sheet open={sheet} onClose={() => setSheet(false)} title="New purchase request" subtitle="Goes to the owner for approval." wide>
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              try {
                const r = await createPO({ title, vendorId, reason, lines: lines.filter((l) => l.name.trim()), requestedBy: "Owner" });
                toast(`${r.id} submitted for approval`);
                setSheet(false);
                setTitle("");
                setReason("");
                setLines([{ name: "", qty: 1, unitCost: 0 }]);
                router.refresh();
              } catch {
                toast("Add a title and at least one line", "warn");
              }
            });
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Title">
              <input className="field" required minLength={3} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Resistance bands for studio" />
            </Field>
            <Field label="Vendor">
              <select className="field" value={vendorId} onChange={(e) => setVendorId(e.target.value)}>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div>
            <div className="mb-1.5 grid grid-cols-[minmax(0,1fr)_72px_104px_28px] gap-2 text-[12.5px] font-medium text-muted">
              <span>Item</span>
              <span>Qty</span>
              <span>Unit ₹</span>
              <span />
            </div>
            <div className="grid gap-2">
              {lines.map((l, i) => (
                <div key={i} className="grid grid-cols-[minmax(0,1fr)_72px_104px_28px] gap-2">
                  <input className="field" placeholder="Item name" value={l.name} onChange={(e) => setLines((x) => x.map((y, k) => (k === i ? { ...y, name: e.target.value } : y)))} list="inv-items" />
                  <input className="field num" type="number" min={1} value={l.qty} onChange={(e) => setLines((x) => x.map((y, k) => (k === i ? { ...y, qty: Math.max(1, Number(e.target.value)) } : y)))} />
                  <input className="field num" type="number" min={0} value={l.unitCost} onChange={(e) => setLines((x) => x.map((y, k) => (k === i ? { ...y, unitCost: Math.max(0, Number(e.target.value)) } : y)))} />
                  <button type="button" className="grid place-items-center text-faint hover:text-bad" onClick={() => setLines((x) => (x.length > 1 ? x.filter((_, k) => k !== i) : x))} aria-label="Remove line">
                    <Trash2 className="size-4" />
                  </button>
                </div>
              ))}
            </div>
            <datalist id="inv-items">
              {inventory.map((i) => (
                <option key={i.id} value={i.name} />
              ))}
            </datalist>
            <button type="button" className="btn btn-ghost btn-sm mt-2" onClick={() => setLines((x) => [...x, { name: "", qty: 1, unitCost: 0 }])}>
              <Plus className="size-3.5" /> Add line
            </button>
          </div>
          <Field label="Why do we need this?">
            <textarea className="field" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Helps the approver decide quickly" />
          </Field>
          <div className="flex items-center justify-between border-t border-line pt-4">
            <div>
              <div className="text-[12px] text-muted">Total (excl. GST)</div>
              <div className="num text-[20px] font-semibold text-fg">{inr(total)}</div>
            </div>
            <div className="flex gap-2">
              <button type="button" className="btn btn-soft" onClick={() => setSheet(false)}>
                Cancel
              </button>
              <button className="btn btn-ink" disabled={pending}>
                {pending ? "Submitting…" : "Submit for approval"}
              </button>
            </div>
          </div>
        </form>
      </Sheet>
    </div>
  );
}
