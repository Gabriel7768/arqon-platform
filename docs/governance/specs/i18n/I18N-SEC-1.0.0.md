# I18N-SEC-1.0.0 — i18n Security Specification

| Field | Value |
|---|---|
| **Document ID** | I18N-SEC-1.0.0 |
| **Title** | i18n Security Specification |
| **Version** | 1.0 |
| **Status** | Frozen |
| **Governing standard** | SEC-001 |
| **Derives from** | ESS-001, SEC-001, TS-001 |
| **Architecture** | I18N-ARCH-1.0.0 |
| **Owners** | CTO · Founder |
| **Planning doc** | SPD-001 |

---

## 1. Metadata header
See table above.

## 2. Purpose

Defines the **security controls** for `@workspace/i18n`: interpolation
injection defense, dictionary trust boundary, tenant isolation (first-slice
boundary declared), input validation, threat model, data classification.

## 3. Scope

### 3.1 In scope
- Interpolation injection defense (translation strings + param values)
- Dictionary trust boundary (author-controlled vs. user-supplied)
- Tenant dictionary isolation (declared; first-slice = shared dictionaries)
- Input validation (keys, params, locales)
- Threat model
- Data classification

### 3.2 Out of scope (owning document)
- Signatures → I18N-API-1.0.0
- Runtime flows → I18N-RT-1.0.0
- States → I18N-SM-1.0.0
- Host env config → I18N-DEPLOY-1.0.0 (deferred)
- Per-tenant dictionary override mechanism → future slice (declared)

## 4. Definitions

Inherits SEC-001 §4. Additional:
| Term | Definition |
|---|---|
| Author-controlled | Translation strings from the loader (trusted: authored by the platform team) |
| User-supplied | Interpolation param values (untrusted: from runtime data) |

## 5. Contract

### 10. Threat model table

| Threat ID | Asset | Actor | Trust boundary | Threat | Mitigation | Residual risk |
|---|---|---|---|---|---|---|
| TH-01 | translated string | attacker | params → output | XSS via interpolation param | params stringified only; no HTML/JS eval (INV-3) | low |
| TH-02 | translated string | attacker | dictionary → output | malicious translation string | dictionaries are author-controlled (loader); not user-supplied | low (trusted source) |
| TH-03 | translation key | attacker | caller → t() | key injection / prototype pollution | keys looked up via Map/Object access; no eval; missing key returns key | low |
| TH-04 | locale code | attacker | caller → loadLocale | path traversal via locale (e.g. "../etc") | locale is a lookup key, not a file path; loader is caller-controlled | low (loader responsibility) |
| TH-05 | cache | attacker | — | cache poisoning | cache is in-memory, populated only by loader result; not externally writable | low |
| TH-06 | tenant A dictionary | tenant B | shared dictionary | cross-tenant leak via translations | first slice: shared dictionaries (no tenant data in translations) | low (no tenant-specific content) |

### 11. Authentication surface table

N/A — i18n package performs no authentication. It is a pure formatting/lookup
library with no identity concepts.

### 12. Authorization surface table

N/A — no authz. First slice has no per-tenant dictionary access control
(shared dictionaries only). Future tenant-specific dictionaries will require
authz (declared as future scope).

### 13. Secrets contract table

N/A — i18n package holds no secrets. No API keys, no credentials.

### 14. Input validation table

| Input | Source | Validation | On invalid | Injection class defended |
|---|---|---|---|---|
| key | caller (t) | string; looked up in dictionary | return key string (fail-safe) | key injection, prototype pollution |
| params | caller (t) | stringifiable values | String(value) interpolation | XSS via params |
| locale | caller (setLocale/loadLocale) | string; checked against config.locales | LOAD_FAILED or ignored | path traversal (locale is a key, not a path) |
| dictionary | loader result | non-null object | LOAD_FAILED if not object | malformed dictionary |
| value (format*) | caller | number/Date/string | fall back to String(value) | — |

### 15. Webhook verification table

N/A — i18n package handles no webhooks.

### 16. Data classification table

| Data element | Classification | At rest | In transit | Retention |
|---|---|---|---|---|
| translation strings | internal (author-controlled) | in-memory cache | n/a (in-process) | instance lifetime |
| interpolation params | caller-classified | n/a (transient) | n/a | transient (stringified + returned) |
| locale code | public | in-memory | n/a | instance lifetime |
| dictionary cache | internal | in-memory | n/a | instance lifetime |

No confidential/restricted data in i18n. No PII stored — interpolation params
are stringified into the output string and not persisted.

### 17. Tenant isolation boundary (first slice)

First slice: **shared dictionaries** — all tenants use the same translation
dictionaries. No tenant-specific content exists in dictionaries. Therefore
cross-tenant leakage via translations is not possible (TH-06 residual: low).

Future slice (declared, not implemented): per-tenant dictionary overrides.
When implemented, that slice MUST add:
- Authz on dictionary access (tenant-scoped lookup).
- Isolation test (tenant A cannot read tenant B's overrides.
- A new threat-model row for override injection.

## 6. Dependencies

Upstream: I18N-ARCH, SEC-001, ESS-001.
Cross: I18N-RT (enforcement cites SEC-RNN), I18N-API (symbols cite SEC).

## 7. Domain rules

Per SEC-001 R1–R12: threat model present (§10); input validation (§14); data
classified (§16); no secrets (§13 N/A declared); no webhooks (§15 N/A);
fail-safe on invalid input (§14 — t() returns key, format* returns
String(value)); interpolation injection defended (INV-3, TH-01).

## 8. Validation

### Structural (SEC-S): tables present (§10,14,16) ✓; (§11,12,13,15 N/A declared) ✓
### Content (SEC-C): applicable checks satisfied ✓
### Consistency (SEC-X)

| ID | Check | Pass/Fail |
|---|---|---|
| IA-SEC-X01 | Interpolation defense enforced in I18N-RT t() flow | ☐ |
| IA-SEC-X02 | t()/format* cite SEC fail-safe requirements | ☐ |
| IA-SEC-X03 | Tenant isolation boundary declared (first slice = shared) | ☐ |

## 9. Quality gates

| Gate | Requirement | Enforced by |
|---|---|---|
| IASECG-01..08 | (inherited from SEC-001) | Security reviewer + CTO |

## 10. Change history

| Version | Date | Author | Change |
|---|---|---|---|
| 1.0 | (commit date) | CTO | Initial security spec; interpolation injection defense, fail-safe, shared-dictionary tenant boundary declared. |
