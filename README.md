# AI Workspace

**A real-time collaborative AI workspace where two people share one AI session — one upstream call, streamed live into both screens, character by character.**

Think Google Docs, but the second collaborator is an AI you're both talking to at the same time. Type a prompt on one screen, the answer streams onto both screens in lockstep. Both users see each other's cursors, presence, and edits.

---

## Demo

> _Replace this section with a 20–30 second GIF of two browser windows side-by-side — one user types a prompt, the AI answer streams into both windows simultaneously, cursors move, presence avatars light up._

**Live demo:** _coming soon_
**Pitch:** Built as a portfolio piece to deeply understand the problem space behind collaborative AI products (Tandem, Notion AI, etc.) — the parts that aren't obvious until you build them: sequencing, reconnect semantics, interrupt-safety, fanning one model call to many clients.

---

## What's interesting about this codebase

These are the parts I'd actually want to talk through in an interview:

### 1. One AI call → two synchronized streams

The naive approach — each client opens its own connection to the model — costs 2× and produces drifted output (different sampling on each call). Instead:

- A single orchestrator process opens the upstream call.
- Tokens are coalesced into small batches (every 24 chars or 60 ms — whichever hits first) and **published to a Redis pub/sub channel keyed by run ID**.
- A standalone Socket.io server subscribes to `rt:*` channels and fans every envelope into the workspace's socket room.
- Every chunk carries a **monotonic `serverSeq`** assigned by Redis `INCR`, so clients can detect gaps on reconnect and request the missing window.

Net effect: one upstream call, identical streams to every viewer, deterministic ordering even across reconnects. [`stream-buffer.ts`](src/features/ai/server/stream-buffer.ts) + [`ai-orchestrator.ts`](src/features/ai/server/ai-orchestrator.ts) + [`publish.ts`](src/lib/realtime/publish.ts).

### 2. Interrupt-safe streaming

A model run can take 30+ seconds. Tab closes, wifi drops, server restarts — by default, half the answer evaporates. Here:

- The `StreamBuffer` checkpoints partial output to Postgres **every 1.5 seconds**.
- On orchestrator error, `failMessage(messageId, buffer.content)` writes whatever was captured so far and flips status to `ERROR`.
- Clients reconnecting mid-stream get the persisted prefix from the DB, then resume the live stream from the next `serverSeq`.

You can crash the API server mid-generation and the message still shows up correctly on reload.

### 3. AI provider abstraction with fail-forward fallback

[`features/ai/server/providers/`](src/features/ai/server/providers/) — Groq → Gemini → OpenAI → Mock. The `FallbackProvider` retries the next provider **only before the first token yields**; once tokens start flowing, a mid-stream failure is treated as a real error (no silent provider-switching mid-message). With zero API keys configured, the mock provider produces realistic word-by-word output so the rest of the app stays demo-able offline.

### 4. Auth + per-user workspace isolation

NextAuth v4 with Prisma adapter, Google + GitHub OAuth, plus a dev-only CredentialsProvider gated by `ENABLE_DEV_LOGIN`. `events.createUser` provisions a personal workspace on first sign-in, so new users land somewhere usable instead of an empty state. [`auth.ts`](src/lib/auth/auth.ts).

### 5. Server-ordered canvas conflict resolution

