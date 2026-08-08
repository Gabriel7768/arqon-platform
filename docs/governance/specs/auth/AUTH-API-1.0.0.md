# AUTH-API-1.0.0 — Auth Public API Specification

| Field | Value |
|---|---|
| **Document ID** | AUTH-API-1.0.0 |
| **Title** | Auth Public API Specification |
| **Version** | 1.0 |
| **Status** | Frozen |
| **Governing standard** | API-001 |
| **Derives from** | ESS-001, API-001, TS-001 |
| **Package** | `@workspace/auth` |
| **Architecture** | AUTH-ARCH-1.0.0 |
| **Owners** | CTO · Founder |
| **Planning doc** | SPD-003 |

---

## 1. Metadata header
See table above.

## 2. Purpose

Defines the **public interface** of `@workspace/auth`: password hashing, JWT
sign/verify, secret loading. Does NOT define runtime flows (AUTH-RT), states
(AUTH-SM), or security policy (AUTH-SEC).

## 3. Scope

### 3.1 In scope
- Public function signatures
- Parameter and return semantics
- Error contracts
- Type definitions
- Stability marking

### 3.2 Out of scope (owning document)
- Runtime flows → AUTH-RT-1.0.0 (RT-001)
- Session states → AUTH-SM-1.0.0 (SM-001)
- Secret/hashing policy → AUTH-SEC-1.0.0 (SEC-001)
- HTTP routes → api-server
- DB schema → `@workspace/db`

## 4. Definitions

| Term | Definition |
|---|---|
| AuthPayload | `{ userId: number; email: string }` carried in the JWT |
| PasswordHash | bcrypt hash string (includes salt + cost) |

## 5. Contract

### 5.1 Symbol inventory

| Symbol | Kind | Stability | Since |
|---|---|---|---|
| `AuthClient` | class | Stable | 1.0.0 |
| `hashPassword` | function | Stable | 1.0.0 |
| `comparePassword` | function | Stable | 1.0.0 |
| `signToken` | function | Stable | 1.0.0 |
| `verifyToken` | function | Stable | 1.0.0 |
| `loadSecret` | function | Stable | 1.0.0 |
| `AuthPayload` | type | Stable | 1.0.0 |
| `AuthClientConfig` | type | Stable | 1.0.0 |
| `AuthError` | error | Stable | 1.0.0 |

### 5.2 Signature table

| Symbol | Signature |
|---|---|
| `AuthClient` | `new AuthClient(config: AuthClientConfig)` |
| `hashPassword` | `(password: string) => Promise<string>` |
| `comparePassword` | `(password: string, hash: string) => Promise<boolean>` |
| `signToken` | `(payload: AuthPayload) => string` |
| `verifyToken` | `(token: string) => AuthPayload` |
| `loadSecret` | `() => string` |

`AuthClientConfig`:
| Field | Type | Nullable | Meaning | Default |
|---|---|---|---|---|
| `secret` | string | no | JWT signing secret (from env) | — |
| `expiresIn` | string | yes | JWT expiry (e.g. "7d") | "7d" |
| `bcryptRounds` | number | yes | bcrypt cost factor | 10 |

### 5.3 Parameter table

| Symbol | Parameter | Type | Nullable | Meaning |
|---|---|---|---|---|
| `hashPassword` | password | string | no | Plaintext password |
| `comparePassword` | password | string | no | Plaintext password |
| `comparePassword` | hash | string | no | bcrypt hash |
| `signToken` | payload | AuthPayload | no | `{ userId, email }` |
| `verifyToken` | token | string | no | JWT string |

### 5.4 Return table

| Symbol | Return type | Nullable | Meaning | Ownership |
|---|---|---|---|---|
| `hashPassword` | `Promise<string>` | no | bcrypt hash | callee (new string) |
| `comparePassword` | `Promise<boolean>` | no | match result | callee |
| `signToken` | `string` | no | signed JWT | callee (new string) |
| `verifyToken` | `AuthPayload` | no | decoded payload | callee |
| `loadSecret` | `string` | no | the secret | reads env |

