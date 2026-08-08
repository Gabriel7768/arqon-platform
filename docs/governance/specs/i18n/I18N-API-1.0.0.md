# I18N-API-1.0.0 — i18n Public API Specification

| Field | Value |
|---|---|
| **Document ID** | I18N-API-1.0.0 |
| **Title** | i18n Public API Specification |
| **Version** | 1.0 |
| **Status** | Frozen |
| **Governing standard** | API-001 |
| **Derives from** | ESS-001, API-001, TS-001 |
| **Package** | `@workspace/i18n` |
| **Architecture** | I18N-ARCH-1.0.0 |
| **Owners** | CTO · Founder |
| **Planning doc** | SPD-001 |

---

## 1. Metadata header
See table above.

## 2. Purpose

Defines the **public interface** of `@workspace/i18n`: instance creation,
translation, formatting, locale loading/switching, and React adapter hooks.
Does NOT define runtime flows (I18N-RT), states (I18N-SM), or security (I18N-SEC).

## 3. Scope

### 3.1 In scope
- Public function/type signatures (core + React adapter)
- Parameter and return semantics
- Error contracts
- Stability marking

### 3.2 Out of scope (owning document)
- Runtime flows → I18N-RT-1.0.0 (RT-001)
- Locale states → I18N-SM-1.0.0 (SM-001)
- Security policy → I18N-SEC-1.0.0 (SEC-001)
- React rendering → caller

## 4. Definitions

| Term | Definition |
|---|---|
| Dictionary | `Record<string, string>` — flat key→translated-string map |
| Loader | `(locale: string) => Promise<Dictionary>` — caller-provided |
| I18nInstance | The core object returned by `createI18n(config)` |

## 5. Contract

### 5.1 Symbol inventory — core

| Symbol | Kind | Stability | Since |
|---|---|---|---|
| `createI18n` | function | Stable | 1.0.0 |
| `I18nInstance` | interface | Stable | 1.0.0 |
| `I18nConfig` | type | Stable | 1.0.0 |
| `Dictionary` | type | Stable | 1.0.0 |
| `Loader` | type | Stable | 1.0.0 |
| `I18nError` | error | Stable | 1.0.0 |

### 5.2 Symbol inventory — React adapter

| Symbol | Kind | Stability | Since |
|---|---|---|---|
| `I18nProvider` | component | Stable | 1.0.0 |
| `useI18n` | hook | Stable | 1.0.0 |
| `useLocale` | hook | Stable | 1.0.0 |

### 5.3 Signature table — core

| Symbol | Signature |
|---|---|
| `createI18n` | `(config: I18nConfig) => I18nInstance` |
| `I18nInstance.t` | `(key: string, params?: Record<string, string \| number>) => string` |
| `I18nInstance.formatNumber` | `(value: number, locale?: string) => string` |
| `I18nInstance.formatCurrency` | `(value: number, currency: string, locale?: string) => string` |
| `I18nInstance.formatDate` | `(value: Date \| string, locale?: string) => string` |
| `I18nInstance.setLocale` | `(locale: string) => Promise<void>` |
| `I18nInstance.getLocale` | `() => string` |
| `I18nInstance.loadLocale` | `(locale: string) => Promise<Dictionary>` |
| `I18nInstance.isLocaleLoaded` | `(locale: string) => boolean` |

`I18nConfig`:
| Field | Type | Nullable | Meaning | Default |
|---|---|---|---|---|
| `defaultLocale` | string | no | initial active locale (e.g. "en-US") | — |
| `locales` | string[] | no | list of supported locale codes | — |
| `loadDictionary` | Loader | no | async dictionary loader | — |
| `fallbackLocale` | string | yes | locale tried when active locale key missing | first entry of `locales` |

### 5.4 Signature table — React adapter

| Symbol | Signature |
|---|---|
| `I18nProvider` | `(props: { instance: I18nInstance; children: ReactNode }) => JSX.Element` |
| `useI18n` | `() => { t, formatNumber, formatCurrency, formatDate, locale, setLocale }` |
| `useLocale` | `() => string` |

### 5.5 Parameter table

| Symbol | Parameter | Type | Nullable | Meaning |
|---|---|---|---|---|
| `t` | key | string | no | translation key |
| `t` | params | Record<string,string\|number> | yes | interpolation values |
| `formatNumber` | value | number | no | numeric value |
| `formatNumber` | locale | string | yes | override active locale |
| `formatCurrency` | value | number | no | amount |
| `formatCurrency` | currency | string | no | ISO 4217 code (e.g. "BRL") |
| `formatCurrency` | locale | string | yes | override active locale |
| `formatDate` | value | Date \| string | no | date to format |
| `formatDate` | locale | string | yes | override active locale |
| `setLocale` | locale | string | no | new active locale |
| `loadLocale` | locale | string | no | locale to load/cache |

### 5.6 Return table

