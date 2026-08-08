# BILL-TEST-1.0.0 — Billing Testing Specification

| Field | Value |
|---|---|
| **Document ID** | BILL-TEST-1.0.0 |
| **Title** | Billing Testing Specification |
| **Version** | 1.0 |
| **Status** | Frozen |
| **Governing standard** | (TEST-001 — pending; authored against RT-001 postconditions) |
| **Derives from** | ESS-001, RT-001, TS-001 |
| **Architecture** | BILL-ARCH-1.0.0 |
| **Owners** | CTO · Founder |
| **Planning doc** | SPD-002 |

---

## 1. Metadata header
See table above.

## 2. Purpose

Defines the **test contracts** that verify `@workspace/billing` meets its
Runtime Spec postconditions and error paths. Provides the TEST-owner co-sign
required by RTG-11 (BILL-RT) and BSMG-06 (BILL-SM). Does NOT define the package
behavior itself.

## 3. Scope

### 3.1 In scope
- Test contracts per public symbol
- Coverage of BILL-RT postconditions
- Coverage of BILL-RT error paths
- Coverage of BILL-SM transitions/invariants
- Dev-mode simulation strategy (Abacatepay sandbox)
- Mock/no-mock boundaries

### 3.2 Out of scope (owning document)
- Behavior definition → BILL-RT / BILL-API / BILL-SM
- Security policy → BILL-SEC
- Host config → BILL-DEPLOY

## 4. Definitions

| Term | Definition |
|---|---|
| Dev-mode simulation | Abacatepay sandbox key + simulated payment to trigger webhooks |

## 5. Contract

### 5.1 Test contracts per symbol

| Symbol | Contract under test | Type |
|---|---|---|
| `createCharge` | On valid input + 200 success: returns Charge with status PENDING, devMode reflects key, amount=sum(products) | unit (mocked provider) |
| `createCharge` | On 401: throws AUTH_FAILED; no provider charge | unit |
| `createCharge` | On validation error (price<100): throws VALIDATION; no outbound call | unit |
| `createCharge` | On 5xx then success: retries then returns Charge | unit |
| `createCharge` | On 5xx after 3 attempts: throws PROVIDER_ERROR; no charge | unit |
| `getCharge` | Returns current Charge snapshot; NOT_FOUND on unknown id | unit |
| `listCharges` | Returns Charge[] from provider | unit |
| `handleWebhook` | On verified event: returns WebhookResult with status | unit |
| `handleWebhook` | On secret mismatch: throws WEBHOOK_UNVERIFIED; no state change | unit |
| `handleWebhook` | On signature mismatch: throws WEBHOOK_UNVERIFIED | unit |
| `handleWebhook` | On duplicate event id: returns idempotent result; no re-transition | unit |
| `handleWebhook` | On malformed payload: throws MALFORMED_EVENT | unit |

### 5.2 RT postcondition coverage (RTG-11 co-sign)

| RT postcondition | Testable as | Covered by |
|---|---|---|
| createCharge success → Charge PENDING exists | assert returned Charge.status==="PENDING" | createCharge unit |
| createCharge provider error → no charge | assert no Charge returned/created | createCharge error unit |
| handleWebhook verified → new status surfaced | assert WebhookResult.status | handleWebhook unit |
| handleWebhook unverified → no state change | assert throw, no transition | handleWebhook error unit |
| webhook idempotent by event id | repeat delivery → same result, no double transition | handleWebhook dedup unit |
| retry bounded (3) | assert call count on persistent 5xx | createCharge retry unit |
| fail closed on auth | assert no retry on 401 | createCharge auth unit |

### 5.3 SM transition/invariant coverage (BSMG-06 co-sign)

| Transition/Invariant | Testable as | Covered by |
|---|---|---|
| T-01 → PENDING | createCharge success | createCharge unit |
| T-02 PENDING→PAID | webhook paid | handleWebhook unit |
| T-03 → EXPIRED | webhook expired | handleWebhook unit |
| T-04 → CANCELLED | webhook cancelled | handleWebhook unit |
| T-05 PAID→REFUNDED | webhook refunded | handleWebhook unit |
| INV-S2 terminals have no outgoing | transition-table test | SM structural test |
| INV-S3 REFUNDED was PAID | audit trace test | integration |

### 5.4 SEC coverage

| SEC requirement | Testable as | Covered by |
|---|---|---|
| SEC-R2 no secret in code | grep test (no key value) | lint |
| SEC-R7 webhook verified | mismatch tests | handleWebhook unit |
| SEC-R8 idempotent | duplicate event id test | handleWebhook unit |
| SEC-R12 fail closed | unverified throws, no state | handleWebhook error unit |
| INV-2 no secret logged | log capture test | unit |

### 5.5 Dev-mode simulation strategy

- Unit tests mock the Abacatepay HTTP surface (envelope responses) — no network.
- Integration tests use a **dev-mode API key** against the Abacatepay sandbox,
  create a charge, simulate payment (per docs), and assert the webhook flow.
  Integration tests are gated behind an env flag (`BILL_INTEGRATION=1`) and do
  not run in CI without it.

### 5.6 Mock/no-mock boundary

- Mock: Abacatepay HTTP responses in unit tests (deterministic, no network).
- No-mock: real Abacatepay sandbox in integration tests only.
- NEVER mock the core types — always assert against real `Charge`/`WebhookResult`.

## 6. Dependencies

Upstream: BILL-ARCH, BILL-RT, BILL-SM, BILL-SEC, ESS-001.
No downstream references.

## 7. Invariants

| ID | Invariant | Testable as |
|---|---|---|
| INV-T1 | Every RT postcondition has ≥1 test | coverage mapping |
| INV-T2 | Every SM transition has ≥1 test | coverage mapping |
| INV-T3 | No unit test hits the network | network guard |

## 8. Non-compliance & remediation

- An RT postcondition with no test → block freeze (RTG-11 fails).
- A unit test hitting the network → defect; mock the provider surface.

## 9. Validation

| ID | Check | Pass/Fail |
|---|---|---|
| BT-01 | Every public symbol has ≥1 test contract | ☐ |
| BT-02 | Every RT postcondition covered (RTG-11 co-sign) | ☐ |
| BT-03 | Every SM transition covered (BSMG-06 co-sign) | ☐ |
| BT-04 | SEC requirements covered | ☐ |
| BT-05 | Mock/no-mock boundary declared | ☐ |
| BT-06 | Integration tests env-gated | ☐ |
| BT-07 | No core types mocked | ☐ |

## 10. Quality gates

| Gate | Requirement | Enforced by |
|---|---|---|
| BTG-01 | RT postcondition coverage | TEST owner |
| BTG-02 | SM transition coverage | TEST owner |
| BTG-03 | SEC coverage | Security reviewer |
| BTG-04 | No-network unit tests | CI |
| BTG-05 | In-git freeze | CTO |

## 11. Change history

| Version | Date | Author | Change |
|---|---|---|---|
| 1.0 | (commit date) | CTO | Initial testing spec; provides RTG-11 + BSMG-06 co-signs; dev-mode integration strategy; mock/no-mock boundary. |
