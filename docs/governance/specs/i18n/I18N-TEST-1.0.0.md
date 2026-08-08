# I18N-TEST-1.0.0 — i18n Testing Specification

| Field | Value |
|---|---|
| **Document ID** | I18N-TEST-1.0.0 |
| **Title** | i18n Testing Specification |
| **Version** | 1.0 |
| **Status** | Frozen |
| **Governing standard** | (TEST-001 — pending; authored against RT-001 postconditions) |
| **Derives from** | ESS-001, RT-001, TS-001 |
| **Architecture** | I18N-ARCH-1.0.0 |
| **Owners** | CTO · Founder |
| **Planning doc** | SPD-001 |

---

## 1. Metadata header
See table above.

## 2. Purpose

Defines the **test contracts** verifying `@workspace/i18n` meets its RT
postconditions and error paths. Provides the TEST-owner co-sign for RTG-11
(I18N-RT) and ISMG-07 (I18N-SM).

## 3. Scope

### 3.1 In scope
- Test contracts per public symbol
- Coverage of I18N-RT postconditions
- Coverage of I18N-RT error paths
- Coverage of I18N-SM transitions/invariants
- SEC coverage
- Mock/no-mock boundary

### 3.2 Out of scope (owning document)
- Behavior definition → I18N-RT / I18N-API / I18N-SM
- Security policy → I18N-SEC

## 4. Definitions

| Term | Definition |
|---|---|
| In-memory loader | A test loader: `(locale) => Promise.resolve(dictionaries[locale])` |

## 5. Contract

### 5.1 Test contracts per symbol

| Symbol | Contract under test | Type |
|---|---|---|
| `createI18n` | Valid config → returns instance | unit |
| `createI18n` | defaultLocale not in locales → throws CONFIG_INVALID | unit |
| `createI18n` | Missing loadDictionary → throws CONFIG_INVALID | unit |
| `t` | Key in active locale → translated string | unit |
| `t` | Key missing, in fallback locale → fallback string | unit |
| `t` | Key missing everywhere → returns key (fail-safe) | unit |
| `t` | With params → `{param}` replaced with String(value) | unit |
| `t` | Missing param → placeholder left as-is (fail-safe) | unit |
| `t` | Locale not loaded → returns key (fail-safe, no throw) | unit |
| `formatNumber` | Formats number in active locale | unit |
| `formatNumber` | Locale override → formats in that locale | unit |
| `formatCurrency` | Formats currency with symbol | unit |
| `formatDate` | Formats Date object | unit |
| `formatDate` | Formats ISO date string | unit |
| `loadLocale` | Loads + caches dictionary | unit |
| `loadLocale` | Second call → returns cached (no loader invocation) | unit |
| `loadLocale` | In-flight dedup: concurrent calls share one promise | unit |
| `loadLocale` | Loader rejects → throws LOAD_FAILED; not cached | unit |
| `loadLocale` | Loader returns non-object → throws LOAD_FAILED | unit |
| `setLocale` | Switches active locale (if cached) | unit |
| `setLocale` | Uncached locale → loads then switches | unit |
| `setLocale` | Load fails → throws LOAD_FAILED; active locale unchanged | unit |
| `getLocale` | Returns active locale | unit |
| `isLocaleLoaded` | True after load; false before | unit |

### 5.2 RT postcondition coverage (RTG-11 co-sign)

| RT postcondition | Testable as | Covered by |
|---|---|---|
| loadLocale caches dictionary | assert isLocaleLoaded true after | loadLocale unit |
| loadLocale dedups in-flight | assert loader called once for concurrent calls | dedup unit |
| t() returns key on miss | assert equals key | missing-key unit |
| t() returns key on missing locale | assert equals key | missing-locale unit |
| t() interpolates params | assert placeholder replaced | interpolation unit |
| format* never throws | assert returns string on bad input | format units |
| setLocale leaves active unchanged on error | assert getLocale unchanged | setLocale error unit |

### 5.3 SM transition/invariant coverage (ISMG-07 co-sign)

| Transition/Invariant | Testable as | Covered by |
|---|---|---|
| T-01 NOT_LOADED→LOADING | loadLocale invoked | loadLocale unit |
| T-02 LOADING→READY | loader resolves → cached | loadLocale unit |
| T-03 LOADING→ERROR | loader rejects → not cached | loadLocale error unit |
| T-04 ERROR→LOADING (retry) | retry after error succeeds | retry unit |
| T-05 READY cache hit | second call returns cached | cache-hit unit |
| T-06 setLocale to READY | switches active | setLocale cached unit |
| INV-S1 READY only if cached | isLocaleLoaded true | loadLocale unit |
| INV-S2 ERROR has no cache | isLocaleLoaded false after error | loadLocale error unit |
| INV-S4 one in-flight promise | dedup test | dedup unit |
| INV-S5 ERROR retryable | retry succeeds | retry unit |

### 5.4 SEC coverage

| SEC requirement | Testable as | Covered by |
|---|---|---|
| INV-3 params stringified, not eval'd | interpolation with `<script>` param → string literal | injection unit |
| TH-01 no XSS via params | assert output is plain string, no execution | injection unit |
| t() fail-safe on invalid key | returns key | missing-key unit |
| format* fail-safe on invalid input | returns String(value) | format error unit |

### 5.5 Mock/no-mock boundary

- No mocks for Intl (real browser/Node API, deterministic for fixed locales).
- No mocks for the core — tests exercise the real `createI18n`.
- The **loader is a real in-memory function** (not a mock): `(locale) =>
  Promise.resolve(dictionaries[locale])`. This is a stub/test-double of the
  loader contract, not a mock of core behavior.
- Tests use fixed locales ("en-US", "pt-BR") and fixed dictionaries.

## 6. Dependencies

Upstream: I18N-ARCH, I18N-RT, I18N-SM, I18N-SEC, ESS-001.

## 7. Invariants

| ID | Invariant | Testable as |
|---|---|---|
| INV-T1 | Every RT postcondition has ≥1 test | coverage mapping |
| INV-T2 | Every SM transition has ≥1 test | coverage mapping |
| INV-T3 | No test uses a real external API (in-memory loader only) | inspection |

## 8. Non-compliance & remediation

- RT postcondition with no test → block freeze (RTG-11 fails).
- Test mocking core behavior instead of exercising it → defect.

## 9. Validation

| ID | Check | Pass/Fail |
|---|---|---|
| IT-01 | Every public symbol has ≥1 test contract | ☐ |
| IT-02 | Every RT postcondition covered (RTG-11) | ☐ |
| IT-03 | Every SM transition covered (ISMG-07) | ☐ |
| IT-04 | SEC requirements covered | ☐ |
| IT-05 | Mock/no-mock boundary declared | ☐ |
| IT-06 | No real external API in tests | ☐ |

## 10. Quality gates

| Gate | Requirement | Enforced by |
|---|---|---|
| ITG-01 | RT postcondition coverage | TEST owner |
| ITG-02 | SM transition coverage | TEST owner |
| ITG-03 | SEC coverage | Security reviewer |
| ITG-04 | In-git freeze | CTO |

## 11. Change history

| Version | Date | Author | Change |
|---|---|---|---|
| 1.0 | (commit date) | CTO | Initial testing spec; provides RTG-11 + ISMG-07 co-signs; in-memory loader (no mocks of core). |
