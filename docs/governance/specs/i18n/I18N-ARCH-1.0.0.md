# I18N-ARCH-1.0.0 — i18n Architecture Specification

| Field | Value |
|---|---|
| **Document ID** | I18N-ARCH-1.0.0 |
| **Title** | i18n Architecture Specification |
| **Version** | 1.0 |
| **Status** | Frozen |
| **Governing standard** | ESS-001 |
| **Derives from** | EDS-001, EES-001, ESS-001, TS-001 |
| **Authorizing ADR** | ADR-I18N-001 (to be created on first major change) |
| **Package** | `@workspace/i18n` (`packages/i18n`) |
| **Owners** | CTO · Founder |
| **Planning doc** | SPD-001 |

---

## 1. Metadata header
See table above.

## 2. Purpose

Defines the **module boundaries** of `@workspace/i18n`. It is a reusable,
framework-agnostic internationalization platform library: locale loading,
translation with interpolation, formatting (number/currency/date), fallback,
and caching. A separate React adapter (`I18N-ADAPT-REACT`) provides bindings.

## 3. Scope

### 3.1 In scope
- Package boundary and responsibilities
- Core library vs. adapter topology
- Dependency graph
- Deployment surface
- Locale data ownership (loader-provided, not bundled in first slice)

### 3.2 Out of scope (owning document)
- Public signatures → I18N-API-1.0.0 (API-001)
- Execution flows → I18N-RT-1.0.0 (RT-001)
- Locale lifecycle states → I18N-SM-1.0.0 (SM-001)
- Security policy → I18N-SEC-1.0.0 (SEC-001)
- React bindings → I18N-ADAPT-REACT (ADAPT-001)
- Test contracts → I18N-TEST-1.0.0
- Email/PDF/Notification adapters → deferred (not first slice)
- Host bundling → I18N-DEPLOY-1.0.0 (deferred)

## 4. Definitions

| Term | Definition |
|---|---|
| Locale | An IETF language tag string (e.g. `en-US`, `pt-BR`) |
| Dictionary | A flat `Record<string, string>` mapping translation keys to translated strings |
| Loader | A caller-provided `(locale) => Promise<Dictionary>` function |
| Fallback chain | Lookup order when a key is missing: active locale → fallback locale → key string |
| Interpolation | Replacing `{param}` placeholders in a translated string with caller-supplied values |

## 5. Contract

### 5.1 Module boundaries

`packages/i18n` is a **platform library** (per EDS-001 §6). It:

- Owns translation lookup, interpolation, formatting, locale loading, caching.
- Exposes a typed core interface (I18N-API) plus a React adapter.
- Does NOT own HTTP routes, DB access, or business logic.
- Does NOT bundle locale dictionaries — the caller provides a loader.
- Does NOT own UI components (the React adapter provides hooks, not components).

### 5.2 Responsibility matrix

| Responsibility | Owner |
|---|---|
| Translate a key with interpolation | `@workspace/i18n` (core) |
| Format number/currency/date | `@workspace/i18n` (core, via Intl) |
| Load a locale dictionary | `@workspace/i18n` (core, via caller's loader) |
| Cache loaded dictionaries | `@workspace/i18n` (core) |
| Fallback when key/locale missing | `@workspace/i18n` (core) |
| Switch active locale at runtime | `@workspace/i18n` (core) |
| Provide locale dictionaries | caller (loader function) |
| Provide React context/hooks | `@workspace/i18n` (React adapter) |
| Render translated UI | caller (React app) |
| Persist user's locale preference | caller (localStorage/cookie — not this package) |

### 5.3 Adapter topology

```
@workspace/i18n (core)
   │
   ├──> I18N-ADAPT-REACT  (useI18n, I18nProvider)
   │     └──> @workspace/web (consumer)
   ├──> I18N-ADAPT-EMAIL   (deferred)
   ├──> I18N-ADAPT-PDF     (deferred)
   └──> I18N-ADAPT-NOTIFY  (deferred)
```

First slice ships core + React adapter only. The core is framework-agnostic;
adapters are thin bindings over the same `I18nInstance`.

### 5.4 Dependency graph

```
@workspace/i18n (core)
   │  (uses)
   └──> Intl (ECMA-402, built-in — no external dep)

@workspace/i18n/adapters/react
   ├──> @workspace/i18n (core)
   └──> react (peer dependency)

@workspace/web ──uses──> @workspace/i18n/adapters/react
```

Upstream: none platform-internal.
Downstream: `@workspace/web` (future consumer via React adapter).
No external npm dependencies in first slice (Intl is built into Node/modern browsers).

### 5.5 Deployment surface

| Host | Touches i18n how | First slice? |
|---|---|---|
| Render (API server) | May use core for server-side string formatting (email/notification strings) | Indirect (future) |
| Vercel (web) | Uses React adapter; client-side locale loading | Yes (primary) |
| Supabase | None (no DB involvement) | No |

Locale dictionaries are provided by the caller's loader (e.g. dynamic import in
the web app). Bundling strategy is deferred to I18N-DEPLOY.

## 6. Dependencies

Upstream standards: ESS-001, TS-001, EDS-001, EES-001.
Authorizing ADR: ADR-I18N-001 (pending).

## 7. Invariants

| ID | Invariant | Testable as |
|---|---|---|
| INV-1 | `t()` never throws on a missing key — returns the key string | missing-key test |
| INV-2 | `t()` never throws on a missing locale — falls back, then returns key | missing-locale test |
| INV-3 | Interpolation values are stringified, never evaluated as code/HTML | injection test |
| INV-4 | A loaded locale stays cached (no re-fetch on subsequent `t()` calls) | cache-hit test |
| INV-5 | The core has zero external npm dependencies (Intl only) | dependency inspection |

## 8. Non-compliance & remediation

- External dependency added to core → architecture violation; move to adapter or remove.
- `t()` throws on missing key/locale → defect; enforce fail-safe return.
- Dictionary bundled into core → scope violation; extract to caller loader.
- Missing ADR on major change → block release (EES-001 §4).

## 9. Validation

| ID | Check | Pass/Fail |
|---|---|---|
| IA-01 | Module boundaries declared (§5.1) | ☐ |
| IA-02 | Responsibility matrix complete (§5.2) | ☐ |
| IA-03 | Adapter topology declared (§5.3) | ☐ |
| IA-04 | Dependency graph acyclic, zero external deps (§5.4) | ☐ |
| IA-05 | Deployment surface declared (§5.5) | ☐ |
| IA-06 | Invariants present and testable (§7) | ☐ |
| IA-07 | Out-of-scope topics cite owning doc (§3.2) | ☐ |
| IA-08 | Cites governing standard ESS-001 | ☐ |

## 10. Change history

| Version | Date | Author | Change |
|---|---|---|---|
| 1.0 | (commit date) | CTO | Initial architecture spec; framework-agnostic core + React adapter first slice. |
