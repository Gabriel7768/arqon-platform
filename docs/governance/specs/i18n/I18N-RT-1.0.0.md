# I18N-RT-1.0.0 — i18n Runtime Specification

| Field | Value |
|---|---|
| **Document ID** | I18N-RT-1.0.0 |
| **Title** | i18n Runtime Specification |
| **Version** | 1.0 |
| **Status** | Frozen |
| **Governing standard** | RT-001 |
| **Derives from** | ESS-001, RT-001, API-001, TS-001 |
| **Architecture** | I18N-ARCH-1.0.0 |
| **Owners** | CTO · Founder |
| **Planning doc** | SPD-001 |

---

## 1. Metadata header
See table above.

## 2. Purpose

Defines the **runtime behavior** of `@workspace/i18n`: how dictionaries load
and cache, how translation lookup with fallback works, how formatting runs,
how locale switching happens, error propagation, concurrency, lifecycle.

## 3. Scope

### 3.1 In scope
- `loadLocale` execution flow (load + cache + in-flight dedup)
- `t()` execution flow (lookup → fallback → interpolate)
- `formatNumber/formatCurrency/formatDate` flows
- `setLocale` flow (load-if-needed + switch)
- Error propagation
- Concurrency model (in-flight dedup)
- Caching behavior
- Lifecycle of I18nInstance

### 3.2 Out of scope (owning document)
- Public signatures → I18N-API-1.0.0 (API-001)
- Locale states → I18N-SM-1.0.0 (SM-001)
- Security policy → I18N-SEC-1.0.0 (SEC-001)

## 4. Definitions

Inherits RT-001 §4. Additional:
| Term | Definition |
|---|---|
| In-flight dedup | A second `loadLocale(x)` while the first is pending shares the same promise |

## 5. Method Behaviors

### 5.1 loadLocale

**Success flow:**
1. Trigger: caller invokes `loadLocale(locale)`.
2. Preconditions: locale is a string; instance constructed.
3. If locale is cached → return cached dictionary (cache hit; no loader call).
4. If locale is in-flight → return the existing promise (dedup).
5. Otherwise: invoke `config.loadDictionary(locale)`, store the promise in-flight.
6. On resolve: validate result is an object; cache the dictionary; clear in-flight.
7. Return the dictionary.
8. Postconditions: locale is cached; SM NOT_LOADED→LOADING→READY.
9. References: I18N-API `loadLocale`; SM T-01/T-02.

**Error flow:**
1. Trigger: loader rejects, or returns non-object.
2. Throw `I18nError(LOAD_FAILED)`; clear in-flight; locale NOT cached.
3. SM LOADING→ERROR (T-03). Recoverable (retry re-enters LOADING).

### 5.2 t (translate)

**Success flow:**
1. Trigger: caller invokes `t(key, params?)`.
2. Preconditions: key is a string.
3. Look up `key` in active locale's dictionary.
4. If found → use that string. If not found → try fallback locale's dictionary.
5. If still not found → return `key` itself (fail-safe; INV-1).
6. If `params` provided → replace each `{paramName}` with `String(value)`.
7. Return the (interpolated) string.
8. Postconditions: a string is returned; never throws.
9. References: I18N-API `t`; SEC interpolation defense (INV-3).

**Error flow:**
None — `t()` is fail-safe. Missing key/locale/params all return gracefully
(key string or partially-interpolated string). This is a design invariant
(INV-1, INV-2), not an absence of error handling.

### 5.3 formatNumber

**Success flow:**
1. Trigger: caller invokes `formatNumber(value, locale?)`.
2. Use `locale ?? activeLocale`.
3. Call `Intl.NumberFormat(locale).format(value)`.
4. Return formatted string.
5. Postconditions: a string is returned.

**Error flow:**
If Intl throws (invalid locale): catch, fall back to `String(value)`. Never
throws. Fail-safe.

### 5.4 formatCurrency

**Success flow:**
1. Trigger: caller invokes `formatCurrency(value, currency, locale?)`.
2. Use `locale ?? activeLocale`.
3. Call `Intl.NumberFormat(locale, { style: "currency", currency }).format(value)`.
4. Return formatted string.

**Error flow:**
If Intl throws: catch, fall back to `String(value)`. Never throws.

### 5.5 formatDate

**Success flow:**
1. Trigger: caller invokes `formatDate(value, locale?)`.
2. Coerce `value` to Date if string.
3. Use `locale ?? activeLocale`.
4. Call `Intl.DateTimeFormat(locale).format(date)`.
5. Return formatted string.

**Error flow:**
If Intl throws or date invalid: catch, fall back to `String(value)`. Never throws.

### 5.6 setLocale

**Success flow:**
1. Trigger: caller invokes `setLocale(locale)`.
2. Preconditions: locale is in `config.locales` (else CONFIG_INVALID — but
   first slice is lenient: unknown locale still attempts load).
3. If locale already cached → switch active locale; resolve. SM READY→READY.
4. If not cached → `loadLocale(locale)`; on success switch active locale.
5. Postconditions: active locale is the new locale; SM transitions per load.
6. References: I18N-API `setLocale`; SM T-05.

**Error flow:**
1. Trigger: underlying `loadLocale` fails.
2. Throw `I18nError(LOAD_FAILED)`; active locale UNCHANGED (state-after-error:
   previous locale remains active). SM T-06.

### 5.7 getLocale

