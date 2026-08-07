# ADAPT-001 — Adapter Specification Standard

| Field | Value |
|---|---|
| **Document ID** | ADAPT-001 |
| **Title** | Adapter Specification Standard |
| **Version** | 1.0 |
| **Status** | Frozen |
| **Derives from** | TS-001, API-001, RT-001, ESS-001, EES-001, EDS-001 |
| **Owners** | CTO (technical sign-off) · Founder (freeze authority) |
| **Frozen at commit** | (to be filled on first commit) |
| **Originating brief** | (derived from ADR governance review §4; TS-001) |

> Same authority note: freeze takes effect at first commit to
> `docs/governance/`. If it is not in git, it is not Frozen.

---

## 1. Purpose

ADAPT-001 governs **how every Adapter Specification is written**. An adapter
bridges a platform package's core contract to a specific consumer/runtime
surface (React, Email, PDF, Notification, Backend, CLI, SDK, etc.). It does
NOT define the core contract — it defines how an adapter exposes it.

ADAPT-001 is the parent standard for adapter specs such as:
- i18n React adapter, Email adapter, PDF adapter, Notification adapter
- auth React adapter, auth backend adapter
- billing backend adapter (Abacatepay)

### 1.1 Relationship

| Document | Relationship |
|---|---|
| Architecture Spec | Defines the core contract the adapter exposes |
| Public API Spec (API-001) | Adapter-exposed symbols conform to API-001 |
| Runtime Spec (RT-001) | Adapter lifecycle conforms to RT-001 |
| Adapter Spec | Defines the mapping from core contract to a specific surface |

---

## 2. Scope

### 2.1 In scope
- The adapter interface (what the adapter implements)
- Mapping table (core contract element → adapter surface element)
- Lifecycle hooks (mount, unmount, init, dispose)
- Surface-specific constraints (e.g., React hook rules, Email template format)
- Fallback behavior when the surface is unavailable
- Versioning of the adapter independent of the core

### 2.2 Out of scope (owning document)
- Core contract definition → Architecture Spec / Public API Spec
- Core runtime behavior → Runtime Spec (RT-001)
- Core states → State Machine Spec (SM-001)
- Surface-internal implementation → Implementation Notes
- Deployment of the surface → Deployment Spec (DEPLOY-001)

---

## 3. Mandatory Document Structure

An Adapter Spec inherits ESS-001 §3 (§1–§9) and adds:

| § | Section | Purpose |
|---|---|---|
| 10 | Adapter identity | Which surface, which core package |
| 11 | Adapter interface | What the adapter implements |
| 12 | Mapping table | Core element ↔ surface element |
| 13 | Lifecycle hooks | Mount/init/dispose mapping |
| 14 | Surface constraints | Rules imposed by the target surface |
| 15 | Fallback behavior | When the surface is unavailable |
| 16 | Versioning | Adapter version independent of core |

---

## 4. Mandatory Tables

### 4.1 Adapter interface table

| Method | Signature | Maps to core | Stability |
|---|---|---|---|

### 4.2 Mapping table

| Core contract element | Adapter surface element | Direction | Transform | Notes |
|---|---|---|---|---|

- **Direction** = core→surface (render), surface→core (event/input).

### 4.3 Lifecycle hooks table

| Hook | When | Core lifecycle phase | Effect | Cleanup |
|---|---|---|---|---|

### 4.4 Surface constraints table

| Constraint | Rule | Enforcement |
|---|---|---|

### 4.5 Fallback table

| Condition | Fallback behavior | User-visible effect |
|---|---|---|

---

## 5. Notation Rules

- Adapter interface uses the surface's idiomatic form (e.g., React hook
  signature for the React adapter).
- Mapping table references core elements by their Public API symbol name.
- Lifecycle hooks reference core lifecycle phases by RT-001 phase name.

---

## 6. Cross-Reference Rules

