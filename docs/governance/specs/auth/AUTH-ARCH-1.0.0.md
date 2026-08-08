# AUTH-ARCH-1.0.0 — Auth Architecture Specification

| Field | Value |
|---|---|
| **Document ID** | AUTH-ARCH-1.0.0 |
| **Title** | Auth Architecture Specification |
| **Version** | 1.0 |
| **Status** | Frozen |
| **Governing standard** | ESS-001 |
| **Derives from** | EDS-001, EES-001, ESS-001, TS-001 |
| **Authorizing ADR** | ADR-AUTH-001 (to be created on first major change) |
| **Package** | `@workspace/auth` (`packages/auth`) |
| **Owners** | CTO · Founder |
| **Planning doc** | SPD-003 |

---

## 1. Metadata header
See table above.

## 2. Purpose

Defines the **module boundaries** of `@workspace/auth`. It is a pure logic
library for password hashing and JWT sign/verify. It does NOT own HTTP routes
(stay in api-server), DB persistence (caller owns), or session storage.

## 3. Scope

### 3.1 In scope
- Package boundary and responsibilities
- Relationship to existing api-server auth
- Dependency graph
- Deployment surface

### 3.2 Out of scope (owning document)
- Public signatures → AUTH-API-1.0.0 (API-001)
- Execution flows → AUTH-RT-1.0.0 (RT-001)
- Session states → AUTH-SM-1.0.0 (SM-001)
- Secret/hashing policy → AUTH-SEC-1.0.0 (SEC-001)
- Test contracts → AUTH-TEST-1.0.0
- HTTP routes → api-server (not this package)
- DB schema → `@workspace/db` (`usersTable`)
- Host env config → AUTH-DEPLOY-1.0.0 (DEPLOY-001)

## 4. Definitions

| Term | Definition |
|---|---|
| AuthPayload | The JWT payload: `{ userId, email }` |
| Session | An authenticated identity established by a valid JWT |
| Secret | `SESSION_SECRET` env var used to sign/verify JWTs |

## 5. Contract

### 5.1 Module boundaries

`packages/auth` is a **platform library** (per EDS-001 §6). It:

- Owns password hashing (bcrypt) and JWT sign/verify logic.
- Exposes a typed interface (AUTH-API) to the platform.
- Does NOT own HTTP routing or middleware (api-server wires those).
- Does NOT own DB access (caller loads the user record and passes credentials).
- Does NOT own session storage (stateless JWT; no server-side session store).

### 5.2 Responsibility matrix

| Responsibility | Owner |
|---|---|
| Hash a password | `@workspace/auth` |
| Compare password vs hash | `@workspace/auth` |
| Sign a JWT | `@workspace/auth` |
| Verify a JWT | `@workspace/auth` |
| Load + validate SESSION_SECRET (fail-closed) | `@workspace/auth` |
| Load user record from DB | `@workspace/api-server` (caller) |
| Expose /auth/register, /login, /me routes | `@workspace/api-server` (caller) |
| Enforce route protection (middleware) | `@workspace/api-server` (caller) |
| Persist users / passwordHash | `@workspace/db` (caller) |

### 5.3 Relationship to existing api-server auth

The api-server currently implements auth inline in `lib/auth.ts`. This package
extracts that logic into a governed library. **Migration is a future task** —
the package is additive until the api-server adopts it. During coexistence:
- `packages/auth` is the canonical, spec-driven implementation.
- `artifacts/api-server/src/lib/auth.ts` is grandfathered until migration.

### 5.4 Dependency graph

```
@workspace/auth
   │  (uses)
   ├──> bcryptjs (password hashing)
   └──> jsonwebtoken (JWT)

@workspace/api-server ──will use──> @workspace/auth (future migration)
@workspace/db        <──persists── @workspace/api-server (usersTable.passwordHash)
```

Upstream: none platform-internal.
Downstream: `@workspace/api-server` (future consumer).

### 5.5 Deployment surface

| Host | Touches auth how | First slice? |
|---|---|---|
| Render (API server) | Will import `@workspace/auth`; provides `SESSION_SECRET` env | Future (migration) |
| Vercel (web) | None (auth is server-side) | No |
| Supabase | Stores `usersTable.passwordHash`; not directly auth | Indirect |

## 6. Dependencies

Upstream standards: ESS-001, TS-001, EDS-001, EES-001.
Authorizing ADR: ADR-AUTH-001 (pending).

## 7. Invariants

| ID | Invariant | Testable as |
|---|---|---|
| INV-1 | The package never uses an insecure secret fallback | Missing-env test |
| INV-2 | The package never logs the secret or a password/hash | Log inspection |
| INV-3 | `verifyToken` rejects tokens signed with a different secret | Cross-secret test |
| INV-4 | `comparePassword` is constant-time (bcrypt) | bcrypt guarantees; behavioral test |

## 8. Non-compliance & remediation

- Insecure secret fallback present → defect; replace with fail-closed throw.
- Package touches DB or HTTP → architecture violation; refactor to pure logic.
- Missing ADR on major change → block release (EES-001 §4).

## 9. Validation

| ID | Check | Pass/Fail |
|---|---|---|
| AA-01 | Module boundaries declared (§5.1) | ☐ |
| AA-02 | Responsibility matrix complete (§5.2) | ☐ |
| AA-03 | Relationship to api-server declared (§5.3) | ☐ |
| AA-04 | Dependency graph acyclic (§5.4) | ☐ |
| AA-05 | Deployment surface declared (§5.5) | ☐ |
| AA-06 | Invariants present and testable (§7) | ☐ |
| AA-07 | Out-of-scope topics cite owning doc (§3.2) | ☐ |
| AA-08 | Cites governing standard ESS-001 | ☐ |

## 10. Change history

| Version | Date | Author | Change |
|---|---|---|---|
| 1.0 | (commit date) | CTO | Initial architecture spec; pure logic library, additive to api-server. |
