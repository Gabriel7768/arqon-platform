# ARQON Revenue Engine

A full-stack SaaS app that helps companies identify hidden revenue leaks by analyzing CSV data exports (invoices, CRM pipeline, contracts) and surfacing actionable findings with recommendations.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string, `SESSION_SECRET` — JWT signing secret

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, TanStack Query, wouter, shadcn/ui, Tailwind CSS
- API: Express 5 + OpenAPI-first contract (Orval codegen)
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- Auth: JWT stored in localStorage as `arqon_token`; `setAuthTokenGetter` wires it into every API call
- Build: esbuild (CJS bundle for API server)

## Where things live

- `lib/api-spec/openapi.yaml` — source of truth for all API contracts
- `lib/api-client-react/src/generated/` — generated TanStack Query hooks (do not edit)
- `lib/api-zod/src/generated/` — generated Zod schemas (do not edit)
- `lib/db/src/schema/` — Drizzle ORM table definitions (users, organizations, data-sources, findings, recommendations)
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/api-server/src/lib/revenue-engine.ts` — CSV analysis with 4 detectors
- `artifacts/api-server/uploads/` — uploaded CSV files stored here
- `artifacts/web/src/` — React frontend (pages, components, lib)

## Architecture decisions

- **OpenAPI-first**: all API shapes defined in `openapi.yaml`, then Orval generates hooks + Zod schemas. Never write client-side fetch calls manually.
- **JWT in localStorage**: token stored as `arqon_token`; `setAuthTokenGetter` in `custom-fetch.ts` injects it as `Authorization: Bearer` on every request.
- **Revenue engine runs synchronously** on the `/analyze` endpoint (behind `setImmediate` for non-blocking). Re-running analysis clears old findings for that data source first.
- **Import from barrel only**: always import from `@workspace/api-client-react` (not deep paths like `/src/generated/api.schemas`). The barrel re-exports everything.
- **`queryKey` required**: generated hooks require explicit `queryKey` in the `query` options object (TanStack Query v5 strict mode).

## Product

- **Auth**: register (auto-creates an org) + login with JWT
- **Dashboard**: aggregate metrics — critical/high findings count, top recommendations queue
- **Data Sources**: upload CSV files, trigger revenue analysis, poll status
- **Findings**: browse and filter revenue leaks (overdue invoices, inactive customers, stalled opportunities, contract expirations); update status
- **Recommendations**: actionable playbooks linked to findings; mark complete
- **Organizations**: manage org name, industry, currency
- **Settings**: user profile, logout

## Demo account

- Email: `demo@arqon.io` / Password: `demo123456`
- Pre-seeded with 20-row CSV → 62 findings and 62 recommendations across all 4 detector types

## Gotchas

- Always run `pnpm run typecheck:libs` before `pnpm --filter @workspace/api-server run typecheck` when DB schema changes — stale lib declarations cause false "missing export" errors.
- `pnpm --filter @workspace/api-spec run codegen` must be re-run after any `openapi.yaml` change.
- CSV uploads are stored in `artifacts/api-server/uploads/` — this directory must exist before the server starts (it's gitignored but created by multer automatically).

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