### 5.5 Error table

| Symbol | Error | Code/Type | Meaning | Recoverable | State-after-error |
|---|---|---|---|---|---|
| `loadSecret` | `AuthError` | `SECRET_MISSING` | SESSION_SECRET env not set | no (fix env) | throws; no state |
| `signToken` | `AuthError` | `SECRET_MISSING` | secret not loaded | no (fix env) | throws; no token |
| `verifyToken` | `AuthError` | `TOKEN_INVALID` | bad signature or malformed | no | throws; no payload |
| `verifyToken` | `AuthError` | `TOKEN_EXPIRED` | token past expiry | no (re-auth) | throws; no payload |
| `hashPassword` | `AuthError` | `HASH_FAILED` | bcrypt internal failure | yes (retry) | no hash produced |
| `comparePassword` | `AuthError` | `HASH_INVALID` | hash malformed | no | returns false or throws |

> `verifyToken` fails closed: any verification failure throws (never returns
> a partial payload). The caller maps to 401.

### 5.6 Lifecycle & ownership table

| Symbol | Created by | Destroyed by | Ownership | Side effects |
|---|---|---|---|---|
| hash string | `hashPassword` | caller (GC) | callee-returned | CPU (bcrypt) |
| token string | `signToken` | caller (GC) | callee-returned | none |
| AuthPayload | `verifyToken` | caller (GC) | callee-returned | none |

## 6. Dependencies

Upstream: AUTH-ARCH-1.0.0, API-001, ESS-001.
Cross: AUTH-RT (flows), AUTH-SM (session states), AUTH-SEC (secret/hashing).

## 7. Invariants

| ID | Invariant | Testable as |
|---|---|---|
| INV-A1 | `verifyToken` never returns on invalid input (throws) | invalid-token test |
| INV-A2 | `signToken` output is verifiable by `verifyToken` with same secret | round-trip test |
| INV-A3 | No symbol logs secret/password/hash | inspection |

## 8. Non-compliance & remediation

- Undocumented error → defect; add to error table (API-R8).
- Insecure fallback in `loadSecret` → defect; enforce fail-closed.

## 9. Validation

### Content (API-C)

| ID | Check | Pass/Fail |
|---|---|---|
| AA-PI-C01 | Every public symbol in inventory | ☐ |
| AA-PI-C02 | Every symbol has signature row | ☐ |
| AA-PI-C03 | Every parameter has semantics | ☐ |
| AA-PI-C04 | Every return has semantics | ☐ |
| AA-PI-C05 | Every error listed + recoverable/state-after | ☐ |
| AA-PI-C06 | Every symbol marked Stable | ☐ |
| AA-PI-C07 | Ownership declared | ☐ |

### Consistency (API-X)

| ID | Check | Pass/Fail |
|---|---|---|
| AA-PI-X01 | Error table consistent with AUTH-RT error paths | ☐ |
| AA-PI-X02 | State-changing symbols cite AUTH-SM transitions | ☐ |
| AA-PI-X03 | Auth-touching symbols cite AUTH-SEC requirements | ☐ |

## 10. Quality gates

| Gate | Requirement | Enforced by |
|---|---|---|
| AAPG-01 | Signature completeness | API reviewer |
| AAPG-02 | Error exhaustiveness + RT co-sign | API reviewer + RT owner |
| AAPG-03 | SM consistency + SM co-sign | API reviewer + SM owner |
| AAPG-04 | SEC consistency + SEC co-sign | API reviewer + SEC owner |
| AAPG-05 | In-git freeze | CTO |

## 11. Change history

| Version | Date | Author | Change |
|---|---|---|---|
| 1.0 | (commit date) | CTO | Initial public API; hashPassword, comparePassword, signToken, verifyToken, loadSecret, AuthClient. |
