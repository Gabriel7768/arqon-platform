# AUTH-SEC-1.0.0 — Auth Security Specification

| Field | Value |
|---|---|
| **Document ID** | AUTH-SEC-1.0.0 |
| **Title** | Auth Security Specification |
| **Version** | 1.0 |
| **Status** | Frozen |
| **Governing standard** | SEC-001 |
| **Derives from** | ESS-001, SEC-001, TS-001 |
| **Architecture** | AUTH-ARCH-1.0.0 |
| **Owners** | CTO · Founder |
| **Planning doc** | SPD-003 |

---

## 1. Metadata header
See table above.

## 2. Purpose

Defines the **security controls** for `@workspace/auth`: secret management,
password hashing policy, token security, threat model.

## 3. Scope

### 3.1 In scope
- Secrets management (SESSION_SECRET)
- Password hashing policy (bcrypt rounds)
- Token security (signing, expiry, verification)
- Input validation
- Threat model
- Data classification

### 3.2 Out of scope (owning document)
- Signatures → AUTH-API-1.0.0
- Runtime flows → AUTH-RT-1.0.0
- States → AUTH-SM-1.0.0
- Host env config → AUTH-DEPLOY-1.0.0

## 4. Definitions

Inherits SEC-001 §4.

## 5. Contract

### 10. Threat model table

| Threat ID | Asset | Actor | Trust boundary | Threat | Mitigation | Residual risk |
|---|---|---|---|---|---|---|
| TH-01 | SESSION_SECRET | attacker | env → code | secret hardcoded or fallback | env-only; fail-closed loadSecret (INV-1) | low |
| TH-02 | password | attacker | client → us | plaintext password logged | never log password (INV-2) | low |
| TH-03 | passwordHash | attacker | DB → logs | hash logged | never log hash (INV-2) | low |
| TH-04 | token | attacker | client → us | forged token | verify signature + expiry; fail closed | low |
| TH-05 | token | attacker | stolen token | replay after expiry | exp claim enforced (T-03) | low |
| TH-06 | password | attacker | DB leak | offline brute force | bcrypt 10 rounds (cost factor) | medium (acceptable) |
| TH-07 | secret | operator | prod deploy | weak/missing secret | fail-closed; reject deploy without secret | low |

### 11. Authentication surface table

| Operation | Authn method | Credential | Held by | Failure result |
|---|---|---|---|---|
| signToken | symmetric secret | SESSION_SECRET | Render (env) | SECRET_MISSING |
| verifyToken | symmetric secret | SESSION_SECRET | Render (env) | TOKEN_INVALID/TOKEN_EXPIRED |
| comparePassword | bcrypt hash | passwordHash (DB) | Supabase | false / HASH_INVALID |

### 12. Authorization surface table

AuthN only in this package (identity establishment). Authorization (RBAC,
org access) is the caller's responsibility (api-server `org-guard`).

| Operation | Required identity | Required permission | Decision | Deny result |
|---|---|---|---|---|
| verifyToken | valid token | none (authn only) | allow if valid | throw (caller → 401) |

### 13. Secrets contract table

| Secret ID | Purpose | Held by (host) | Rotation | Leak handling | Env var |
|---|---|---|---|---|---|
| SK-01 | JWT signing/verification | Render | rotate; re-deploy; existing tokens invalidated | revoke + rotate + audit | `SESSION_SECRET` |

No secret value in code or VCS (EDS-001 §9, SEC-R2). `loadSecret` fails
closed if missing — **no insecure fallback** (fixes api-server gap).

### 14. Input validation table

| Input | Source | Validation | On invalid | Injection class defended |
|---|---|---|---|---|
| password | caller | non-empty string | throw | — |
| hash | caller (from DB) | valid bcrypt hash format | HASH_INVALID | — |
| token | caller (from HTTP) | valid JWT structure | TOKEN_INVALID | token forgery |
| payload | caller | has userId + email | throw | — |

### 15. Webhook verification table

N/A — auth package handles no webhooks.

### 16. Data classification table

| Data element | Classification | At rest | In transit | Retention |
|---|---|---|---|---|
| SESSION_SECRET | restricted | env (not stored by package) | n/a (server-side) | rotated |
| password (plaintext) | restricted | never persisted | TLS (client→server) | transient only |
| passwordHash | confidential | Supabase (usersTable) | TLS | per DB policy |
| token | internal | client localStorage | TLS (Bearer header) | 7d (exp claim) |
| AuthPayload | internal | n/a (decoded transient) | TLS | transient |

No confidential/restricted data logged (SEC-R11, INV-2).

## 6. Dependencies

Upstream: AUTH-ARCH, SEC-001, ESS-001.
Cross: AUTH-RT (enforcement cites SEC-RNN), AUTH-API (auth symbols cite SEC),
AUTH-DEPLOY (env mapping aligns).

## 7. Domain rules

Per SEC-001 R1–R12: threat model present (§10); secrets env-only (§13);
rotation stated; authn explicit (§11); input validation (§14); data
classified (§16); leak handling (§13); no secrets in logs (INV-2, R11); fail
closed (R12 — loadSecret + verifyToken).

## 8. Validation

### Structural (SEC-S): tables present (§10,11,12,13,14,16) ✓ (§15 N/A declared)
### Content (SEC-C): all 11 checks satisfied ✓
### Consistency (SEC-X)

| ID | Check | Pass/Fail |
|---|---|---|
| AA-SEC-X01 | Secrets align with AUTH-DEPLOY env mapping | ☐ |
| AA-SEC-X02 | Auth-touching API symbols cite SEC requirements | ☐ |
| AA-SEC-X03 | Runtime enforcement points cite SEC requirements | ☐ |

## 9. Quality gates

| Gate | Requirement | Enforced by |
|---|---|---|
| AASECG-01..08 | (inherited from SEC-001) | Security reviewer + CTO |

## 10. Change history

| Version | Date | Author | Change |
|---|---|---|---|
| 1.0 | (commit date) | CTO | Initial security spec; fail-closed secret, bcrypt policy, threat model. Closes api-server insecure-fallback gap. |
