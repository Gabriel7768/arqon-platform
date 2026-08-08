# BILL-ARCH-1.0.0 — Billing Architecture Specification

| Field | Value |
|---|---|
| **Document ID** | BILL-ARCH-1.0.0 |
| **Title** | Billing Architecture Specification |
| **Version** | 1.0 |
| **Status** | Frozen |
| **Governing standard** | ESS-001 |
| **Derives from** | EDS-001, EES-001, ESS-001, TS-001 |
| **Authorizing ADR** | ADR-BILL-001 (to be created on first major change) |
| **Package** | `@workspace/billing` (`packages/billing`) |
| **Owners** | CTO (technical sign-off) · Founder (freeze authority) |
| **Planning doc** | SPD-002 |

---

## 1. Metadata header
See table above.

## 2. Purpose

This specification defines the **module boundaries and integration topology** of
the `@workspace/billing` package. It defines WHAT the package is responsible for
and how it relates to the rest of the platform. It does NOT define public
signatures (BILL-API), runtime flows (BILL-RT), states (BILL-SM), or security
controls (BILL-SEC).

## 3. Scope

### 3.1 In scope
- Package boundary and responsibilities
- Integration topology with Abacatepay
- Dependency graph (upstream/downstream)
- Adapter topology (which adapters exist)
- Deployment surface (which hosts touch the package)

### 3.2 Out of scope (owning document)
- Public signatures → BILL-API-1.0.0 (API-001)
- Execution flows → BILL-RT-1.0.0 (RT-001)
- Charge states/transitions → BILL-SM-1.0.0 (SM-001)
- Secrets/webhook security → BILL-SEC-1.0.0 (SEC-001)
- Provider HTTP mapping → BILL-ADAPT-ABACATEPAY (ADAPT-001)
- Test contracts → BILL-TEST-1.0.0
- Host env config → BILL-DEPLOY-1.0.0 (DEPLOY-001)
- Persistence schema → Data Model Spec (owned by `@workspace/db`)

## 4. Definitions

| Term | Definition |
|---|---|
| Charge | A single payment intent created at Abacatepay (a "billing") |
| Provider | Abacatepay (`https://api.abacatepay.com/v1`) |
| Dev mode | Abacatepay sandbox; identified by `devMode: true` in response |
| Webhook | Inbound notification from Abacatepay on charge status change |

## 5. Contract

### 5.1 Module boundaries

`packages/billing` is a **platform library** (per EDS-001 §6, lives in
`packages/`, consumed via `@workspace/billing` scoped import). It:

- Owns all Abacatepay communication.
- Exposes a typed core interface (BILL-API) to the platform.
- Does NOT own persistence; it returns typed results for the caller to persist.
- Does NOT own HTTP routing; the API server wires routes to the package.
- Does NOT own authn/authz of platform users; it verifies Abacatepay-origin
  webhooks (BILL-SEC) but platform-user authz is the caller's job.

### 5.2 Responsibility matrix

| Responsibility | Owner |
|---|---|
| Create PIX charge | `@workspace/billing` |
| Fetch charge status | `@workspace/billing` |
| List charges | `@workspace/billing` |
| Ingest + verify webhook | `@workspace/billing` (verify), caller (persist result) |
| Provider HTTP mapping | `@workspace/billing` (via BILL-ADAPT-ABACATEPAY) |
| Persist charge records | `@workspace/db` (caller) |
| Platform user authn/authz | `@workspace/api-server` (caller) |
| Expose HTTP routes | `@workspace/api-server` (caller) |

### 5.3 Dependency graph

```
@workspace/billing
   │  (outbound HTTPS)
   ▼
Abacatepay API (external)

@workspace/api-server ──uses──> @workspace/billing
@workspace/db        <──persists── @workspace/api-server (charge records)
```

Upstream: none platform-internal (only external HTTPS to Abacatepay).
Downstream: `@workspace/api-server` is the only consumer in the first slice.

### 5.4 Adapter topology

| Adapter | Surface | First slice? |
|---|---|---|
| BILL-ADAPT-ABACATEPAY | Abacatepay HTTP API | Yes |
| (future) BILL-ADAPT-STRIPE | Stripe | No |

Only the Abacatepay adapter exists in the first slice. The architecture is
adapter-isolated so a second provider can be added without changing the core
interface (per ADAPT-001 R2/R3).

### 5.5 Deployment surface

| Host | Touches billing how | First slice? |
|---|---|---|
| Render (API server) | Imports `@workspace/billing`, calls createCharge, handles webhook route | Yes |
| Vercel (web) | None (billing is server-side only in first slice) | No |
| Supabase | Stores charge records (via `@workspace/db`), not directly billing | Indirect |

## 6. Dependencies

Upstream standards: ESS-001, TS-001, EDS-001, EES-001.
Authorizing ADR: ADR-BILL-001 (pending creation).
No downstream spec references (ARCH is the root of the billing spec graph).

## 7. Invariants

| ID | Invariant | Testable as |
|---|---|---|
| INV-1 | The package never sends the Abacatepay API key to any host other than `api.abacatepay.com` | Outbound-request inspection |
| INV-2 | The package never logs the API key or webhook secret | Log inspection |
| INV-3 | Webhook processing is idempotent by event id | Repeat-delivery test |
| INV-4 | Money is represented as integer centavos BRL, never float | Type check |

## 8. Non-compliance & remediation

- Boundary violation (e.g., package persists data) → architecture review;
  refactor to return typed results to the caller.
- Missing ADR on major change → block release until ADR created (EES-001 §4).
- Invariant violation → defect; blocks release.

## 9. Validation

| ID | Check | Pass/Fail |
|---|---|---|
| BA-01 | Module boundaries declared (§5.1) | ☐ |
| BA-02 | Responsibility matrix complete (§5.2) | ☐ |
| BA-03 | Dependency graph acyclic (§5.3) | ☐ |
| BA-04 | Adapter topology declared (§5.4) | ☐ |
| BA-05 | Deployment surface declared (§5.5) | ☐ |
| BA-06 | Invariants present and testable (§7) | ☐ |
| BA-07 | Out-of-scope topics cite owning doc (§3.2) | ☐ |
| BA-08 | Cites governing standard ESS-001 | ☐ |

## 10. Change history

| Version | Date | Author | Change |
|---|---|---|---|
| 1.0 | (commit date) | CTO | Initial architecture spec for packages/billing; first slice scoped to PIX one-time charges + webhook. |
