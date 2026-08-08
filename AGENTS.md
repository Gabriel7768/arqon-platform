# AGENTS.md — ARQON Platform (CTO Operating Memory)

> Maintained by the acting CTO. This file is the persistent executive context
> for the ARQON Platform. Update after every major decision or directional shift.

## My Role

CTO of the ARQON Platform. I own technology strategy, engineering prioritization,
risk, and the alignment between governance work and actual product value delivery.

Previous sessions operated as Chief Architect / Principal Software Architect
authoring a governance meta-layer. My job is broader: I must keep the governance
serving the product, not the reverse.

## Platform Snapshot

- **Product:** ARQON Revenue Engine — full-stack SaaS that finds hidden revenue
  leaks from CSV data (invoices, CRM pipeline, contracts). Working app exists.
- **Stack:** pnpm workspaces, Node 24, TS 5.9, React+Vite, Express 5 OpenAPI-first,
  PostgreSQL + Drizzle, Zod, JWT auth.
- **Working artifacts:** `artifacts/api-server` (Express + revenue-engine, 4
  detectors), `artifacts/web` (React frontend), `lib/` (api-spec, api-client-react,
  api-zod, column-detection-engine, db).
- **In-flight initiative:** Integrating `@workspace/i18n` into the web app.
  Wires `ArqonI18nProvider` (wraps App in main.tsx), creates en-US/pt-BR
  dictionaries, refactors landing/login/register to use `useI18n().t()`,
  adds a `LanguageToggle` in the landing header. Build passes.

## Resume Here — Next Session

**Last session ended:** 2026-08-07. All work synced to GitHub (commit
`2f678c5`) and confirmed synced to founder's Replit (`git status` clean,
`HEAD == origin/main == 2f678c5`, pnpm 11.20.0, 53 tests pass, web build OK).

**Delivery sequence billing → auth → i18n (D-004): COMPLETE.**
- `@workspace/billing` — specs frozen, ONE_TIME PIX first slice
- `@workspace/auth` — specs frozen, 22 tests, hashPassword/signToken/verifyToken/AuthClient
- `@workspace/i18n` — specs frozen (7), 31 tests, core + React adapter, en-US + pt-BR
- Landing page (premium dark B2B) shipped and built

**Founder needs to choose the next initiative. CTO-recommended options,
ranked by value × readiness:**

1. **Integrate `@workspace/i18n` into the web app** — wire I18nProvider,
   create en-US/pt-BR dictionaries, translate hardcoded strings in
   landing.tsx/login/register. Makes i18n actually deliver product value
   (not just a library). Low risk, high visibility.
2. **Migrate api-server to use `@workspace/auth`** — replace inline
   `lib/auth.ts` (grandfathered per D-011) with the governed package.
   Closes the `?? "arqon-dev-secret"` gap permanently. Medium risk
   (touches running API).
3. **Evolve billing to monthly subscriptions (D-012)** — the 4 pricing
   tiers are MONTHLY recurring, but current billing slice is ONE_TIME PIX
   only. Needs BILL-ARCH extension. HIGH value but also the biggest scope.
   BLOCKED on founder clarification: does Abacatepay handle recurring
   subscriptions, or do we model manual re-bill? (D-012 pending items).
4. **Continue governance corpus** — SM-001, ADAPT-001, SEC-001 standards
   still missing. Lower product value short-term; defer until a package
   actually needs them.

**When founder returns, ask:** "Qual próximo: integrar i18n no app web,
migrar api-server para @workspace/auth, ou evoluir billing para
assinaturas mensais?"

**Founder's decision (2026-08-08):** Hold all three as backlog. Founder
is not starting a new initiative this session. The backlog is frozen:

- **Backlog 1 — Integrar `@workspace/i18n` no app web.** Wire I18nProvider,
  create en-US/pt-BR dictionaries, translate hardcoded strings in
  landing/login/register. Low risk, high visibility.
- **Backlog 2 — Migrar api-server para `@workspace/auth`.** Replace
  inline `lib/auth.ts` (grandfathered per D-011) with the governed
  package. Closes the `?? "arqon-dev-secret"` gap permanently. Medium
  risk (touches running API).
