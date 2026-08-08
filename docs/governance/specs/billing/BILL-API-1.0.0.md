# BILL-API-1.0.0 — Billing Public API Specification

| Field | Value |
|---|---|
| **Document ID** | BILL-API-1.0.0 |
| **Title** | Billing Public API Specification |
| **Version** | 1.0 |
| **Status** | Frozen |
| **Governing standard** | API-001 |
| **Derives from** | ESS-001, API-001, TS-001 |
| **Package** | `@workspace/billing` |
| **Architecture** | BILL-ARCH-1.0.0 |
| **Owners** | CTO · Founder |
| **Planning doc** | SPD-002 |

---

## 1. Metadata header
See table above.

## 2. Purpose

Defines the **public interface** of `@workspace/billing`: the typed functions a
caller (`@workspace/api-server`) uses to create charges, read status, list
charges, and ingest webhooks. Does NOT define runtime flows (BILL-RT), states
(BILL-SM), security (BILL-SEC), or the Abacatepay HTTP mapping
(BILL-ADAPT-ABACATEPAY).

## 3. Scope

### 3.1 In scope
- Public function signatures
- Parameter and return semantics
- Error contracts
- Type definitions for charge data
- Stability marking

### 3.2 Out of scope (owning document)
- Runtime flows → BILL-RT-1.0.0 (RT-001)
- Charge states/transitions → BILL-SM-1.0.0 (SM-001)
- Secrets/webhook verification policy → BILL-SEC-1.0.0 (SEC-001)
- Abacatepay HTTP mapping → BILL-ADAPT-ABACATEPAY (ADAPT-001)
- Persistence schema → Data Model Spec (`@workspace/db`)

## 4. Definitions

| Term | Definition |
|---|---|
| ChargeId | Abacatepay billing id, e.g. `bill_123456` |
| Centavos | Integer BRL cents; minimum 100 (R$1,00) |
| ChargeStatus | `PENDING \| EXPIRED \| CANCELLED \| PAID \| REFUNDED` |

## 5. Contract

### 5.1 Symbol inventory

| Symbol | Kind | Stability | Since |
|---|---|---|---|
| `createCharge` | function | Stable | 1.0.0 |
| `getCharge` | function | Stable | 1.0.0 |
| `listCharges` | function | Stable | 1.0.0 |
| `handleWebhook` | function | Stable | 1.0.0 |
| `BillingClient` | class | Stable | 1.0.0 |
| `Charge` | type | Stable | 1.0.0 |
| `CreateChargeInput` | type | Stable | 1.0.0 |
| `ChargeProduct` | type | Stable | 1.0.0 |
| `ChargeCustomer` | type | Stable | 1.0.0 |
| `WebhookEvent` | type | Stable | 1.0.0 |
| `BillingError` | error | Stable | 1.0.0 |

### 5.2 Signature table

| Symbol | Signature |
|---|---|
| `BillingClient` | `new BillingClient(config: BillingClientConfig)` |
| `createCharge` | `(client: BillingClient, input: CreateChargeInput) => Promise<Charge>` |
| `getCharge` | `(client: BillingClient, id: ChargeId) => Promise<Charge>` |
| `listCharges` | `(client: BillingClient) => Promise<Charge[]>` |
| `handleWebhook` | `(client: BillingClient, req: WebhookRequest) => Promise<WebhookResult>` |

`BillingClientConfig`:
| Field | Type | Meaning |
|---|---|---|
| `apiKey` | string | Abacatepay API key (env-injected, never hardcoded) |
| `webhookSecret` | string | Webhook verification secret (env-injected) |
| `baseUrl` | string | Default `https://api.abacatepay.com/v1` |

### 5.3 Parameter table — `createCharge`

| Parameter | Type | Nullable | Meaning | Ownership | Default |
|---|---|---|---|---|---|
| `products` | `ChargeProduct[]` | no | Items to charge | caller | — |
| `returnUrl` | `string` | no | URL to return to | caller | — |
| `completionUrl` | `string` | no | URL on payment complete | caller | — |
| `customerId` | `string` | yes | Existing Abacatepay customer id | caller | — |
| `customer` | `ChargeCustomer` | yes | New customer data | caller | — |
| `frequency` | `"ONE_TIME"` | no | Charge frequency | caller | `"ONE_TIME"` |
| `methods` | `["PIX"]` | no | Payment methods | caller | `["PIX"]` |

`ChargeProduct`:
| Field | Type | Nullable | Meaning |
|---|---|---|---|
| `externalId` | string | no | Caller-system product id (unique) |
| `name` | string | no | Product name |
| `description` | string | yes | Product description |
| `quantity` | number | no | Quantity, minimum 1 |
| `price` | number | no | Unit price in centavos, minimum 100 |

`ChargeCustomer`:
| Field | Type | Nullable | Meaning |
|---|---|---|---|
| `name` | string | no | Full name |
| `cellphone` | string | no | Phone |
| `email` | string | no | Email |
| `taxId` | string | no | CPF or CNPJ |

### 5.4 Return table

| Symbol | Return type | Nullable | Meaning | Ownership |
|---|---|---|---|---|
| `createCharge` | `Charge` | no | Created charge with payment url | callee (new object) |
| `getCharge` | `Charge` | no | Current charge snapshot | callee |
| `listCharges` | `Charge[]` | no | Charge list | callee |
| `handleWebhook` | `WebhookResult` | no | Verified event + derived status | callee |

