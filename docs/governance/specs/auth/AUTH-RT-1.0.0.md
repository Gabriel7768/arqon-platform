# AUTH-RT-1.0.0 — Auth Runtime Specification

| Field | Value |
|---|---|
| **Document ID** | AUTH-RT-1.0.0 |
| **Title** | Auth Runtime Specification |
| **Version** | 1.0 |
| **Status** | Frozen |
| **Governing standard** | RT-001 |
| **Derives from** | ESS-001, RT-001, API-001, TS-001 |
| **Architecture** | AUTH-ARCH-1.0.0 |
| **Owners** | CTO · Founder |
| **Planning doc** | SPD-003 |

---

## 1. Metadata header
See table above.

## 2. Purpose

Defines the **runtime behavior** of `@workspace/auth`: how passwords are
hashed/compared, how tokens are signed/verified, secret loading, error
propagation. Does NOT define signatures (AUTH-API), states (AUTH-SM), or
security policy (AUTH-SEC).

## 3. Scope

### 3.1 In scope
- hashPassword / comparePassword execution flows
- signToken / verifyToken execution flows
- loadSecret (fail-closed) flow
- Error propagation
- Lifecycle of AuthClient
- Concurrency model
- Caching (none; declared)

### 3.2 Out of scope (owning document)
- Public signatures → AUTH-API-1.0.0 (API-001)
- States → AUTH-SM-1.0.0 (SM-001)
- Secret/hashing policy → AUTH-SEC-1.0.0 (SEC-001)

## 4. Definitions

Inherits RT-001 §4.

## 5. Method Behaviors

### 5.1 hashPassword

**Success flow:**
1. Trigger: caller invokes `hashPassword(password)`.
2. Preconditions: password is a non-empty string.
3. Run bcrypt with configured rounds (default 10).
4. Return the hash string.
5. Postconditions: a bcrypt hash is returned; it includes salt + cost.
6. References: AUTH-API `hashPassword`; SEC hashing policy.

**Error flow:**
1. Trigger: bcrypt internal failure.
2. Throw `AuthError(HASH_FAILED)`; no hash produced.

### 5.2 comparePassword

**Success flow:**
1. Trigger: caller invokes `comparePassword(password, hash)`.
2. Preconditions: password and hash are non-empty strings.
3. Run bcrypt compare (constant-time).
4. Return boolean.
5. Postconditions: returns true only if password matches hash.

**Error flow (malformed hash):**
1. Trigger: hash is not a valid bcrypt hash.
2. Throw `AuthError(HASH_INVALID)` OR return false (bcrypt behavior); declared.

### 5.3 signToken

**Success flow:**
1. Trigger: caller invokes `signToken(payload)`.
2. Preconditions: secret loaded (via loadSecret or AuthClient config); payload
   has `userId` + `email`.
3. Sign JWT with secret + expiry (default 7d).
4. Return token string.
5. Postconditions: token is verifiable by `verifyToken` with same secret.
6. References: AUTH-API `signToken`; SM T-01 (caller issues token).

**Error flow (secret missing):**
1. Trigger: secret not loaded.
2. Throw `AuthError(SECRET_MISSING)`; no token. Fail closed.

### 5.4 verifyToken

**Success flow:**
1. Trigger: caller invokes `verifyToken(token)`.
2. Preconditions: secret loaded.
3. Verify signature + check expiry.
4. On success: return decoded `AuthPayload`.
5. Postconditions: a valid payload is returned; SM T-02.
6. References: AUTH-API `verifyToken`; SM T-02/T-03/T-04.

**Error flow (invalid):**
1. Trigger: bad signature or malformed token.
2. Throw `AuthError(TOKEN_INVALID)`; no payload. SM T-04. Fail closed.

**Error flow (expired):**
1. Trigger: token past expiry.
2. Throw `AuthError(TOKEN_EXPIRED)`; no payload. SM T-03. Fail closed.

### 5.5 loadSecret

**Success flow:**
1. Trigger: caller invokes `loadSecret()`.
2. Read `process.env.SESSION_SECRET`.
3. If present + non-empty: return it.
4. Postconditions: a non-empty secret is returned.

