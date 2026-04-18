# AGENTS.md — oiHubv2

> **Orchestration brain for OMX (oh-my-codex) working on `b9b4ymiN/oiHubv2`.**
> This file tells AI agents *how* to work on this codebase safely and productively.
> Keep it short, honest, and actionable. If it's out of date, fix it before you code.

---

## 1. Project Identity

**oiHubv2 — Professional Open Interest (OI) Trading Platform for Crypto Futures.**

A Next.js 15 + TypeScript decision-support dashboard for discretionary and semi-automated OI traders. The platform ingests Binance Futures market data (OHLCV, OI, funding, liq, L/S ratios, taker flow), computes statistical + derivative-based signals, and renders them as ~22 professional trading cards.

**Today it is a read-only analysis platform.** It does NOT place real orders, manage capital, or run strategies autonomously. The long-term target (see `ROADMAP.md`) is a full OI-Trader system: backtesting → paper → live execution with risk-managed portfolios.

Primary user: a professional OI trader (10+ yrs experience) using this tool as a decision cockpit, not a black-box bot.

---

## 2. Tech Stack

| Layer            | Choice                                              | Notes                                      |
| ---------------- | --------------------------------------------------- | ------------------------------------------ |
| Framework        | Next.js 15 (App Router)                             | SSR + RSC, route handlers in `app/api/*`   |
| Language         | TypeScript 5.x, strict mode                         | `noImplicitAny`, `strictNullChecks` on     |
| UI               | Tailwind CSS + shadcn/ui + Radix primitives         | Components registry in `components.json`   |
| Charts           | Recharts                                            | Custom bell-curve overlays, heatmaps       |
| Data fetching    | TanStack Query + fetch + WebSocket                  | Client cache + optimistic updates          |
| Exchange API     | Binance Futures (REST + WS)                         | Public endpoints, no trading keys yet      |
| Testing          | Vitest (unit) + Playwright (E2E)                    | `__tests__/`, `playwright.config.ts`       |
| Container        | Docker + `docker-compose.yml`                       | Oracle Cloud free tier is primary target   |
| Edge             | `cloudflare-worker.js`                              | For global distribution / CORS relay       |

Node **20+** required. Package manager is **npm** (lockfile is committed).

---

## 3. Canonical Commands

Always use these. Do not invent new scripts without updating `package.json` and this file.

```bash
npm run dev            # Local dev — http://localhost:3000/dashboard
npm run build          # Production build
npm start              # Production server
npm run lint           # ESLint (Next config)
npm test               # Vitest
npm run test:ui        # Vitest UI mode
npx playwright test    # E2E (Playwright)
docker compose up -d   # Containerized run
```

**Before declaring any task "done":**
1. `npm run lint` clean
2. `npm test` green
3. Relevant Playwright specs pass (if UI changed)
4. No new `any` types introduced, no `@ts-ignore` without a `// TODO(issue-#):` comment

---

## 4. Directory Map (ground truth)

```
oiHub/
├── app/                 # Next.js App Router
│   ├── dashboard/       # Main trading dashboard route
│   ├── heatmap/         # Heatmap views
│   ├── intelligence/    # AI-powered feature pages
│   └── api/             # Route handlers (Binance proxy, data endpoints)
├── components/
│   ├── charts/          # Recharts-based visualizations
│   ├── widgets/         # Dashboard trading cards (22+)
│   ├── intelligence/    # AI/opportunity components
│   └── ui/              # shadcn/ui primitives
├── lib/
│   ├── features/        # Business/trading logic (pure functions preferred)
│   ├── api/             # Binance REST/WS clients, rate limiters
│   └── hooks/           # Custom React hooks (data + UI)
├── types/               # Shared TS types — domain-modeled
├── docs/
│   ├── cards/           # Per-card docs (intent, signals, risk)
│   └── OI-MOMENTUM-GUIDE.md  # Canonical strategy doc — READ BEFORE trading-logic work
├── __tests__/           # Vitest specs (co-located OK too)
├── archived/            # Deprecated code — do NOT import from here
└── public/avatars/      # Static assets
```

**Rules of thumb:**
- Pure calculation → `lib/features/`
- Network I/O → `lib/api/`
- React-stateful logic → `lib/hooks/`
- Visual element → `components/charts/` or `components/widgets/`
- If it touches live prices, it belongs behind a hook, never inline in a widget

---

## 5. Code Conventions

**TypeScript**
- Prefer `type` aliases for data shapes, `interface` for extendable contracts.
- Every exported function from `lib/features/*` has an explicit return type.
- No `any`. Use `unknown` + narrowing, or model the shape properly in `types/`.

