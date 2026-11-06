import { snapshot } from "@/lib/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Server-sent events: a fresh floor snapshot every 2 seconds. */
export function GET(req: Request) {
  const lite = new URL(req.url).searchParams.get("lite") === "1";
  const enc = new TextEncoder();
  let timer: ReturnType<typeof setInterval> | undefined;
  const stream = new ReadableStream({
    start(controller) {
      const send = () => {
        try {
          const s = snapshot();
          const body = lite ? { inside: s.inside, capacity: s.capacity, now: s.now } : s;
          controller.enqueue(enc.encode(`data: ${JSON.stringify(body)}\n\n`));
        } catch {
          clearInterval(timer);
        }
      };
      send();
      timer = setInterval(send, lite ? 5000 : 2000);
      req.signal.addEventListener("abort", () => {
        clearInterval(timer);
        try {
          controller.close();
        } catch {}
      });
    },
    cancel() {
      clearInterval(timer);
    },
  });
  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
    },
  });
}