**Error flow (missing):**
1. Trigger: `SESSION_SECRET` unset or empty.
2. Throw `AuthError(SECRET_MISSING)`. **Fail closed — no insecure fallback.**
   This fixes the api-server gap (`?? "arqon-dev-secret"`).

## 6. Concurrency Model

| Element | Requirement |
|---|---|
| Shared state | None (AuthClient holds config, immutable after construction) |
| Isolation | Per-call; no global mutable state |
| Synchronization | None needed |
| Locking | None |
| Memory visibility | N/A (no shared mutable state) |

## 7. Caching Behavior

None. `loadSecret` reads env each call (cheap; ensures freshness if rotated).
No token cache — every `verifyToken` verifies against the secret.

## 8. Lifecycle Phases

| Phase | Entry | Exit | State | Side effects |
|---|---|---|---|---|
| construction | `new AuthClient(config)` | config validated (secret present) | configured | none |
| steady state | first call | client discarded | active | CPU (bcrypt/JWT) |
| shutdown | client discarded (GC) | — | disposed | none |

No background tasks.

## 9. Error Propagation Policy

| Error class | Propagated to | Recoverable | State-after-error |
|---|---|---|---|
| SECRET_MISSING | caller | no (fix env) | throws; no state |
| TOKEN_INVALID | caller | no | throws; no payload |
| TOKEN_EXPIRED | caller | no (re-auth) | throws; no payload |
| HASH_FAILED | caller | yes (retry) | no hash |
| HASH_INVALID | caller | no | throws or false |

All auth failures **fail closed** (throw, never return partial/authenticated state).

## 10. Background Tasks

None. Stateless library; no polling, no token refresh job.

## 11. Resource Ownership

| Resource | Owner | Transfer | Release |
|---|---|---|---|
| hash/token strings | package call | package→caller | caller GC |
| AuthPayload | package | package→caller | caller GC |

## 12. Retry Policy

| Operation | Max attempts | Retryable errors |
|---|---|---|
| hashPassword | 1 (bcrypt is deterministic) | none in first slice |
| comparePassword | 1 | none |
| signToken | 1 | none |
| verifyToken | 1 | none |
| loadSecret | 1 | none |

No retry in first slice (operations are deterministic or fail-closed).

## 13. Cancellation Contract

| Operation | Cancel effect | State-after |
|---|---|---|
| hashPassword | bcrypt aborted | no hash |
| others | synchronous, no cancel window | none |

## 14. Fallback Chain

None. Single secret; no fallback. Fail-closed is the design.

## 15. Domain rules (RT-001)

| Rule | Status |
|---|---|
| RT-R1 flow completeness | each method has success + error ✓ |
| RT-R2 error exhaustiveness | consistent with AUTH-API ✓ |
| RT-R3 concurrency statements | stateless; declared ✓ |
| RT-R4 state transition citation | signToken→T-01; verifyToken→T-02/T-03/T-04 ✓ |
| RT-R5 background tasks | N/A (none) ✓ |
| RT-R6 resource ownership | explicit ✓ |
| RT-R7 in-flight dedup | N/A (deterministic ops) |
| RT-R8 partial failure | N/A (single op) |
| RT-R9 memory visibility | N/A |
| RT-R10 lock order | N/A |

## 16. Validation

### Consistency (RT-X)

| ID | Check | Pass/Fail |
|---|---|---|
| AA-RT-X01 | Error table consistent with AUTH-API | ☐ |
| AA-RT-X02 | State-changing methods cite SM transitions | ☐ |
| AA-RT-X03 | Background tasks 4-phase (N/A) | ☐ |
| AA-RT-X04 | Resource ownership explicit | ☐ |
| AA-RT-X05 | Concurrency statements (stateless) | ☐ |
| AA-RT-X06 | Retry consistent with recoverability | ☐ |

## 17. Quality gates

| Gate | Requirement | Enforced by |
|---|---|---|
| AARTG-11 | TEST owner co-sign: postconditions + error paths testable | TEST owner |

## 18. Change history

| Version | Date | Author | Change |
|---|---|---|---|
| 1.0 | (commit date) | CTO | Initial runtime spec; fail-closed secret loading; stateless. |
