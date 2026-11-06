"use client";

import { useEffect, useState } from "react";
import type { LiveSnapshot } from "@/lib/types";

/** Subscribes to the live floor stream; falls back to polling if SSE drops. */
export function useLive(initial: LiveSnapshot) {
  const [snap, setSnap] = useState(initial);
  const [connected, setConnected] = useState(false);
  useEffect(() => {
    let es: EventSource | null = null;
    let poll: ReturnType<typeof setInterval> | undefined;
    const startPoll = () => {
      if (poll) return;
      poll = setInterval(async () => {
        try {
          const r = await fetch("/api/live", { cache: "no-store" });
          if (r.ok) setSnap(await r.json());
        } catch {}
      }, 4000);
    };
    try {
      es = new EventSource("/api/live/stream");
      es.onopen = () => setConnected(true);
      es.onmessage = (e) => {
        try {
          setSnap(JSON.parse(e.data));
          setConnected(true);
        } catch {}
      };
      es.onerror = () => {
        setConnected(false);
        startPoll();
      };
    } catch {
      startPoll();
    }
    return () => {
      es?.close();
      if (poll) clearInterval(poll);
    };
  }, []);
  return { snap, connected };
}