| Symbol | Return type | Nullable | Meaning | Ownership |
|---|---|---|---|---|
| `t` | `string` | no | translated string (or key on miss) | callee (new string) |
| `formatNumber` | `string` | no | formatted number | callee |
| `formatCurrency` | `string` | no | formatted currency | callee |
| `formatDate` | `string` | no | formatted date | callee |
| `setLocale` | `Promise<void>` | no | resolves when locale loaded | callee |
| `getLocale` | `string` | no | active locale code | reads state |
| `loadLocale` | `Promise<Dictionary>` | no | the loaded dictionary | callee (cached) |
| `isLocaleLoaded` | `boolean` | no | whether locale is cached | reads cache |

### 5.7 Error table

| Symbol | Error | Code/Type | Meaning | Recoverable | State-after-error |
|---|---|---|---|---|---|
| `createI18n` | `I18nError` | `CONFIG_INVALID` | defaultLocale not in locales[] | no (fix config) | throws; no instance |
| `createI18n` | `I18nError` | `CONFIG_INVALID` | loadDictionary missing | no | throws; no instance |
| `loadLocale` | `I18nError` | `LOAD_FAILED` | loader rejected/returned non-object | yes (retry) | locale not cached; SM ERROR |
| `setLocale` | `I18nError` | `LOAD_FAILED` | underlying loadLocale failed | yes (retry) | active locale unchanged |
| `t` | — | — | never throws (fail-safe: returns key) | n/a | returns key string |
| `formatNumber` | — | — | never throws (Intl may return fallback string) | n/a | returns formatted or String(value) |

> `t()` is fail-safe: missing key, missing locale, or missing params never
> throw — the function returns the key string (or partially-interpolated string).
> This is INV-1/INV-2 (I18N-ARCH §7).

### 5.8 Lifecycle & ownership table

| Symbol | Created by | Destroyed by | Ownership | Side effects |
|---|---|---|---|---|
| I18nInstance | `createI18n` | caller (discard) | callee-returned | holds cache Map |
| Dictionary | `loadLocale` | caller (discard instance) | callee (cached) | memory (cache) |
| translated string | `t` | caller (GC) | callee-returned | none |
| formatted string | format* | caller (GC) | callee-returned | CPU (Intl) |

## 6. Dependencies

Upstream: I18N-ARCH-1.0.0, API-001, ESS-001.
Cross: I18N-RT (flows), I18N-SM (locale states), I18N-SEC (injection defense),
I18N-ADAPT-REACT (adapter consumes core).

## 7. Invariants

| ID | Invariant | Testable as |
|---|---|---|
| INV-A1 | `t()` returns the key string when key is missing | missing-key test |
| INV-A2 | `t()` returns the key string when locale is missing/not loaded | missing-locale test |
| INV-A3 | `t()` interpolates `{param}` placeholders with stringified values | interpolation test |
| INV-A4 | `loadLocale` caches; second call returns cached (no loader invocation) | cache test |
| INV-A5 | `createI18n` rejects config where defaultLocale ∉ locales | config test |

## 8. Non-compliance & remediation

- Undocumented error → defect; add to error table (API-R8).
- `t()` that throws on miss → defect; enforce fail-safe return.
- Missing stability marking → defect; mark Stable.

## 9. Validation

### Content (API-C)

| ID | Check | Pass/Fail |
|---|---|---|
| IA-PI-C01 | Every public symbol in inventory | ☐ |
| IA-PI-C02 | Every symbol has signature row | ☐ |
| IA-PI-C03 | Every parameter has semantics | ☐ |
| IA-PI-C04 | Every return has semantics | ☐ |
| IA-PI-C05 | Every error listed + recoverable/state-after | ☐ |
| IA-PI-C06 | Every symbol marked Stable | ☐ |
| IA-PI-C07 | Ownership declared | ☐ |

### Consistency (API-X)

| ID | Check | Pass/Fail |
|---|---|---|
| IA-PI-X01 | Error table consistent with I18N-RT error paths | ☐ |
| IA-PI-X02 | State-changing symbols cite I18N-SM transitions | ☐ |
| IA-PI-X03 | Security-touching symbols cite I18N-SEC requirements | ☐ |

## 10. Quality gates

| Gate | Requirement | Enforced by |
|---|---|---|
| IAPG-01 | Signature completeness | API reviewer |
| IAPG-02 | Error exhaustiveness + RT co-sign | API reviewer + RT owner |
| IAPG-03 | SM consistency + SM co-sign | API reviewer + SM owner |
| IAPG-04 | SEC consistency + SEC co-sign | API reviewer + SEC owner |
| IAPG-05 | In-git freeze | CTO |

## 11. Change history

| Version | Date | Author | Change |
|---|---|---|---|
| 1.0 | (commit date) | CTO | Initial public API; createI18n, t, format*, setLocale, loadLocale, React adapter hooks. |
