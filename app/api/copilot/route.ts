import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { businessContext, offlineAnswer } from "@/lib/ai/engine";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const Body = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(8000) }))
    .min(1)
    .max(40),
});

const SYSTEM = `You are 1G Copilot, the operations analyst inside 1Gtemplates — an ERP for gyms.
You help the owner and managers run the gym: live crowd and capacity, trainer availability, members and churn, equipment health and service, procurement and inventory, and finance.

How to answer:
- Ground every number in the LIVE CONTEXT block in the user's latest message. Never invent figures; if something isn't in the context, say what data would be needed.
- Lead with the answer in one or two sentences, then give specific next actions (who, what, by when). Use short bullet lists and **bold** for key numbers.
- Money is Indian Rupees (₹, lakh/crore notation is fine). Times are the gym's local time.
- Be concise: under 180 words unless the user asks for a plan, report or draft message.
- When asked to draft a message (WhatsApp, email), write it ready to send, warm and brief.`;

function hasCredentials() {
  return !!(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}

function textStream(produce: (push: (s: string) => void) => Promise<void>) {
  const enc = new TextEncoder();
  return new Response(
    new ReadableStream({
      async start(controller) {
        try {
          await produce((s) => controller.enqueue(enc.encode(s)));
        } finally {
          controller.close();
        }
      },
    }),
    { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-cache", "x-copilot-engine": hasCredentials() ? "claude" : "offline" } },
  );
}

async function offline(push: (s: string) => void, question: string, note?: string) {
  const answer = (note ? `_${note}_\n\n` : "") + offlineAnswer(question);
  // stream it so the UI behaves the same either way
  for (const chunk of answer.match(/.{1,24}/gs) ?? []) {
    push(chunk);
    await new Promise((r) => setTimeout(r, 12));
  }
}

export async function POST(req: Request) {
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return Response.json({ error: "Send { messages: [{ role, content }] }" }, { status: 400 });
  }
  const last = body.messages[body.messages.length - 1];
  if (last.role !== "user") return Response.json({ error: "Last message must be from the user" }, { status: 400 });

  if (!hasCredentials()) return textStream((push) => offline(push, last.content));

  const context = JSON.stringify(businessContext(), null, 1);
  const history: Anthropic.Beta.BetaMessageParam[] = body.messages.slice(0, -1).map((m) => ({ role: m.role, content: m.content }));
  history.push({
    role: "user",
    content: [
      { type: "text", text: `<live_context generated="${new Date().toISOString()}">\n${context}\n</live_context>` },
      { type: "text", text: last.content },
    ],
  });

  return textStream(async (push) => {
    const client = new Anthropic();
    try {
      const stream = client.beta.messages.stream({
        model: "claude-opus-5-5",
        max_tokens: 4000,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        output_config: { effort: "low" },
        system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
        messages: history,
      });
      stream.on("text", (t) => push(t));
      const final = await stream.finalMessage();
      if (final.stop_reason === "refusal") {
        push("\n\n_I can't help with that one — try rephrasing it as an operations question._");
      }
    } catch (err) {
      const msg =
        err instanceof Anthropic.AuthenticationError
          ? "Claude key rejected — answering from the built-in engine."
          : err instanceof Anthropic.RateLimitError
            ? "Claude is rate-limited right now — answering from the built-in engine."
            : err instanceof Anthropic.APIError
              ? `Claude unavailable (${err.status ?? "network"}) — answering from the built-in engine.`
              : "Claude unavailable — answering from the built-in engine.";
      await offline(push, last.content, msg);
    }
  });
}
