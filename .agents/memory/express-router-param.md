---
name: Express router.param vs router.use for named params
description: Why router.use() silently breaks named-param middleware (returns 400 undefined param) and when to use router.param() instead
---

## The Rule

When guarding routes by a named URL param (e.g. `:orgId`), use `router.param("orgId", handler)` — **not** `router.use(handler)`.

**Why:** `router.use()` middleware fires before Express matches the specific route pattern, so `req.params.orgId` is `undefined` at execution time. The guard sees a missing param and returns 400 before any auth check can happen. `router.param()` fires *after* the route is matched and the param is extracted, before the route handler runs — which is exactly the right moment.

**How to apply:** Any time a router contains routes of the form `/organizations/:orgId/...` and you want a router-level guard on that param, declare it as:

```typescript
router.param("orgId", orgParamGuard);
```

The param callback signature differs from regular middleware — it receives the extracted param value as a 4th argument:

```typescript
async function orgParamGuard(req, res, next, value: string): Promise<void>
```

**Contrast:** Routes that use `:id` (e.g. `GET /organizations/:id`) and apply the guard *per-route* (`router.get("/organizations/:id", orgGuard, handler)`) work fine with a 3-argument middleware because the param is matched at that exact route.

**Where this applies in ARQON:**
- `data-sources.ts`, `findings.ts`, `recommendations.ts` → use `router.param("orgId", orgParamGuard)`
- `organizations.ts` → uses per-route `orgGuard` (3-arg) on `:id` routes
