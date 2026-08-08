# BILL-ADAPT-ABACATEPAY — Billing Adapter Specification (Abacatepay)

| Field | Value |
|---|---|
| **Document ID** | BILL-ADAPT-ABACATEPAY |
| **Title** | Billing Adapter Specification — Abacatepay |
| **Version** | 1.0 |
| **Status** | Frozen |
| **Governing standard** | ADAPT-001 |
| **Derives from** | ESS-001, ADAPT-001, API-001, RT-001, TS-001 |
| **Architecture** | BILL-ARCH-1.0.0 |
| **Owners** | CTO · Founder |
| **Planning doc** | SPD-002 |

---

## 1. Metadata header
See table above.

## 2. Purpose

Defines the **mapping** between the `@workspace/billing` core contract and the
Abacatepay HTTP API surface. It does NOT redefine the core contract (ADAPT-R2);
it maps it. Does NOT define signatures (BILL-API) or runtime flows (BILL-RT).

## 3. Scope

### 3.1 In scope
- Adapter identity (surface = Abacatepay HTTP API)
- Adapter interface (what the adapter implements)
- Mapping table (core → HTTP endpoint + envelope)
- Lifecycle hooks (request lifecycle, no persistent lifecycle)
- Surface constraints (HTTP/JSON/bearer)
- Fallback (none in first slice)

### 3.2 Out of scope (owning document)
- Core contract definition → BILL-API / BILL-ARCH
- Core runtime behavior → BILL-RT
- Core states → BILL-SM
- Security policy → BILL-SEC (adapter applies it, does not define it)

## 4. Definitions

| Term | Definition |
|---|---|
| Envelope | Abacatepay response shape `{data, error, success}` |

## 5. Contract

### 10. Adapter identity

| Aspect | Value |
|---|---|
| Surface | Abacatepay HTTP API |
| Core package | `@workspace/billing` |
| Base URL | `https://api.abacatepay.com/v1` |
| Auth | `Authorization: Bearer <ABACATEPAY_API_KEY>` |
| Content-Type | `application/json` |

### 11. Adapter interface table

| Method | Signature | Maps to core | Stability |
|---|---|---|---|
| `postBillingCreate` | `(body: BillingCreateBody) => Promise<Envelope<Billing>>` | `createCharge` | Stable |
| `getBillingList` | `() => Promise<Envelope<Billing[]>>` | `listCharges` | Stable |
| (getCharge) | derived via list/filter (no single GET endpoint in first slice) | `getCharge` | Stable |

> Note: Abacatepay exposes `/billing/list`; a single-charge fetch is derived by
> listing and filtering by id. If a direct endpoint exists later, the adapter
> swaps implementations without changing the core interface (ADAPT-R2).

### 12. Mapping table

| Core contract element | Adapter surface element | Direction | Transform | Notes |
|---|---|---|---|---|
| `createCharge` | `POST /billing/create` | core→surface | map input→BillingCreateBody | frequency=ONE_TIME, methods=[PIX] |
| `CreateChargeInput.products` | body `products[]` | core→surface | externalId,name,description?,quantity,price(cents) | price min 100 |
| `CreateChargeInput.customer` | body `customer` | core→surface | name,cellphone,email,taxId | optional |
| `CreateChargeInput.customerId` | body `customerId` | core→surface | string | optional |
| `CreateChargeInput.returnUrl` | body `returnUrl` | core→surface | uri | required |
| `CreateChargeInput.completionUrl` | body `completionUrl` | core→surface | uri | required |
| provider `data` (Billing) | `Charge` | surface→core | map Billing→Charge (id,url,amount,status,devMode,methods,products,frequency,nextBilling,customer,createdAt,updatedAt) | |
| `listCharges` | `GET /billing/list` | core→surface | none | |
| provider `data[]` | `Charge[]` | surface→core | map each Billing→Charge | |
| error 401 | `BillingError(AUTH_FAILED)` | surface→core | — | not retried |
| error 5xx/network | `BillingError(PROVIDER_ERROR)` | surface→core | — | retried per BILL-RT §12 |
| `success:false` envelope | `BillingError(PROVIDER_ERROR)` | surface→core | use `error` field | |

### 13. Lifecycle hooks table

| Hook | When | Core lifecycle phase | Effect | Cleanup |
|---|---|---|---|---|
| beforeRequest | each outbound call | steady state | inject bearer header, set Content-Type | none |
| afterResponse | each response | steady state | unwrap envelope; map to core type or error | none |
| onError | retry exhausted | steady state | throw mapped BillingError | none |

No persistent lifecycle (stateless adapter). Construction = configured baseUrl+key.

### 14. Surface constraints table

| Constraint | Rule | Enforcement |
|---|---|---|
| JSON only | request/response Content-Type application/json | adapter enforces |
| Bearer auth | Authorization header required | adapter enforces |
| Envelope unwrap | success:false → error | adapter enforces |
| cents integer | price/amount integer ≥100 | adapter validates before send |
| PIX only | methods=[PIX], frequency=ONE_TIME | adapter enforces (first slice) |

### 15. Fallback table

| Condition | Fallback behavior | User-visible effect |
|---|---|---|
| provider unreachable after retries | throw PROVIDER_ERROR (no fallback in first slice) | caller surfaces error |

No second provider in the first slice; fallback chain is empty (declared per
ADAPT-R5).

### 16. Versioning

Adapter versions independently of core (ADAPT-R6). A core major bump that
breaks the mapping triggers an adapter major bump. Abacatepay API is v1; if
they release v2, a new adapter major handles it.

## 6. Dependencies

Upstream: BILL-ARCH, BILL-API, BILL-RT, ADAPT-001, ESS-001.
Cross: BILL-SEC (adapter applies webhook verification independently — the
webhook is inbound to the API server, handled by handleWebhook in core, not
this outbound adapter).

## 7. Domain rules

ADAPT-R1 mapping completeness (every exposed core element mapped ✓); R2 no
core redefinition ✓; R3 no surface type leakage to core (core uses `Charge`,
not raw `Billing`) ✓; R4 lifecycle alignment ✓; R5 fallback declared ✓; R6
independent versioning ✓; R7 direction explicit ✓; R8 constraints enforceable ✓.

## 8. Validation

### Structural (ADAPT-S): all 6 tables present ✓
### Content (ADAPT-C): all 7 content checks satisfied ✓
### Consistency (ADAPT-X)

| ID | Check | Pass/Fail |
|---|---|---|
| BA-AD-X01 | Mapping cites existing core symbols (createCharge, listCharges, Charge) | ☐ |
| BA-AD-X02 | Hooks cite core lifecycle phases | ☐ |
| BA-AD-X03 | Adapter interface conforms to API-001 (mapped, not redefined) | ☐ |
| BA-AD-X04 | Adapter runtime conforms to RT-001 (retry/timeout from BILL-RT) | ☐ |

## 9. Quality gates

| Gate | Requirement | Enforced by |
|---|---|---|
| BAADG-01..07 | (inherited from ADAPT-001) | Adapter reviewer + core owner co-sign |

## 10. Change history

| Version | Date | Author | Change |
|---|---|---|---|
| 1.0 | (commit date) | CTO | Initial Abacatepay adapter spec; maps createCharge→POST /billing/create, listCharges→GET /billing/list, envelope {data,error,success}. |
