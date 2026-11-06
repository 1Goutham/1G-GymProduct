"use client";

import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";

/** Centered modal sheet with spring motion. */
export function Sheet({ open, onClose, title, subtitle, children, wide }: { open: boolean; onClose: () => void; title: string; subtitle?: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[70] grid place-items-end bg-black/25 backdrop-blur-[2px] sm:place-items-center sm:px-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ y: 40, opacity: 0.6, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 30, opacity: 0, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 460, damping: 38 }}
            onClick={(e) => e.stopPropagation()}
            className={`card max-h-[92dvh] w-full overflow-y-auto rounded-b-none p-6 sm:rounded-[22px] ${wide ? "sm:max-w-[640px]" : "sm:max-w-[460px]"}`}
          >
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-[18px] font-semibold tracking-[-0.02em] text-fg">{title}</h2>
                {subtitle && <p className="mt-0.5 text-[13px] text-muted">{subtitle}</p>}
              </div>
              <button type="button" className="btn btn-ghost !px-2" onClick={onClose} aria-label="Close">
                <X className="size-4" />
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12.5px] font-medium text-muted">{label}</span>
      {children}
    </label>
  );
}
