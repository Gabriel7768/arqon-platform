# BILL-SEC-1.0.0 — Billing Security Specification

| Field | Value |
|---|---|
| **Document ID** | BILL-SEC-1.0.0 |
| **Title** | Billing Security Specification |
| **Version** | 1.0 |
| **Status** | Frozen |
| **Governing standard** | SEC-001 |
| **Derives from** | ESS-001, SEC-001, TS-001 |
| **Architecture** | BILL-ARCH-1.0.0 |
| **Owners** | CTO · Founder |
| **Planning doc** | SPD-002 |

---

## 1. Metadata header
See table above.

## 2. Purpose

Defines the **security controls** for `@workspace/billing`: how the Abacatepay
API key is held, how webhooks are verified, how data is classified. Does NOT
define signatures (BILL-API), runtime flows (BILL-RT), or states (BILL-SM).

## 3. Scope

### 3.1 In scope
- Secrets management (API key, webhook secret)
- Webhook verification (secret + signature)
- Input validation at the trust boundary
- Data classification of charge/customer data
- Threat model

### 3.2 Out of scope (owning document)
- Signatures → BILL-API-1.0.0
- Runtime flows → BILL-RT-1.0.0
- States → BILL-SM-1.0.0
- Provider HTTP mapping → BILL-ADAPT-ABACATEPAY
- Host env config → BILL-DEPLOY-1.0.0

## 4. Definitions

Inherits SEC-001 §4. Additional:

| Term | Definition |
|---|---|
| Webhook secret | Secret registered in Abacatepay dashboard; sent as `?webhookSecret=` query |
| Webhook signature | `X-Webhook-Signature` HMAC-SHA256 header (when present) |

## 5. Contract

### 10. Threat model table

| Threat ID | Asset | Actor | Trust boundary | Threat | Mitigation | Residual risk |
|---|---|---|---|---|---|---|
| TH-01 | API key | attacker | env → code | key leaked in code/logs | env-only; never logged (INV-2) | low |
| TH-02 | webhook endpoint | attacker | internet → API | forged webhook | verify secret+signature; fail closed | low |
| TH-03 | charge data | attacker | provider → us | tampered status | trust only verified webhooks | low |
| TH-04 | customer PII | attacker | us → logs | PII logged | classify PII; no PII in logs | low |
| TH-05 | webhook replay | attacker | internet → API | duplicate processing | idempotency by event id | low |
| TH-06 | amount | bug | internal | float/cents error | integer centavos invariant (INV-4) | low |

### 11. Authentication surface table

| Operation | Authn method | Credential | Held by | Failure result |
|---|---|---|---|---|
| createCharge/get/list (outbound) | bearer api key | ABACATEPAY_API_KEY | Render (API server) | 401 → AUTH_FAILED |
| handleWebhook (inbound verify) | webhook secret/signature | ABACATEPAY_WEBHOOK_SECRET | Render (API server) | WEBHOOK_UNVERIFIED |

### 12. Authorization surface table

| Operation | Required identity | Required permission | Decision | Deny result |
|---|---|---|---|---|
| handleWebhook | Abacatepay (verified) | emit valid event | allow if verified | reject, no state change |

Platform-user authz of who may call createCharge is the **caller's**
responsibility (`@workspace/api-server`), not the billing package (BILL-ARCH
§5.2).

### 13. Secrets contract table

| Secret ID | Purpose | Held by (host) | Rotation | Leak handling | Env var |
|---|---|---|---|---|---|
| SK-01 | Abacatepay API key | Render | manual, on incident or schedule | revoke in dashboard + rotate + audit | `ABACATEPAY_API_KEY` |
| SK-02 | Abacatepay webhook secret | Render | manual, on incident | revoke + rotate + audit + re-register webhook | `ABACATEPAY_WEBHOOK_SECRET` |

No secret value in code or VCS (EDS-001 §9, SEC-R2). Only env var names here.

### 14. Input validation table

| Input | Source | Validation | On invalid | Injection class defended |
|---|---|---|---|---|
| createCharge input | caller (platform) | products non-empty, price≥100 int, urls are URLs | VALIDATION error | parameter tampering |
| webhook body | internet (Abacatepay) | verify secret+signature FIRST, then parse | WEBHOOK_UNVERIFIED / MALFORMED_EVENT | webhook forgery, injection |
| customer fields | caller | name/cellphone/email/taxId non-empty strings | VALIDATION | — |

### 15. Webhook verification table

| Inbound webhook | Verification method | On mismatch | Idempotency key |
|---|---|---|---|
| Abacatepay webhook | (1) compare `webhookSecret` query to `ABACATEPAY_WEBHOOK_SECRET`; (2) if `X-Webhook-Signature` present, verify HMAC-SHA256 over raw body | reject (WEBHOOK_UNVERIFIED), no state change | event `id` |

Verification MUST happen before any parsing or state change (fail closed,
SEC-R12). Idempotency by event id (SEC-R8).

### 16. Data classification table

| Data element | Classification | At rest | In transit | Retention |
|---|---|---|---|---|
| API key | restricted | env (not stored by package) | TLS to provider | rotated |
| webhook secret | restricted | env | TLS (query/header) | rotated |
| charge id | internal | caller persists | TLS | per caller policy |
| charge amount | internal | caller persists | TLS | per caller policy |
| customer name/email/taxId/cellphone | confidential | caller persists | TLS | per caller policy; minimize |
| payment url | internal | caller persists | TLS | per caller policy |

No confidential/restricted data logged (SEC-R11).

## 6. Dependencies

Upstream: BILL-ARCH, SEC-001, ESS-001.
Cross: BILL-RT (enforcement points cite SEC-RNN), BILL-API (auth-touching
symbols cite SEC), BILL-SM (guard G-02), BILL-DEPLOY (env mapping aligns).

## 7. Domain rules

Per SEC-001 R1–R12: threat model present (§10); secrets env-only (§13);
rotation stated; authn/authz explicit (§11/§12); input validation at boundary
(§14); webhook verified (§15); webhooks idempotent (§15); data classified
(§16); leak handling stated (§13); no secrets in logs (INV-2, R11); fail
closed (R12).

## 8. Validation

### Structural (SEC-S): all 7 tables present (§10..§16) ✓
### Content (SEC-C): all 11 content checks satisfied ✓
### Consistency (SEC-X)

| ID | Check | Pass/Fail |
|---|---|---|
| BA-SEC-X01 | Secrets align with BILL-DEPLOY env mapping | ☐ |
| BA-SEC-X02 | Auth-touching API symbols cite SEC requirements | ☐ |
| BA-SEC-X03 | Runtime enforcement points cite SEC requirements | ☐ |
| BA-SEC-X04 | SM guard G-02 consistent with §15 | ☐ |

## 9. Quality gates

| Gate | Requirement | Enforced by |
|---|---|---|
| BASECG-01..08 | (inherited from SEC-001) | Security reviewer + CTO |

## 10. Change history

| Version | Date | Author | Change |
|---|---|---|---|
| 1.0 | (commit date) | CTO | Initial security spec; secrets contract, webhook verification (secret + HMAC), threat model, data classification. |