| Reference | Rule |
|---|---|
| Core Public API Spec | MUST: mapping table cites core symbols |
| Core Runtime Spec | MUST: lifecycle hooks cite core phases |
| Core State Machine Spec | MAY: if adapter surfaces state |
| Security Spec | MAY: if adapter handles secrets/sessions |
| Deployment Spec | MAY: if adapter has host-specific config |

---

## 7. Domain-Specific Rules

| Rule | Statement |
|---|---|
| ADAPT-R1 Mapping completeness | Every core public element the adapter exposes MUST appear in the mapping table. |
| ADAPT-R2 No core redefinition | The adapter MUST NOT redefine the core contract; it maps it. |
| ADAPT-R3 Surface isolation | The adapter MUST NOT leak surface-specific types into the core. |
| ADAPT-R4 Lifecycle alignment | Every adapter lifecycle hook MUST map to a core lifecycle phase. |
| ADAPT-R5 Fallback defined | Every adapter MUST define fallback when its surface is unavailable. |
| ADAPT-R6 Independent versioning | The adapter versions independently of the core; a core major bump MAY require an adapter major bump. |
| ADAPT-R7 Direction explicit | Every mapping row MUST declare direction (render vs event). |
| ADAPT-R8 Constraint enforcement | Surface constraints MUST be enforceable (lint, type, or runtime). |

---

## 8. Validation Framework

### Universal — from EDS-001 + EES-001 + ESS-001.
### Structural (ADAPT-S)

| ID | Check | Pass/Fail |
|---|---|---|
| ADAPT-S01 | Adapter identity present | ☐ |
| ADAPT-S02 | Adapter interface table present | ☐ |
| ADAPT-S03 | Mapping table present | ☐ |
| ADAPT-S04 | Lifecycle hooks table present | ☐ |
| ADAPT-S05 | Surface constraints table present | ☐ |
| ADAPT-S06 | Fallback table present | ☐ |

### Content (ADAPT-C)

| ID | Check | Pass/Fail |
|---|---|---|
| ADAPT-C01 | Every exposed core element mapped | ☐ |
| ADAPT-C02 | No core redefinition | ☐ |
| ADAPT-C03 | No surface type leakage to core | ☐ |
| ADAPT-C04 | Every hook maps to a core phase | ☐ |
| ADAPT-C05 | Fallback defined per surface-unavailable condition | ☐ |
| ADAPT-C06 | Direction declared per mapping row | ☐ |
| ADAPT-C07 | Surface constraints enforceable | ☐ |

### Consistency (ADAPT-X)

| ID | Check | Pass/Fail |
|---|---|---|
| ADAPT-X01 | Mapping cites existing core symbols | ☐ |
| ADAPT-X02 | Hooks cite existing core lifecycle phases | ☐ |
| ADAPT-X03 | Adapter interface symbols conform to API-001 | ☐ |
| ADAPT-X04 | Adapter runtime conforms to RT-001 | ☐ |

---

## 9. Quality Gates

| Gate | Requirement | Enforced by |
|---|---|---|
| ADG-01 | Structure conformance (ADAPT-S) | Adapter reviewer |
| ADG-02 | Mapping completeness (ADAPT-R1, C01) | Adapter reviewer + core owner co-sign |
| ADG-03 | Core isolation (ADAPT-R2..R3, C02..C03) | Architecture reviewer |
| ADG-04 | Lifecycle alignment (ADAPT-R4, C04, X02) | Adapter reviewer + RT owner co-sign |
| ADG-05 | Fallback defined (ADAPT-R5, C05) | Adapter reviewer |
| ADG-06 | API conformance (X03) | API reviewer |
| ADG-07 | In-git freeze | CTO |

---

## 10. Examples Policy

Inherits API-001 §11. Normative: a complete mapping table for one adapter.
Anti-pattern: an adapter that redefines a core type instead of mapping it.

---

## 11. Versioning

Inherits TS-001 §4. A core major bump that breaks the mapping is an adapter
Major bump (ADAPT-R6).

---

## 12. Change History

| Version | Date | Author | Change |
|---|---|---|---|
| 1.0 | (commit date) | CTO | Initial materialization into version control. |
