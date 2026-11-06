"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Send, Check } from "lucide-react";
import { Avatar, Badge, Td, Th } from "@/components/ui/primitives";
import { markInvoicePaid, sendReminders } from "@/app/actions";
import { useToast } from "@/components/shell/shell";
import { daysUntil, inr } from "@/lib/format";

export interface DueRow {
  id: string;
  member: string;
  phone: string;
  description: string;
  amount: number;
  due: string;
  status: "due" | "overdue";
}

export function DuesTable({ rows, now }: { rows: DueRow[]; now: number }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const toast = useToast();
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 pb-4 md:px-6">
        <div>
          <h2 className="text-[16px] font-semibold tracking-[-0.015em] text-fg">Dues & collections</h2>
          <p className="text-[13px] text-muted">{rows.length} unpaid invoices · {inr(rows.reduce((a, r) => a + r.amount, 0))}</p>
        </div>
        <button
          className="btn btn-ink btn-sm"
          disabled={pending || rows.length === 0}
          onClick={() =>
            start(async () => {
              const r = await sendReminders(rows.map((x) => x.id));
              toast(`WhatsApp reminders with UPI link sent to ${r.n} members`);
              router.refresh();
            })
          }
        >
          <Send className="size-3.5" /> Remind all
        </button>
      </div>
      <div className="max-h-[420px] overflow-auto">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 z-[1] bg-surface">
            <tr>
              <Th>Member</Th>
              <Th>Invoice</Th>
              <Th>Status</Th>
              <Th className="text-right">Amount</Th>
              <Th className="text-right">Action</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const d = daysUntil(r.due, now);
              return (
                <tr key={r.id} className="hover:bg-hover">
                  <Td>
                    <div className="flex items-center gap-2.5">
                      <Avatar name={r.member} size={28} />
                      <div>
                        <div className="font-medium">{r.member}</div>
                        <div className="text-[12px] text-muted">{r.phone}</div>
                      </div>
                    </div>
                  </Td>
                  <Td>
                    <div className="text-fg-2">{r.description}</div>
                    <div className="num text-[12px] text-muted">{r.id}</div>
                  </Td>
                  <Td>
                    <Badge tone={r.status === "overdue" ? "bad" : "warn"} dot>
                      {r.status === "overdue" ? `${-d}d overdue` : d === 0 ? "Due today" : `Due in ${d}d`}
                    </Badge>
                  </Td>
                  <Td className="num text-right font-medium">{inr(r.amount)}</Td>
                  <Td className="text-right">
                    <button
                      className="btn btn-soft btn-sm"
                      disabled={pending}
                      onClick={() =>
                        start(async () => {
                          await markInvoicePaid(r.id);
                          toast(`${r.id} marked paid`);
                          router.refresh();
                        })
                      }
                    >
                      <Check className="size-3.5" /> Paid
                    </button>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {rows.length === 0 && <div className="py-10 text-center text-[13.5px] text-muted">All dues collected. Nice.</div>}
      </div>
    </>
  );
}
