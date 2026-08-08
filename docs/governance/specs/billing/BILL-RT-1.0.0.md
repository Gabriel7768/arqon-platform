# BILL-RT-1.0.0 — Billing Runtime Specification

| Field | Value |
|---|---|
| **Document ID** | BILL-RT-1.0.0 |
| **Title** | Billing Runtime Specification |
| **Version** | 1.0 |
| **Status** | Frozen |
| **Governing standard** | RT-001 |
| **Derives from** | ESS-001, RT-001, API-001, TS-001 |
| **Architecture** | BILL-ARCH-1.0.0 |
| **Owners** | CTO · Founder |
| **Planning doc** | SPD-002 |

---

## 1. Metadata header
See table above.

## 2. Purpose

Defines the **runtime behavior** of `@workspace/billing`: how charges are
created, how webhooks are ingested, retry/idempotency, lifecycle, concurrency.
Does NOT define signatures (BILL-API), states (BILL-SM), or security policy
(BILL-SEC).

## 3. Scope

### 3.1 In scope
- Charge-creation execution flow
- Webhook ingestion flow
- Retry, timeout, cancellation
- Idempotency (in-flight dedup, webhook dedup)
- Lifecycle phases of the BillingClient
- Caching behavior (none in first slice; declared)
- Error propagation

### 3.2 Out of scope (owning document)
- Public signatures → BILL-API-1.0.0 (API-001)
- States/transitions → BILL-SM-1.0.0 (SM-001)
- Secrets/webhook verification policy → BILL-SEC-1.0.0 (SEC-001)
- Provider HTTP mapping → BILL-ADAPT-ABACATEPAY (ADAPT-001)

## 4. Definitions

Inherits RT-001 §4. Additional:

| Term | Definition |
|---|---|
| In-flight dedup | Collapsing concurrent identical createCharge calls into one |
| Webhook dedup | Skipping a webhook already processed by event id |

## 5. Method Behaviors

### 5.1 createCharge

**Success flow:**
1. Trigger: caller invokes `createCharge(client, input)`.
2. Preconditions: client configured with valid apiKey; input valid (products
   non-empty, price≥100, returnUrl/completionUrl present).
3. Validate input (BILL-SEC R6 boundary validation).
4. Build provider request (BILL-ADAPT mapping).
5. POST to Abacatepay `/billing/create` with bearer auth.
6. On 200 + `success:true`: map `data` → `Charge`; return.
7. Postconditions: a Charge with status PENDING exists at provider; SM T-01 fired.
8. Observable: outbound HTTPS to `api.abacatepay.com`; no persistence (caller persists).
9. References: BILL-API `createCharge`; SM T-01; SEC R2 (no key logged); PERF
   (provider latency, TBD).

**Error flow (provider 5xx/network):**
1. Trigger: network failure or provider 5xx.
2. Retry per §12 (exponential backoff, max 3, jitter).
3. On final failure: throw `BillingError(PROVIDER_ERROR)`; no charge created;
   no SM transition.

**Error flow (validation):**
1. Trigger: invalid input.
2. Throw `BillingError(VALIDATION)`; no provider call; no state change.

**Error flow (auth):**
1. Trigger: provider returns 401.
2. Throw `BillingError(AUTH_FAILED)`; no charge; no state change. Not retried.

### 5.2 getCharge / listCharges

Read-through to provider. No retry beyond a single re-attempt on transient
network. Errors: AUTH_FAILED, NOT_FOUND (getCharge), PROVIDER_ERROR. No state
change; no SM transition (reads).

### 5.3 handleWebhook

**Success flow:**
1. Trigger: caller passes an inbound webhook request.
2. Preconditions: client configured with webhookSecret.
3. Verify webhook (BILL-SEC R7): check query `webhookSecret` AND/OR
   `X-Webhook-Signature`; fail closed if mismatch (SEC R12).
4. Parse payload; extract `eventId`, `chargeId`, new status.
5. Webhook dedup: if `eventId` already processed, return verified+idempotent
   (no transition). (SEC R8)
6. Derive new status; map to SM transition T-02..T-05.
7. Return `WebhookResult{verified:true, eventId, chargeId, status}`.
8. Postconditions: caller is informed of the new status; package persists
   nothing (caller persists + fires SM transition).
9. References: BILL-API `handleWebhook`; SM T-02..T-05; SEC R7/R8/R12.

**Error flow (unverified):**
1. Trigger: secret/signature mismatch.
2. Throw `BillingError(WEBHOOK_UNVERIFIED)`; no state change; fail closed.

**Error flow (malformed):**
1. Trigger: unparseable payload.
2. Throw `BillingError(MALFORMED_EVENT)`; no state change.

## 6. Concurrency Model

| Element | Requirement |
|---|---|
| Shared state | None in the package (stateless client; caller owns persistence) |
| Isolation | Per-request; no global mutable state |
| Synchronization | None needed (stateless) |
| Locking | None |
| Ordering | No cross-request ordering guarantee |
| Race avoidance | Caller handles concurrent webhook + read reconciliation |
| Memory ownership | Each call owns its request/response objects |
| Visibility | N/A (no shared mutable state) |

## 7. Caching Behavior

No cache in the first slice. Declared as: charge reads always hit the provider.
A future cache (e.g., short TTL on getCharge) would be added via a cache
descriptor table; not in scope now.