- **Backlog 3 — Evoluir billing para assinaturas mensais (D-012).**
  The 4 tiers are MONTHLY recurring, but current slice is ONE_TIME PIX
  only. Needs BILL-ARCH extension. HIGH value, biggest scope. BLOCKED
  on founder clarification: does Abacatepay handle recurring
  subscriptions, or do we model manual re-bill?

No new work to start. Next session, re-present these three and let
founder pick.

**Environment notes for Replit (founder's machine):**
- pnpm 11.20.0 installed at `/home/runner/workspace/.config/npm/node_global/bin/pnpm`
  — must `export PATH="/home/runner/workspace/.config/npm/node_global/bin:$PATH"`
  each new shell session (or add to ~/.bashrc). NOT in default PATH.
- Secrets stay ONLY in Replit (D-010). Never commit.
- `pnpm install` reinstalls from scratch when switching pnpm major versions
  (10→11 prompted "remove and reinstall" — answered Y, took ~2 min).

## Hosting Stack (founder-confirmed sourcing decision)

Multi-host, decoupled deployment — NOT a single-host monolith:

- **Render** → hosts the API server (`artifacts/api-server`, Express 5, Node).
  Web service + potential background workers/cron.
- **Vercel** → hosts the frontend (`artifacts/web`, React + Vite SPA build).
- **Supabase** → managed PostgreSQL (the `DATABASE_URL`). Also offers Auth,
  Storage, Edge Functions (potential overlaps to resolve, see below).
- **Abacatepay** → Brazilian payments (PIX/boletos). The billing provider —
  pulls a `billing` package into relevance earlier than the original list implied.

### Implications the CTO must track

- **CORS:** Vercel (web) → Render (API) is cross-origin. API must have explicit
  CORS allowlist for the Vercel domain. Currently Replit is same-origin → this
  is NEW configuration that didn't exist before.
- **Auth overlap risk:** existing app uses self-rolled JWT-in-localStorage.
  Supabase ships its own Auth. Decision needed: keep self-rolled JWT, adopt
  Supabase Auth, or hybrid. Do NOT silently end up with two auth systems.
- **Env var sprawl:** secrets now live across Render, Vercel, Supabase, AND
  Abacatepay dashboards — 4 surfaces. Demands a secrets/env contract standard.
- **Billing earlier than planned:** Abacatepay means `packages/billing` (or an
  adapter spec) becomes a near-term need, not a distant one. Affects SPD/priority.
- **Monorepo deploy:** Render and Vercel each deploy a different subset of the
  monorepo. Needs per-host build config (Render: esbuild CJS bundle for API;
  Vercel: Vite build for web). Reinforces keeping apps (artifacts) decoupled
  from shared libs (packages/lib).
- **Multi-host validates the layout stance:** decoupled hosting REQUIRES clean
  app/lib separation → confirms `artifacts/` (apps) + `@workspace/*` import
  discipline is the right call, not just aesthetic.

## Governance Corpus (materialized in git — verified)

| Document | Type | Status | File |
|---|---|---|---|
| EDS-001 | Engineering Documentation Standard | Frozen v1.0 | `docs/governance/standards/EDS-001.md` |
| EES-001 | Engineering Execution Standard | Frozen v1.0 | `docs/governance/standards/EES-001.md` |
| ESS-001 | Engineering Specification Standard | Frozen v1.0 | `docs/governance/standards/ESS-001.md` |
| TS-001 | Technical Standard Meta-Specification | Frozen v1.0 | `docs/governance/standards/TS-001.md` |
| API-001 | Public API Specification Standard | Frozen v1.0 | `docs/governance/standards/API-001.md` |
| RT-001 | Runtime Specification Standard | Frozen v1.0 | `docs/governance/standards/RT-001.md` |
| SM-001 | State Machine Specification Standard | Frozen v1.0 | `docs/governance/standards/SM-001.md` |
| ADAPT-001 | Adapter Specification Standard | Frozen v1.0 | `docs/governance/standards/ADAPT-001.md` |
| SPD-001 | Spec Planning Doc (packages/i18n) | Active v1.0 | `docs/governance/standards/SPD-001.md` |
| SEC-001 | Security Specification Standard | PENDING (gap) | — |

Index: `docs/governance/INDEX.md`. Briefs preserved in `docs/governance/briefs/`.

The earlier "Frozen in chat history" problem is RESOLVED: the corpus now lives
in version control. SEC-001 is the next governance gap (needed by I18N-SEC,
auth, billing). SM-001 (the originally-pending standard) is now Frozen.

Pending in the identified sequence: SEC-001 → SPD-002 (billing) → package-level
specs. Per D-004, delivery priority is billing → auth → i18n.

## RESOLVED FINDING (was critical, now closed)

The governance corpus previously existed only in chat history (no `docs/`
directory). This violated EDS-001's Single-Source-of-Truth principle. As of
this cycle, the corpus is materialized under `docs/governance/` in version
control and the freeze is real. This risk is closed.

## Strategic Read (CTO)

1. **Meta-governance is mature; delivery is at zero.** Seven standards govern
   how to write standards/specs, but `packages/i18n` has no code and no real
   package-level spec yet. Watch the governance-to-delivery ratio.
2. **The sequence is sound** (SM-001 unblocks I18N-SM; ADAPT-001 unblocks 8
   adapter specs; I18N-ARCH opens package work). But it is long. Consider
   parallelizing or trimming scope to reach a first shippable i18n slice sooner.
3. **Standards are genuinely enterprise-grade** — TS-001 structure, RT-001's
   37-item checklist, cross-reference rules. The foundation is real; the gap is
   persistence + applying it to produce value.

## Repository Layout — Evidence (verified via shell probe)

- `packages/` does **NOT** exist. It is aspirational in the briefs, not real.
- Physical layout: `artifacts/` (runnable apps) + `lib/` (shared libs) + `scripts/`.
- pnpm-workspace globs: `artifacts/*`, `lib/*`, `lib/integrations/*`, `scripts`.
- File counts (TS/TSX): `artifacts/api-server` 20, `artifacts/web` 78, `lib` 129,
  `packages` 0, `scripts` 1. Total ~64,396 LOC.
- Every package is `@workspace/*` scoped (api-server, web, mockup-sandbox,
  api-spec, api-client-react, api-zod, db, column-detection-engine, scripts).
- Cross-import counts: `@workspace/*` = 52, relative `lib/...` = 68,
  relative `artifacts/...` = 0.  ← **artifacts are pure leaf consumers** (good
  separation already). But relative `lib/` imports (68) exceed scoped imports
  (52) → codebase mixes relative + scoped cross-package imports.
- `artifacts/*` each carry a `.replit-artifact` marker → Replit-native concept.
- `.local/skills/**` holds Replit skill templates (ai-integrations, object-storage,
  replit-auth) also `@workspace/*` scoped — these are templates, not app code.

### Layout decision (CTO recommendation, pending founder sign-off)

- `artifacts/` STAYS = deployable apps (Replit-native, separation already clean).
- `packages/` becomes canonical home for NEW shared platform libs (i18n, auth...).
- `lib/` grandfathered; deprecated toward `packages/` opportunistically (no big-bang).
- EDS-001 mandates: `@workspace/*` scoped imports ONLY (forbid relative
  cross-package imports) → makes future `lib/`→`packages/` migration a pure
  path/config change, not an import rewrite.

## Operating Principles (how I work as CTO)

- Surface risks honestly before continuing autopilot.
- Prefer shipping a thin vertical slice over completing every meta-standard.
- Every "frozen" artifact must live in git, not chat.
- Governance must unblock delivery within a bounded number of steps, else trim.
- Respond to the user in Portuguese (their working language).

## Decisions Log

### D-001 Layout & import contract (CTO-decided, validated by multi-host target)
- Canonical contract = `@workspace/*` scoped imports; relative cross-package
  imports FORBIDDEN. `artifacts/` (apps, stable), `lib/` (grandfathered),
  `packages/` (going-forward home for new platform libs). No big-bang migration.

### D-002 Hosting reality (founder-confirmed)
- TODAY: entire SaaS runs in Replit (monolith, same-origin, JWT-in-localStorage).
- TARGET: Render (API) + Vercel (web) + Supabase (Postgres/Auth) + Abacatepay (billing).
- Governance must serve BOTH; migration story, not greenfield.

### D-003 Auth (CTO-decided)
- Grandfather current self-rolled JWT while in Replit. Adopt Supabase Auth as
  part of the multi-host migration, not now. Never run two auth systems.

### D-004 Package priority sequence (proposed, pending founder confirm)
- billing (Abacatepay) → auth → i18n. Ranked by value × simplicity. Inverts the
  original i18n-first sequence.

### D-005 Secrets/env (CTO-decided)
- Dedicated SEC-001 standard later. EDS-001 records the requirement only.

### D-006 Immediate execution priority (founder-confirmed)
- Option A: materialize governance corpus into docs/governance/ in git BEFORE
  authoring new standards (SM-001 etc.) or any package work.

### D-007 Execution sequence (founder-confirmed)
- SEC-001 → SPD-002 (billing) → billing package specs → first executable slice
  of packages/billing. [DONE — commit a021e5a]

### D-008 Billing first slice shipped (CTO)
- packages/billing implements createCharge/getCharge/listCharges/handleWebhook
  against Abacatepay, with retry, validation, webhook verification (secret +
  HMAC), idempotency. 17 unit tests passing, tsc clean. 7 frozen specs govern
  it. Next in the billing→auth→i18n sequence is auth.

### D-009 Push-gate rule (founder-confirmed)
- After EVERY large implementation/work block, the agent MUST ask the founder
  whether to `git push` before moving on. Do NOT auto-push and do NOT silently
  accumulate commits. Ask explicitly, then push only on confirmation. This
  applies to this and all future sessions.

### D-010 Secrets stay in Replit only (founder-confirmed)
- ALL sensitive material — secrets, API keys, tokens, webhook secrets, `.env`
  files, credentials of any kind — MUST remain ONLY in the Replit environment
  (its secret manager / env vars). They MUST NEVER be committed to git, pushed
  to GitHub, written into any source/spec/doc file, or placed anywhere outside
  Replit. In code and specs, reference secrets ONLY by env var name
  (e.g., `ABACATEPAY_API_KEY`), never by value. This applies to this and all
  future sessions. Enforced by: .gitignore blocks .env/.env.*/\*.pem/\*.key/\*.p12/\*.pfx,
  SEC-001 R2 (no secret value in source or VCS), and BILL-SEC INV-2 (never
  log secrets).

### D-011 Auth slice shipped (CTO)
- packages/auth implements hashPassword/comparePassword (bcrypt),
  signToken/verifyToken (JWT), loadSecret (fail-closed — NO insecure fallback,
  closing the api-server `?? "arqon-dev-secret"` gap), and AuthClient.
  22 unit tests passing, tsc clean. 6 frozen specs govern it (no ADAPT — auth
  has no external provider). Additive: api-server's inline lib/auth.ts is
  grandfathered until a future migration task. Auth is now governed per
  SEC-001. Next in the billing→auth→i18n sequence is i18n.

### D-012 Pricing tiers (founder-provided, pending clarification)
- 4 tiers, all monthly recurring subscriptions (NOT one-time charges):
  | Tier | Price | Histórico | Fontes | Usuários | Relatórios | Export | API | Integrações | Revisão estratégica |
  |---|---|---|---|---|---|---|---|---|---|
  | ARQON Starter | R$297/mês | 30 dias | 1 | 1 | — | — | — | — | — |
  | ARQON Core | R$597/mês | 3 meses | 3 | 3 | ✓ | ✓ | — | — | — |
  | Crescimento ARQON ⭐ | R$997/mês | 12 meses | 10 | 10 | ✓ | ✓ | ✓ | ✓ | 1/ano |
  | ARQON Inteligência | R$1.997/mês | Ilimitado | Ilimitadas | Ilimitados | ✓ | ✓ | ✓ | ✓ | 2/ano |
  Common to all 4: Análise de dados ✓, Faturas em atraso ✓, Clientes inativos
  ✓, Oportunidades estagnadas ✓, Recomendações prioritárias ✓.
  Starter EXCLUDES "Contratos próximos de vencimento"; the other 3 include it.
- Engineering implication: the current @workspace/billing first slice handles
  ONE-TIME PIX charges only. These tiers are MONTHLY SUBSCRIPTIONS — so a
  future billing evolution is needed (subscription/recurring + plan limits
  + feature flags gated by tier). Out of current first-slice scope (BILL-ARCH).
- Pending clarification (asked of founder):
  1. Garbled tier-label lines in the source ("ja: Básico", "sete:",
     "membro: Avançado", "jar: Premium") — appear to be "Nível:" labels.
     Need the clean values for each tier.
  2. Does Abacatepay handle recurring subscriptions, or will we model
     monthly as a recurring charge / manual re-bill? Affects BILL-ARCH scope.

### D-013 i18n first slice shipped (CTO)
- packages/i18n implements a framework-agnostic internationalization core:
  `createI18n(config)` → I18nInstance with `t()` (translation + `{param}`
  interpolation + fallback chain), `formatNumber/formatCurrency/formatDate`
  (via Intl, zero external deps), `setLocale`/`getLocale` (runtime locale
  switching), `loadLocale` (async dictionary loading with in-flight dedup +
  cache-for-life), `isLocaleLoaded`. Fail-safe by design: `t()` never throws
  (returns key string on miss; INV-1/INV-2); `format*` never throws (falls
  back to String(value)).
- React adapter (`@workspace/i18n/adapters/react`): `I18nProvider` (context,
  caller passes an I18nInstance), `useI18n()` (t + format* + locale +
  setLocale, reactive), `useLocale()`. Throws CONTEXT_MISSING if used outside
  provider.
- 31 unit tests passing, tsc clean. No mocks of core (in-memory loader stub
  only). 7 frozen specs govern it: I18N-ARCH, I18N-API, I18N-RT, I18N-SM,
  I18N-SEC, I18N-ADAPT-REACT, I18N-TEST. First slice = en-US + pt-BR
  (dictionaries are caller-provided via loader; none bundled). Email/PDF/
  Notification adapters + OBS/DEPLOY deferred. Completes the
  billing→auth→i18n delivery sequence (D-004).

## Abacatepay API — verified facts (for billing specs/impl)

- Base URL: `https://api.abacatepay.com/v1` (same for sandbox/dev-mode and prod).
- Auth: `Authorization: Bearer <api_key>`. Dev-mode key = sandbox; prod key = real.
  Missing/invalid key → HTTP 401.
- Create charge: `POST /billing/create`. Body (required): `frequency` (only
  `ONE_TIME` today), `methods` (only `PIX` today, min/max 1), `products[]`
  (externalId, name, description?, quantity>=1, price>=100 cents), `returnUrl`,
  `completionUrl`. Optional: `customerId` (existing) or `customer` (new: name,
  cellphone, email, taxId).
- Response envelope: `{data, error, success}`. On success, `data` = Billing.
- Billing schema: `id`, `url` (payment URL), `amount` (cents), `status`
  (`PENDING|EXPIRED|CANCELLED|PAID|REFUNDED`), `devMode` (bool), `methods[]`,
  `products[]` (id, externalId, quantity), `frequency`, `nextBilling` (nullable),
  `customer` (nullable), `createdAt`, `updatedAt`.
- List charges: `GET /billing/list`.
- Webhook: registered in dashboard (URL + secret). Secret sent as query string
  `?webhookSecret=...`. FAQ also mentions `X-Webhook-Signature` HMAC-SHA256
  header for validation — implement BOTH checks (query secret OR signature) and
  document which the package relies on. Events relate to billing status changes
  (paid/expired/cancelled). Idempotency via event `id`.
- SDK: `@abacatepay/sdk` for Node/TS exists but API-direct is fine (JSON in/out).
- Price is in centavos (BRL), minimum 100 (R$1,00).
