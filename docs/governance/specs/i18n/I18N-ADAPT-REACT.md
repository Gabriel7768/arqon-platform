# I18N-ADAPT-REACT — i18n React Adapter Specification

| Field | Value |
|---|---|
| **Document ID** | I18N-ADAPT-REACT |
| **Title** | i18n Adapter Specification — React |
| **Version** | 1.0 |
| **Status** | Frozen |
| **Governing standard** | ADAPT-001 |
| **Derives from** | ESS-001, ADAPT-001, API-001, RT-001, TS-001 |
| **Architecture** | I18N-ARCH-1.0.0 |
| **Owners** | CTO · Founder |
| **Planning doc** | SPD-001 |

---

## 1. Metadata header
See table above.

## 2. Purpose

Defines the **mapping** between the `@workspace/i18n` core contract and the
React rendering surface. It provides context + hooks so React components can
call `t()`/`format*` reactively. It does NOT redefine the core contract
(ADAPT-R2); it binds it.

## 3. Scope

### 3.1 In scope
- Adapter identity (surface = React component tree)
- Adapter interface (I18nProvider, useI18n, useLocale)
- Mapping table (core → React binding)
- Lifecycle hooks (provider mount, locale change re-render)
- Surface constraints (React 19 peer dep, context-based)
- Fallback (none — delegates to core fallback)

### 3.2 Out of scope (owning document)
- Core contract definition → I18N-API / I18N-ARCH
- Core runtime behavior → I18N-RT
- Core states → I18N-SM
- Security policy → I18N-SEC (adapter applies it, does not define it)
- Component rendering → caller (React app)

## 4. Definitions

| Term | Definition |
|---|---|
| Context value | The object provided via React context: `{ t, formatNumber, formatCurrency, formatDate, locale, setLocale }` |

## 5. Contract

### 10. Adapter identity

| Aspect | Value |
|---|---|
| Surface | React component tree (via Context) |
| Core package | `@workspace/i18n` (core) |
| Peer dependency | `react` (≥19) |
| Adapter export path | `@workspace/i18n/adapters/react` |

### 11. Adapter interface table

| Method | Signature | Maps to core | Stability |
|---|---|---|---|
| `I18nProvider` | `(props: { instance: I18nInstance; children: ReactNode }) => Element` | wraps an I18nInstance in context | Stable |
| `useI18n` | `() => ContextValue` | exposes t, format*, locale, setLocale | Stable |
| `useLocale` | `() => string` | exposes active locale (reactive) | Stable |

### 12. Mapping table

| Core contract element | Adapter surface element | Direction | Transform | Notes |
|---|---|---|---|---|
| `I18nInstance.t` | `useI18n().t` | core→surface | bound to active locale | same signature |
| `I18nInstance.formatNumber` | `useI18n().formatNumber` | core→surface | bound | same signature |
| `I18nInstance.formatCurrency` | `useI18n().formatCurrency` | core→surface | bound | same signature |
| `I18nInstance.formatDate` | `useI18n().formatDate` | core→surface | bound | same signature |
| `I18nInstance.getLocale` | `useI18n().locale` | core→surface | read as value (reactive) | triggers re-render on change |
| `I18nInstance.setLocale` | `useI18n().setLocale` | surface→core | calls instance.setLocale; triggers re-render | async (returns Promise) |
| `I18nInstance` | `I18nProvider` prop | core→surface | stored in context | one instance per provider |

### 13. Lifecycle hooks table

| Hook | When | Core lifecycle phase | Effect | Cleanup |
|---|---|---|---|---|
| provider mount | I18nProvider renders | construction/steady | store instance in context; subscribe to locale changes | none |
| locale change | `setLocale` resolves | steady (SM READY) | trigger re-render of consumers | none |
| provider unmount | I18nProvider removed | shutdown | remove context; instance discarded by caller | none (caller owns instance) |

No persistent lifecycle beyond React's mount/unmount. The adapter does NOT
create or own the I18nInstance — the caller creates it and passes it as a prop.

### 14. Surface constraints table

| Constraint | Rule | Enforcement |
|---|---|---|
| React ≥19 peer dep | react must be present in consumer | peerDependency declaration |
| One instance per provider | I18nProvider takes a single instance prop | prop type enforces |
| useI18n inside provider | must be called within I18nProvider | context default throws if missing |
| No core redefinition | adapter calls core methods, never reimplements | code review (ADAPT-R2) |

### 15. Fallback table

| Condition | Fallback behavior | User-visible effect |
|---|---|---|
| useI18n called outside provider | throw `I18nError(CONTEXT_MISSING)` | caller sees error (dev-time) |
| core t() miss | delegates to core fallback (key string) | key string rendered |

No second adapter fallback. Single React adapter; core fallback chain applies.

### 16. Versioning

Adapter versions independently of core (ADAPT-R6). A core major bump that
changes `I18nInstance` shape triggers an adapter major bump. React major
changes (e.g. context API changes) may trigger adapter major independently.

## 6. Dependencies

Upstream: I18N-ARCH, I18N-API, I18N-RT, ADAPT-001, ESS-001.
Peer: `react` (≥19).
Cross: I18N-SEC (adapter applies interpolation defense via core t()).

## 7. Domain rules

ADAPT-R1 mapping completeness (every exposed core element mapped ✓); R2 no
core redefinition (adapter calls t/format*, never reimplements ✓); R3 no
surface type leakage to core (core uses `I18nInstance`, adapter uses React
context) ✓; R4 lifecycle alignment (mount/unmap aligns with instance steady
state) ✓; R5 fallback declared ✓; R6 independent versioning ✓; R7 direction
explicit ✓; R8 constraints enforceable ✓.

## 8. Validation

### Structural (ADAPT-S): all 6 tables present ✓
### Content (ADAPT-C): all 7 content checks satisfied ✓
### Consistency (ADAPT-X)

| ID | Check | Pass/Fail |
|---|---|---|
| IA-AD-X01 | Mapping cites existing core symbols (t, format*, setLocale, getLocale) | ☐ |
| IA-AD-X02 | Hooks cite core lifecycle phases | ☐ |
| IA-AD-X03 | Adapter interface conforms to API-001 (bound, not redefined) | ☐ |
| IA-AD-X04 | Adapter runtime conforms to RT-001 (delegates to core flows) | ☐ |

## 9. Quality gates

| Gate | Requirement | Enforced by |
|---|---|---|
| IAADG-01..07 | (inherited from ADAPT-001) | Adapter reviewer + core owner co-sign |

## 10. Change history

| Version | Date | Author | Change |
|---|---|---|---|
| 1.0 | (commit date) | CTO | Initial React adapter spec; I18nProvider + useI18n + useLocale bound to I18nInstance. |
