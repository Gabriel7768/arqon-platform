# AUTH-TEST-1.0.0 — Auth Testing Specification

| Field | Value |
|---|---|
| **Document ID** | AUTH-TEST-1.0.0 |
| **Title** | Auth Testing Specification |
| **Version** | 1.0 |
| **Status** | Frozen |
| **Governing standard** | (TEST-001 — pending; authored against RT-001 postconditions) |
| **Derives from** | ESS-001, RT-001, TS-001 |
| **Architecture** | AUTH-ARCH-1.0.0 |
| **Owners** | CTO · Founder |
| **Planning doc** | SPD-003 |

---

## 1. Metadata header
See table above.

## 2. Purpose

Defines the **test contracts** verifying `@workspace/auth` meets its RT
postconditions and error paths. Provides the TEST-owner co-sign for RTG-11
(AUTH-RT) and ASMG-07 (AUTH-SM).

## 3. Scope

### 3.1 In scope
- Test contracts per public symbol
- Coverage of AUTH-RT postconditions
- Coverage of AUTH-RT error paths
- Coverage of AUTH-SM transitions/invariants
- SEC coverage
- Mock/no-mock boundary

### 3.2 Out of scope (owning document)
- Behavior definition → AUTH-RT / AUTH-API / AUTH-SM
- Security policy → AUTH-SEC

## 4. Definitions

| Term | Definition |
|---|---|
| Round-trip | signToken → verifyToken with same secret returns original payload |

## 5. Contract

### 5.1 Test contracts per symbol

| Symbol | Contract under test | Type |
|---|---|---|
| `hashPassword` | Returns a bcrypt hash distinct from input | unit |
| `hashPassword` | Same password → different hashes (salt) but both verify | unit |
| `comparePassword` | Correct password → true | unit |
| `comparePassword` | Wrong password → false | unit |
| `comparePassword` | Malformed hash → HASH_INVALID or false | unit |
| `signToken` | Returns a string with 3 dot-separated parts | unit |
| `signToken` | Missing secret → throws SECRET_MISSING | unit |
| `verifyToken` | Round-trip: sign then verify → original payload | unit |
| `verifyToken` | Token signed with different secret → TOKEN_INVALID | unit |
| `verifyToken` | Malformed token → TOKEN_INVALID | unit |
| `verifyToken` | Expired token → TOKEN_EXPIRED | unit |
| `verifyToken` | Missing secret → throws SECRET_MISSING | unit |
| `loadSecret` | Env set → returns value | unit |
| `loadSecret` | Env unset → throws SECRET_MISSING (fail-closed, no fallback) | unit |

### 5.2 RT postcondition coverage (RTG-11 co-sign)

| RT postcondition | Testable as | Covered by |
|---|---|---|
| hashPassword returns bcrypt hash | assert hash starts with "$2" | hashPassword unit |
| comparePassword true only on match | true/false cases | comparePassword unit |
| signToken verifiable by verifyToken | round-trip | round-trip unit |
| verifyToken fails closed (throws, no partial) | invalid/expired/different-secret | verifyToken error units |
| loadSecret fail-closed (no fallback) | unset env → throws | loadSecret unit |

### 5.3 SM transition/invariant coverage (ASMG-07 co-sign)

| Transition/Invariant | Testable as | Covered by |
|---|---|---|
| T-01 UNAUTH→AUTH | credentials valid | comparePassword + signToken |
| T-02 verify succeeds | round-trip | verifyToken unit |
| T-03 expired | expired token | verifyToken expired unit |
| T-04 verify fails | invalid token | verifyToken error units |
| INV-S1 AUTH only if verify succeeded | assert throws on invalid | error units |
| INV-S2 EXPIRED terminal | transition-table check | structural |

### 5.4 SEC coverage

| SEC requirement | Testable as | Covered by |
|---|---|---|
| SEC-R2 no secret in code | grep test | lint |
| INV-1 no insecure fallback | unset env → throws | loadSecret unit |
| INV-2 no secret/password/hash logged | log capture | unit |
| SEC-R12 fail closed | all auth errors throw | error units |

### 5.5 Mock/no-mock boundary

- No mocks needed: bcrypt and JWT are real libraries, deterministic, no network.
- Tests use a fixed test secret (e.g. "test-secret") — never a real SESSION_SECRET.
- Token expiry tested by signing with `expiresIn: "0s"` or `-1s` past.

## 6. Dependencies

Upstream: AUTH-ARCH, AUTH-RT, AUTH-SM, AUTH-SEC, ESS-001.

## 7. Invariants

| ID | Invariant | Testable as |
|---|---|---|
| INV-T1 | Every RT postcondition has ≥1 test | coverage mapping |
| INV-T2 | Every SM transition has ≥1 test | coverage mapping |
| INV-T3 | No test uses a real SESSION_SECRET value | inspection |

## 8. Non-compliance & remediation

- RT postcondition with no test → block freeze (RTG-11 fails).
- Test using real secret → defect.

## 9. Validation

| ID | Check | Pass/Fail |
|---|---|---|
| AT-01 | Every public symbol has ≥1 test contract | ☐ |
| AT-02 | Every RT postcondition covered (RTG-11) | ☐ |
| AT-03 | Every SM transition covered (ASMG-07) | ☐ |
| AT-04 | SEC requirements covered | ☐ |
| AT-05 | Mock/no-mock boundary declared | ☐ |
| AT-06 | No real secret in tests | ☐ |

## 10. Quality gates

| Gate | Requirement | Enforced by |
|---|---|---|
| ATG-01 | RT postcondition coverage | TEST owner |
| ATG-02 | SM transition coverage | TEST owner |
| ATG-03 | SEC coverage | Security reviewer |
| ATG-04 | In-git freeze | CTO |

## 11. Change history

| Version | Date | Author | Change |
|---|---|---|---|
| 1.0 | (commit date) | CTO | Initial testing spec; provides RTG-11 + ASMG-07 co-signs; no-mock (deterministic libs). |