**Success flow:**
1. Return the current active locale string. Synchronous, no side effects.

## 6. Concurrency Model

| Element | Requirement |
|---|---|
| Shared state | `cache` Map and `inFlight` Map (mutable) |
| Isolation | Per-locale dedup; no cross-locale contention |
| Synchronization | In-flight promise sharing (dedup) — same locale, same promise |
| Locking | None (JS single-threaded; Map ops are atomic) |
| Memory visibility | N/A (single-threaded event loop) |

In-flight dedup properties (RT-R7):
1. **Trigger**: second `loadLocale(x)` while first pending.
2. **Key**: locale code.
3. **Window**: from loader invocation to promise settle.
4. **Effect**: second caller receives the same promise (no double load).
5. **Eviction**: promise removed from in-flight on settle (resolve or reject).

## 7. Caching Behavior

| Cache | Key | Value | Eviction | Hit behavior |
|---|---|---|---|---|
| dictionary cache | locale code | Dictionary | never (first slice; stays for instance lifetime) | return cached, no loader call |
| in-flight | locale code | Promise<Dictionary> | on settle | return same promise |

First slice: no eviction, no LRU, no TTL. Cached locales persist for the
instance lifetime. Future slices may add eviction (SM T-07, deferred).

## 8. Lifecycle Phases

| Phase | Entry | Exit | State | Side effects |
|---|---|---|---|---|
| construction | `createI18n(config)` | config validated | configured | none |
| initial load | first `loadLocale(defaultLocale)` or `setLocale` | dictionary cached | active | loader call + memory |
| steady state | locale cached | instance discarded | active | Intl CPU on format |
| shutdown | instance discarded (GC) | — | disposed | cache GC'd |

No background tasks. No polling. No auto-refresh of dictionaries.

## 9. Error Propagation Policy

| Error class | Propagated to | Recoverable | State-after-error |
|---|---|---|---|
| CONFIG_INVALID | caller (construction) | no (fix config) | throws; no instance |
| LOAD_FAILED | caller | yes (retry) | locale not cached; active unchanged |
| t() miss | — | n/a | returns key (fail-safe, no throw) |
| format() Intl error | — | n/a | returns String(value) (fail-safe) |

`loadLocale`/`setLocale` failures propagate (throw). `t()`/`format*` never
throw — they are fail-safe by design.

## 10. Background Tasks

None. No polling, no dictionary refresh job, no cache warmup in background.

## 11. Resource Ownership

| Resource | Owner | Transfer | Release |
|---|---|---|---|
| Dictionary | package (cache) | none (stays cached) | instance GC |
| in-flight promise | package | shared with caller | settled + removed |
| translated/formatted string | package call | package→caller | caller GC |

## 12. Retry Policy

| Operation | Max attempts | Retryable errors |
|---|---|---|
| loadLocale | 1 (caller may retry by calling again) | LOAD_FAILED |
| setLocale | 1 (delegates to loadLocale) | LOAD_FAILED |
| t | 1 (synchronous, no retry) | none (fail-safe) |
| format* | 1 | none (fail-safe) |

No automatic retry in first slice. Caller retries by re-invoking.

## 13. Cancellation Contract

| Operation | Cancel effect | State-after |
|---|---|---|
| loadLocale | promise may reject if loader signals | locale not cached |
| others | synchronous, no cancel window | none |

## 14. Fallback Chain

Translation fallback (NOT provider fallback — this is lookup fallback):
1. Active locale dictionary.
2. Fallback locale dictionary (config.fallbackLocale).
3. The key string itself.

No alternative loader fallback. Single loader; fail-safe return on miss.

## 15. Domain rules (RT-001)

| Rule | Status |
|---|---|
| RT-R1 flow completeness | each method has success + error ✓ |
| RT-R2 error exhaustiveness | consistent with I18N-API ✓ |
| RT-R3 concurrency statements | declared (in-flight dedup) ✓ |
| RT-R4 state transition citation | loadLocale→T-01/T-02/T-03; setLocale→T-05/T-06 ✓ |
| RT-R5 background tasks | N/A (none) ✓ |
| RT-R6 resource ownership | explicit ✓ |
| RT-R7 in-flight dedup | specified (4 properties) ✓ |
| RT-R8 partial failure | loadLocale fails atomically (locale not cached) ✓ |
| RT-R9 memory visibility | N/A (single-threaded) ✓ |
| RT-R10 lock order | N/A (no locks) ✓ |

## 16. Validation

### Consistency (RT-X)

| ID | Check | Pass/Fail |
|---|---|---|
| IA-RT-X01 | Error table consistent with I18N-API | ☐ |
| IA-RT-X02 | State-changing methods cite SM transitions | ☐ |
| IA-RT-X03 | Background tasks 4-phase (N/A) | ☐ |
| IA-RT-X04 | Resource ownership explicit | ☐ |
| IA-RT-X05 | Concurrency statements (in-flight dedup) | ☐ |
| IA-RT-X06 | Retry consistent with recoverability | ☐ |

## 17. Quality gates

| Gate | Requirement | Enforced by |
|---|---|---|
| IARTG-11 | TEST owner co-sign: postconditions + error paths testable | TEST owner |

## 18. Change history

| Version | Date | Author | Change |
|---|---|---|---|
| 1.0 | (commit date) | CTO | Initial runtime spec; in-flight dedup, fail-safe t(), cache-for-life. |
