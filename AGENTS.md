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
- **In-flight initiative:** `packages/i18n` — extract a reusable, white-label,
  multi-tenant i18n platform package. Architectured via ADR-001 through ADR-008.

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