## 8. Lifecycle Phases

| Phase | Entry | Exit | State | Side effects |
|---|---|---|---|---|
| construction | `new BillingClient(config)` | config validated | configured | none |
| initialization | (merged with construction) | ready | ready | none |
| steady state | first call | client discarded | active | outbound HTTPS |
| shutdown | client discarded (GC) | — | disposed | none |
| disposal | GC | — | gone | none |

No background tasks in the first slice (no polling). Recovery: stateless, so
"recovery" is simply a new client.

## 9. Error Propagation Policy

| Error class | Propagated to | Recoverable | State-after-error | Escalation |
|---|---|---|---|---|
| AUTH_FAILED | caller | no (config) | no state change | operator fixes key |
| VALIDATION | caller | yes (fix input) | no state change | — |
| PROVIDER_ERROR | caller | yes (retry) | no state change | alert after N fails |
| NOT_FOUND | caller | no | no state change | — |
| WEBHOOK_UNVERIFIED | caller | no | no state change | alert (possible attack) |
| MALFORMED_EVENT | caller | no | no state change | alert (provider issue) |

## 10. Background Tasks

None in the first slice. (No polling; status arrives via webhook.) Declared per
RT-001 §10: a future polling fallback would need the four-phase descriptor
(trigger, execution, error handling, shutdown) — not in scope.

## 11. Resource Ownership

| Resource | Owner | Transfer direction | Release condition |
|---|---|---|---|
| HTTP request/response objects | package call | caller→package→provider (transient) | after response |
| `Charge`/`WebhookResult` objects | package (created) | package→caller (transferred) | caller GC |

## 12. Retry Policy

| Operation | Max attempts | Backoff | Retryable errors | Jitter | Circuit breaker |
|---|---|---|---|---|---|
| createCharge (provider call) | 3 | exponential 200ms×2^n | PROVIDER_ERROR (5xx/network) | yes | not in first slice |
| getCharge/listCharges | 2 | exponential | PROVIDER_ERROR | yes | not in first slice |
| handleWebhook | 0 | n/a | none (fail closed) | n/a | n/a |

AUTH_FAILED, VALIDATION, NOT_FOUND, WEBHOOK_UNVERIFIED, MALFORMED_EVENT are
NOT retried.

## 13. Cancellation Contract

| Operation | Cancellation trigger | Effect | Cleanup | State-after-cancel |
|---|---|---|---|---|
| createCharge | caller aborts promise | outbound request aborted if in-flight | none | no charge created |
| getCharge/listCharges | caller aborts | request aborted | none | no state change |
| handleWebhook | caller aborts | verification abandoned | none | no state change |

## 14. Fallback Chain

No fallback in the first slice (single provider). A second provider would form
a fallback chain via a second adapter; declared out of scope.

## 15. Domain rules (RT-001 §15)

| Rule | Status |
|---|---|
| RT-R1 Execution flow completeness | Each method has success + error flow ✓ |
| RT-R2 Error path exhaustiveness | Consistent with BILL-API error table ✓ |
| RT-R3 Mandatory concurrency statements | Stateless; declared ✓ |
| RT-R4 State transition citation | createCharge→T-01; handleWebhook→T-02..T-05 ✓ |
| RT-R5 Background task 4-phase | N/A (none in first slice) ✓ |
| RT-R6 Resource ownership direction | Explicit ✓ |
| RT-R7 In-flight dedup | Key=normalized input; window=request lifetime; result shared; eviction=on completion. Concurrent identical createCharge calls collapse if same normalized input. |
| RT-R8 Partial failure | N/A (single provider call per operation) |
| RT-R9 Memory visibility | N/A (no shared state) |
| RT-R10 Lock acquisition order | N/A (no locks) |

## 16. Validation

### Structural (RT-S): BA-RT-S01..S11 — all sections present (§5..§14) ✓
### Content (RT-C): preconditions/postconditions/error table/thread-safety/cache
descriptor/lifecycle/error propagation/ownership/retry/cancellation/fallback —
present; background-task descriptor N/A (none).
### Consistency (RT-X)

| ID | Check | Pass/Fail |
|---|---|---|
| BA-RT-X01 | Error table consistent with BILL-API error table | ☐ |
| BA-RT-X02 | State-changing methods cite SM transitions | ☐ |
| BA-RT-X03 | Background tasks 4-phase (N/A) | ☐ |
| BA-RT-X04 | Resource ownership direction explicit | ☐ |
| BA-RT-X05 | In-flight dedup has 4 properties | ☐ |
| BA-RT-X06 | Partial failure specified (N/A declared) | ☐ |
| BA-RT-X07 | Memory visibility (N/A declared) | ☐ |
| BA-RT-X08 | Lock order (N/A) | ☐ |
| BA-RT-X09 | Concurrency statements (stateless) | ☐ |
| BA-RT-X10 | Retry consistent with recoverability | ☐ |

## 17. Quality gates

| Gate | Requirement | Enforced by |
|---|---|---|
| BARTG-11 | TEST owner co-sign: postconditions + error paths testable | TEST owner |

(Plus RTG-01..10 inherited from RT-001.)

## 18. Change history

| Version | Date | Author | Change |
|---|---|---|---|
| 1.0 | (commit date) | CTO | Initial runtime spec; first slice flows (createCharge, webhook, read-through); stateless, retry, idempotency. |
