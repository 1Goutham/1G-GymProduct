# AATHLYTX — the operating system for gyms

An ERP for a modern gym, not a membership spreadsheet. One calm, Apple-grade surface for the whole business: who is on the floor right now, who can coach, which machine is about to break, what to reorder, and where the money went.

## Modules

| Module | What it does |
| --- | --- |
| **Today** | A morning briefing: live headcount, revenue pace, fleet health and dues, plus a ranked list of what needs you, written by the Aathlytx AI engine. |
| **Live floor** | Real-time occupancy from biometric turnstiles (SSE, every 2s). Shows a capacity ring, a floor map with zone density, hour-by-hour actual vs. forecast, a punch-by-punch biometric stream (denied gates included), trainer availability and terminal health. Also a weekly heatmap. |
| **Trainers** | A Gantt of shifts and bookings with a "now" line. Click an open slot to book PT (with clash detection). Shows utilisation, ratings, PT rates and on-floor status from staff punches. |
| **Members** | 1,240 members with plan, status, 30-day visits and an explainable churn score. Filter by in-gym, at-risk, renewals or lapsed. Bulk WhatsApp renewal links or trainer check-ins. |
| **Equipment** | Every asset gets a live health score and a 14-day breakdown risk (usage hours, service debt, age, open reports). Includes fault reporting, warranty tracking, one-click service tickets and **Auto-schedule** for anything above 50% risk. |
| **Service** | A kanban board (Scheduled → In progress → Awaiting parts → Completed) with SLA clocks, AMC vendors and maintenance spend. Completing a ticket resets the machine's service clock and books the cost to finance. |
| **Procurement** | Purchase requests with an approval trail (request → approve → order → receive). Receiving updates stock. Inventory shows days of cover. **Auto-draft POs** groups low stock by vendor and sizes orders for about 6 weeks. |
| **Finance** | Revenue vs. expenses over 12 months, revenue and cost mix, a P&L for this month vs. last, MRR/ARPU, a GST estimate, recent transactions, and dues with mark-paid and WhatsApp reminders. |
| **Copilot** | A chat analyst grounded in live data. It uses Claude when `ANTHROPIC_API_KEY` is set and otherwise answers from the built-in operations engine, fully offline. |
| **Biometrics** | Terminal fleet, setup guides, a test-punch tool and the event log. |
| **⌘K** | A command palette for navigation, quick actions and "Ask Copilot". |

There is also a light, dark and system theme with a no-flash toggle, a mobile drawer, toasts, and spring motion throughout.

## Connecting biometric devices

**ADMS push (ZKTeco, eSSL and other iclock-protocol terminals):** set the terminal's *Cloud Server / ADMS* address to your Aathlytx host. The device then calls:

```
GET  /iclock/cdata?SN=<serial>&options=all   handshake (returns push options, TimeZone=5.5)
POST /iclock/cdata?SN=<serial>&table=ATTLOG  attendance lines: PIN \t time \t status \t verify …
GET  /iclock/getrequest?SN=<serial>          heartbeat
```

Unknown serials register themselves. Enrol members using their member number (1001–2240 in the demo) as the device PIN.

**Signed webhook (BioTime, eTimeTrackLite, Hikvision or Suprema bridges, or your own scripts):**

```bash
BODY='{"userId":"1042","deviceSerial":"CKUH224960231","direction":"in","method":"face"}'
SIG=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "$BIOMETRIC_WEBHOOK_SECRET" -hex | sed 's/^.* //')
curl -X POST https://<host>/api/biometric/events -H "content-type: application/json" -H "x-aathlytx-signature: $SIG" -d "$BODY"
```

You can also send `{ "events": [...] }` (up to 500 per request). In production, unsigned requests are rejected with a 401.

Expired or frozen members are held at the gate, and the denial shows up in the live stream. Once real terminals are connected, turn off the floor simulator from **Live floor → Terminals**, or set `FLOOR_SIMULATOR=off`.

## Getting started

```bash
npm install
cp .env.example .env.local   # all optional
npm run dev                  # http://localhost:3000
```

| Variable | Purpose |
| --- | --- |
| `ANTHROPIC_API_KEY` | Enables Claude in Copilot (model `claude-opus-5-5`, server-side refusal fallback on). Without it, the offline engine answers. |
| `BIOMETRIC_WEBHOOK_SECRET` | HMAC secret for `/api/biometric/events`. Required in production. |
| `FLOOR_SIMULATOR` | `off` disables demo traffic. |

Scripts: `npm run dev`, `npm run build`, `npm start`, `npm run typecheck`.

## Architecture

- **Next.js 16** (App Router, Server Components, Server Actions), React 19, TypeScript, **Tailwind CSS 4**, Motion and lucide.
- `lib/store.ts`: the operational store. The live floor is an event-sourced projection: every punch, whether from ADMS, the webhook or the simulator, goes through one `ingest`/`applyEvent` path.
- `lib/derive.ts`: equipment health and risk, inventory cover, finance summaries and member stats.
- `lib/ai/engine.ts`: deterministic, explainable insights. It produces the same context the LLM receives, so the two never disagree.
- `components/charts`: hand-built SVG charts (area with forecast, grouped bars, ring, heatmap, share bar) with hover tooltips and validated colours in both themes.
- `components/illustrations`: a matching set of minimal line illustrations.

The demo store is in-memory and seeded deterministically (RP Fitness, Tenkasi, Tamil Nadu, IST). Persistence sits behind `lib/store.ts`, so swapping in Postgres or Supabase doesn't touch any screen.