`Charge`:
| Field | Type | Nullable | Meaning |
|---|---|---|---|
| `id` | string | no | ChargeId |
| `url` | string | no | Payment URL for the customer |
| `amount` | number | no | Total in centavos |
| `status` | ChargeStatus | no | Current status |
| `devMode` | boolean | no | Whether sandbox |
| `methods` | ("PIX")[] | no | Methods |
| `products` | ChargeProduct[] | no | Products |
| `frequency` | "ONE_TIME" | no | Frequency |
| `nextBilling` | string \| null | yes | Next charge datetime (null for ONE_TIME) |
| `customer` | ChargeCustomer \| null | yes | Customer data |
| `createdAt` | string | no | ISO datetime |
| `updatedAt` | string | no | ISO datetime |

`WebhookResult`:
| Field | Type | Meaning |
|---|---|---|
| `verified` | boolean | Whether verification passed |
| `eventId` | string \| null | Event id for idempotency |
| `chargeId` | string \| null | Affected charge id |
| `status` | ChargeStatus \| null | New status |

### 5.5 Error table

| Symbol | Error | Code/Type | Meaning | Recoverable | State-after-error |
|---|---|---|---|---|---|
| `createCharge` | `BillingError` | `AUTH_FAILED` (401) | Invalid/missing API key | no (fix config) | no charge created |
| `createCharge` | `BillingError` | `VALIDATION` | Invalid input (e.g. price<100) | yes (fix input) | no charge created |
| `createCharge` | `BillingError` | `PROVIDER_ERROR` | Abacatepay 5xx/network | yes (retry) | no charge created |
| `getCharge` | `BillingError` | `AUTH_FAILED` (401) | Invalid/missing key | no | no state change |
| `getCharge` | `BillingError` | `NOT_FOUND` | Unknown id | no | no state change |
| `listCharges` | `BillingError` | `AUTH_FAILED` (401) | Invalid/missing key | no | no state change |
| `handleWebhook` | `BillingError` | `WEBHOOK_UNVERIFIED` | Secret/signature mismatch | no (reject) | no state change |
| `handleWebhook` | `BillingError` | `MALFORMED_EVENT` | Unparseable payload | no | no state change |

> Note: `handleWebhook` MUST fail closed (reject) on `WEBHOOK_UNVERIFIED`
> (SEC-001 R12). All `handleWebhook` errors leave no state change.

### 5.6 Lifecycle & ownership table

| Symbol | Created by | Destroyed by | Ownership | Side effects |
|---|---|---|---|---|
| `Charge` | `createCharge` | caller (GC) | callee-returned | network call to provider |
| `WebhookResult` | `handleWebhook` | caller (GC) | callee-returned | none (verification only) |

### 5.7 OpenAPI mapping

This package exposes no HTTP endpoints itself; the API server wires routes.
The mapping to Abacatepay endpoints lives in BILL-ADAPT-ABACATEPAY.

## 6. Dependencies

Upstream: BILL-ARCH-1.0.0, API-001, ESS-001, TS-001.
Cross-references: BILL-RT (flows), BILL-SM (state-changing symbols), BILL-SEC
(auth-touching symbols).

## 7. Invariants

| ID | Invariant | Testable as |
|---|---|---|
| INV-A1 | `price` is integer centavos ≥ 100 | Type/validator test |
| INV-A2 | `amount` returned is integer centavos | Type test |
| INV-A3 | `status` is one of the 5 enum values | Type test |
| INV-A4 | No symbol logs or returns the API key | Inspection |

## 8. Non-compliance & remediation

- Undocumented error in code → defect; add to error table (API-R8).
- Float money representation → defect; enforce integer.
- Breaking signature change without ADR/major bump → block release.

## 9. Validation

### Universal/structural: per ESS-001/API-001.
### Content (API-C)

| ID | Check | Pass/Fail |
|---|---|---|
| BA-PI-C01 | Every public symbol in inventory | ☐ |
| BA-PI-C02 | Every symbol has signature row | ☐ |
| BA-PI-C03 | Every parameter has semantics | ☐ |
| BA-PI-C04 | Every return has semantics | ☐ |
| BA-PI-C05 | Every error listed + recoverable/state-after | ☐ |
| BA-PI-C06 | Every symbol marked Stable | ☐ |
| BA-PI-C07 | Ownership declared | ☐ |
| BA-PI-C08 | Nullability explicit | ☐ |

### Consistency (API-X)

| ID | Check | Pass/Fail |
|---|---|---|
| BA-PI-X01 | Error table consistent with BILL-RT error paths | ☐ |
| BA-PI-X02 | State-changing symbols cite BILL-SM transitions | ☐ |
| BA-PI-X03 | Auth-touching symbols cite BILL-SEC requirements | ☐ |

## 10. Quality gates

| Gate | Requirement | Enforced by |
|---|---|---|
| BAPG-01 | Signature completeness | API reviewer |
| BAPG-02 | Error exhaustiveness + RT co-sign | API reviewer + RT owner |
| BAPG-03 | State-change/SM consistency + SM co-sign | API reviewer + SM owner |
| BAPG-04 | Auth/SEC consistency + SEC co-sign | API reviewer + SEC owner |
| BAPG-05 | In-git freeze | CTO |

## 11. Change history

| Version | Date | Author | Change |
|---|---|---|---|
| 1.0 | (commit date) | CTO | Initial public API for packages/billing; 4 functions + types; first slice (PIX ONE_TIME). |