**React / Next.js**
- Server Components by default. Add `"use client"` only when you need state, effects, or browser APIs.
- Co-locate component-only types in the same file; shared types go in `types/`.
- Charts: memoize heavy derivations with `useMemo`; do not recompute OI rollups on every render.

**Naming**
- Files: `kebab-case.tsx` for components, `camelCase.ts` for lib utilities.
- Hooks: `useXxx`.
- Domain types: PascalCase, suffix `-Signal`, `-Regime`, `-Snapshot` where it clarifies intent (e.g. `OiDivergenceSignal`, `MarketRegimeSnapshot`).

**Imports**
- Absolute imports via the path alias configured in `tsconfig.json` (`@/...`). No deep `../../../` relatives.
- Never import from `archived/`.

**Error handling**
- API clients in `lib/api/` must return a discriminated result (`{ ok: true, data } | { ok: false, error }`) or throw a typed `BinanceApiError`. Do not silently swallow failures — traders need to see data staleness.

**Formatting**
- ESLint + Prettier defaults from the Next config. Run `npm run lint --fix` before committing.

---

## 6. Trading Domain Rules (critical)

This project is a trading tool. Sloppy code here turns into real P&L for the user. Agents **must** treat the following as invariants:

1. **Never silently fabricate market data.** If a data source fails, surface the failure in the UI (stale badge, error card) rather than filling zeros or last-known values without a timestamp.
2. **Time handling:** all timestamps are **UTC ms** internally. Display formatting happens at the view layer. Never mix exchange-local and UTC.
3. **OI delta is not a price.** When computing divergence, always compare OI change vs price change over the *same window* — never a window that drifts due to missing candles.
4. **Signal confidence is published to the user.** Do not round up confidence scores. If a regime classifier is uncertain, emit `NEUTRAL` or `TRANSITION`, not a confident guess.
5. **Win-rate numbers in docs are historical back-tested claims**, not guarantees. Do not invent new win-rate numbers in generated content — copy from `docs/` or mark as "TBD".
6. **No order placement.** Until Phase 5 of the roadmap ships with explicit trading-key handling and a kill switch, no code path may call Binance `POST /fapi/v1/order` or equivalent, even guarded by a feature flag. If a task asks for it, stop and re-read the roadmap with the user.
7. **No API keys in code, logs, or error messages.** `.env.local` is gitignored; `.env.example` is the only committed template.
8. **Don't change core signal math without a test.** Changes to `lib/features/*` that affect published signals require a before/after unit test demonstrating equivalence or documented deviation.

When in doubt, the canonical strategy reference is **`docs/OI-MOMENTUM-GUIDE.md`**. Read it before touching OI momentum / acceleration / divergence code.

---

## 7. Testing Expectations

- **Unit (Vitest):** every pure function in `lib/features/` ships with at least one happy-path and one edge-case test (empty series, single candle, NaN input). Put fixtures in `__tests__/fixtures/`.
- **Component (Vitest + Testing Library):** widgets rendering >1 signal should snapshot their legend and color mapping.
- **E2E (Playwright):** dashboard loads, symbol switch, timeframe switch, heatmap route renders without console errors. Add a spec for any new page route.
- **No flaky tests.** If a test depends on network or real time, mock it. Use `vi.useFakeTimers()` liberally.

Coverage is not a gate today, but new code in `lib/features/` should not drop branch coverage of its own module.

---

## 8. OMX Agent Playbook

This project benefits from specialized agents. Default routings:

| Task                                           | Agent / Skill                                 |
| ---------------------------------------------- | --------------------------------------------- |
| Understand an unfamiliar card or flow          | `/prompts:explore` → `/prompts:architect`     |
| New trading signal / math change               | `/prompts:analyst` → `/prompts:architect` → `/prompts:executor` → `/prompts:test-engineer` → `/prompts:verifier` |
| Fix a bug in a widget                          | `/prompts:debugger` → `/prompts:executor` → `/prompts:verifier` |
| Refactor a chart component                     | `/prompts:executor` → `/prompts:code-reviewer` |
| Add a new card / dashboard section             | `$team 3:executor` (designer + executor + test-engineer) |
| Binance API / rate limit work                  | `/prompts:dependency-expert` → `/prompts:executor` |
| End-to-end feature, idea → PR                  | `$autopilot` or `$ralph` (for long tasks)     |
| Build/TypeScript errors after a refactor       | `$build-fix`                                  |
| Pre-release pass before merging to `main`      | `/prompts:code-reviewer` + `/prompts:security-reviewer` + `/prompts:performance-reviewer` |
| Docs for a new card                            | `/prompts:writer` (target: `docs/cards/…`)    |

**Critical rule:** any change to **trading math** (signals, sizing, regime classification) MUST go through `/prompts:architect` for design review AND `/prompts:test-engineer` for coverage BEFORE `/prompts:executor` writes the change. No shortcuts.