Shared notes/canvas uses an **append-only op log** ([`CanvasOperation`](prisma/schema.prisma#L241)) with server-assigned `serverSeq`. Clients apply optimistically, the server is the ordering authority, and conflicts resolve last-writer-wins matched by `opId`. Snapshots compact the op log on a schedule so loading a workspace doesn't replay full history.

---

## Architecture

```
                    ┌─────────────────────────────┐
                    │  Browser  (React + Zustand) │
                    └──────┬───────────────┬──────┘
                           │ HTTPS         │ WSS
                           ▼               ▼
                  ┌────────────────┐  ┌──────────────────┐
                  │  Next.js 15    │  │  Socket.io       │
                  │  (Vercel)      │  │  server          │
                  │                │  │  (Fly / Railway) │
                  │  - REST API    │  │                  │
                  │  - NextAuth    │  │  - Realtime JWT  │
                  │  - AI orchestr │  │  - Pub/sub fanout│
                  └───┬────────┬───┘  └─────────┬────────┘
                      │        │                │
            ┌─────────▼──┐   ┌─▼────────────────▼──────┐
            │  Postgres  │   │  Redis                  │
            │ (Supabase) │   │  (Upstash)              │
            │            │   │                         │
            │ - Users    │   │  - Pub/sub bridge       │
            │ - Messages │   │  - Per-conv AI lock     │
            │ - Canvas   │   │  - serverSeq counter    │
            │ - Op log   │   │  - Presence + cursors   │
            └────────────┘   │  - Rate limiting        │
                             └─────────────────────────┘
                                       │
                                       ▼
                          ┌────────────────────────────┐
                          │  AI providers              │
                          │  Groq → Gemini → OpenAI →  │
                          │  Mock (auto fail-forward)  │
                          └────────────────────────────┘
```

**Why two server processes?** Vercel's serverless functions can't hold long-lived WebSocket connections. The Next.js app handles HTTP / auth / AI orchestration; the Socket.io server is a separate deployable that the Next app talks to via Redis pub/sub. Both are stateless and horizontally scalable (Socket.io clustering via [`@socket.io/redis-adapter`](server/src/redis/adapter.ts), wired but currently single-instance).

---

## Tech stack

**Frontend:** Next.js 15 (App Router, RSC), React 19, TypeScript, Tailwind, shadcn/ui, Zustand, TanStack Query, Framer Motion, cmdk
**Backend:** Next.js API routes, standalone Node + Socket.io server, Prisma 6, NextAuth v4
**Data:** Postgres (Supabase free tier), Redis (Upstash free tier — `rediss://` TLS)
**AI:** Groq (Llama 3.3 70B), Gemini 1.5 Flash, OpenAI 4o-mini, built-in mock provider
**Realtime:** Socket.io 4, `jose` (HS256 realtime JWT), `ioredis` pub/sub
**Tooling:** pnpm workspaces, tsx, dotenv-cli, Zod for env + payload validation

---

## Local setup

**Designed to run on a low-resource Windows laptop with zero Docker dependencies.**

### Prereqs

- Node 20+
- pnpm 10+ (`npm i -g pnpm`)
- A Supabase project (free tier) — gives you Postgres
- An Upstash Redis database (free tier) — gives you `rediss://` URL
- (Optional) A Groq API key for free, fast AI — falls back to mock if absent

### Setup

```bash
# 1. Install
pnpm install

# 2. Copy env template
cp .env.example .env.local

# 3. Fill in the four required values in .env.local:
#    - DATABASE_URL  (Supabase → Settings → Database → Transaction pooler, port 6543)
#    - DIRECT_URL    (Supabase → same screen → Direct/Session, port 5432)
#    - REDIS_URL     (Upstash → Redis CLI tab → the rediss:// URL, not the REST URL)
#    - GROQ_API_KEY  (console.groq.com/keys — or leave empty for mock mode)

# 4. Apply schema + seed
pnpm db:migrate --name init
pnpm db:seed       # creates alice@example.com + bob@example.com if SEED_DEV_USERS=true

# 5. Run both servers (two terminals)
pnpm dev           # Next.js → http://localhost:3000
pnpm dev:socket    # Socket.io → http://localhost:4000
```

Open http://localhost:3000 in **two different browser profiles** (or one regular + one incognito), sign in as different users, and join the same workspace from both. Type a prompt on one — watch it stream onto both.

### Env reference

See [`.env.example`](.env.example) for the complete annotated template. Key flags:

| Var | Purpose |
|---|---|
| `AI_PROVIDER` | `auto` (default), `groq`, `gemini`, `openai`, or `mock` |
| `ENABLE_DEV_LOGIN` | Empty → on in dev, off in prod. `"true"` forces on; `"false"` forces off |
| `SEED_DEV_USERS` | `"true"` creates two demo users with personal workspaces |
| `SEED_DEMO_SHARED` | `"true"` additionally creates a shared workspace with both demo users |

Empty strings (`KEY=""`) are normalized to "unset" — both `unset` and `""` mean the same thing, so `.env.example` placeholders don't break validation.

---

## Project layout

```
.
├── prisma/
│   ├── schema.prisma        # Users, Workspaces, Conversations, Messages, AiRuns, Canvas op log
│   └── seed.ts              # Opt-in dev fixtures
├── packages/
│   └── shared/              # Socket event contract + Zod schemas + channel keys
├── server/                  # Standalone Socket.io server (its own deployable)
│   └── src/
│       ├── socket/          # Auth middleware, validation, presence/chat/canvas handlers
│       ├── redis/           # Named clients, pub/sub subscriber, socket adapter
│       └── index.ts         # Entry point
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── (auth)/login/         # OAuth + dev login form
│   │   ├── (dashboard)/dashboard/# Workspace grid
│   │   ├── (workspace)/w/[id]/   # The collab surface
│   │   └── api/                  # REST endpoints
│   ├── features/            # Feature-first module layout
│   │   ├── ai/server/            # Provider abstraction, orchestrator, stream buffer, memory
│   │   ├── auth/                 # Login form, repositories, session helpers
│   │   ├── conversation/         # Message list, prompt composer, AI stream renderer
│   │   ├── canvas/               # Op-log-based shared notes
│   │   ├── presence/             # Avatars, live cursors, typing indicator
│   │   ├── workspace/            # Shell, header, sidebar, command palette
│   │   └── account/              # Account menu
│   ├── lib/
│   │   ├── auth/                 # NextAuth config + session helpers
│   │   ├── db/                   # Prisma client + transaction helpers + DTO mappers
│   │   ├── redis/                # Client, locks, presence, sequence, rate limit
│   │   └── realtime/             # Publish helpers, JWT minting, socket client
│   ├── config/env.ts        # Zod-validated, empty-string-normalized env loader
│   └── middleware.ts        # NextAuth route protection for /dashboard + /w
└── .env.example
```

---

## Status & roadmap

**Built (MVP):**
- ✅ Real-time multi-user collaboration on a shared AI session
- ✅ One upstream call → fanned to all clients via Redis pub/sub
- ✅ Interrupt-safe streaming with 1.5 s partial-output checkpointing
- ✅ Server-ordered message + canvas op sequencing
- ✅ Google + GitHub OAuth, dev login, per-user workspace provisioning
- ✅ Live cursors, presence avatars, typing indicator, ⌘K command palette
- ✅ AI provider fallback chain (Groq → Gemini → OpenAI → Mock)
- ✅ Rolling conversation summarization for context windows
- ✅ Free-tier infra setup (zero Docker, low-resource Windows-friendly)

**Next up (in order):**
1. Disable `allowDangerousEmailAccountLinking` in NextAuth config (critical security)
2. Markdown + code rendering in messages (react-markdown + shiki)
3. Invite-by-link workspace sharing
4. Multi-conversation threads per workspace
5. Stop-generating button
6. Sentry + structured logging
7. Production rate-limiting + abuse controls

**Honest gaps (not yet built):**
- No automated tests yet — this is a portfolio MVP; happy-path was validated manually with two browser sessions
- Single socket-server instance (clustering wired but not deployed)
- No file uploads, no image generation, no streaming tool calls
- Mobile UI is functional but not polished

---

## License

MIT — see [LICENSE](LICENSE) (add one if you fork).

---

## Why I built this

I wanted to deeply understand what it actually takes to ship a real-time collaborative AI product — the parts that look easy from the outside but bite hard once you start: token-level streaming to multiple subscribers, server-ordered conflict resolution, interrupt-safety, presence accuracy, auth flowing through a stateful WebSocket layer.

If you're building in this space, I'd love to talk.