---

## 9. Magic Keywords (how to talk to me)

| When you say…                                   | OMX activates                                  |
| ----------------------------------------------- | ---------------------------------------------- |
| "add a card for X"                              | `$team 3:executor` (designer → exec → tests)   |
| "refactor this widget"                          | `$pipeline executor → code-reviewer`           |
| "why is the chart wrong"                        | `/prompts:debugger`                            |
| "backtest this idea"                            | `$plan` (this is a roadmap item — plan first)  |
| "connect to Binance keys" / "place an order"    | **STOP**. Re-read §6 rule 6 with the user.     |
| "ship it, don't stop"                           | `$ralph` (bounded by architect verification)   |
| "parallelize across files"                      | `$ultrapilot` / `$ultrawork`                   |

---

## 10. Workflow Patterns

### 10.1 Adding a new trading card
1. `$plan` — confirm the card's signal definition with the user (use `/prompts:analyst`).
2. Draft the card spec in `docs/cards/<category>/<name>.md` **first** (intent, inputs, signals, risk).
3. Implement the pure function in `lib/features/`.
4. Write Vitest unit tests against fixture data.
5. Build the hook in `lib/hooks/`.
6. Build the widget in `components/widgets/`.
7. Mount it in the dashboard route.
8. Add a Playwright smoke test.
9. `/prompts:code-reviewer` final pass.

### 10.2 Touching the Binance API layer
1. Check `lib/api/` for existing client — do not create a second one.
2. Respect the existing rate limiter and caching. If it doesn't fit your need, extend it — don't bypass it.
3. Add a failure mode test (5xx, 429, network timeout).
4. Document the endpoint in `docs/development/api.md`.

### 10.3 Performance work on charts
1. Measure first (`performance.mark` or React DevTools Profiler). No optimizing without numbers.
2. Preferred order: memoize → virtualize → offload to web worker.
3. Keep re-renders at the card boundary; never re-render the entire dashboard.

---

## 11. Deployment Context

- **Oracle Cloud (free tier)** is the primary production target — `ORACLE_CLOUD_DEPLOYMENT.md` is authoritative.
- **Docker Compose** runs the full stack locally and in prod.
- **Cloudflare Worker** is an optional global relay (`cloudflare-worker.js`). Keep it behaviorally identical to the Next.js API route it mirrors.
- **Vercel** works but is not the recommended deployment (geo restrictions on Binance endpoints from some Vercel regions). Don't default to Vercel-only features (e.g. Edge Middleware with regional routing) without a fallback.

---

## 12. Safety & Guardrails

- **Secrets:** never commit `.env.local`. Never print `process.env.*` values in logs or error responses.
- **Destructive ops:** `rm -rf`, `git reset --hard`, and branch force-pushes are blocked in normal agent flows. If you genuinely need one, ask the user in chat.
- **`archived/`** is a graveyard, not a library. Do not import from it. If you need something in there, move it out properly with a short migration note.
- **Kill switch (future):** once live trading lands (Phase 5 of roadmap), any order-placing code path must check a global kill switch before firing. Design reviews for that phase will enforce this.
- **No scraping of user identities** from whale feeds or social data. Addresses are public, personal identities are not.

---

## 13. Project Memory Notes

Use these anchors to orient quickly in long OMX sessions:

- **Flagship feature:** OI Momentum & Acceleration (1st + 2nd derivative of OI).
- **Highest win-rate combo (backtested):** Volume Profile + OI Divergence aligned → 78%.
- **Most complex card:** Opportunity Finder — pulls from multiple features; treat it as downstream, don't let it own math.
- **Known weak spot:** real-time WS reconnection logic is simplistic (see issues). Harden before Phase 3.
- **Known tech debt:** some widgets still recompute signals in render; migrate to hook-owned state opportunistically.

---

## 14. Out of Scope (for now)

These are explicitly *not* supported today. If a task implies one, flag it and redirect to the roadmap:

- Placing real orders on any exchange
- Holding user funds, custody, or API trading keys
- Backtesting engine (planned — Phase 2)
- Paper trading simulator (planned — Phase 4)
- User accounts, multi-tenant auth (planned — Phase 6)
- Mobile native apps
- Non-Binance exchanges (planned — Phase 7)

---

## 15. When Agents Disagree With This File

This file is the source of truth for *how we work*, not for *what we believe*. If an agent has a good reason to deviate:

1. State the deviation explicitly in the PR / response.
2. Propose an edit to this file in the same change.
3. Get the user's acknowledgment before merging.

Silent deviation is worse than a bad rule. Keep this file honest.

---

*Last updated: see git log. If this file and the code disagree, assume the code is right and fix this file.*
