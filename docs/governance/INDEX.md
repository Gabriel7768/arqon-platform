# ARQON Platform — Governance Index

> **Authority:** This index is the entry point to the ARQON Platform governance
> corpus. Every document listed under `standards/` is the **single source of
> truth** for its subject area. If a document does not live here, in version
> control, it is not Frozen — regardless of any claim made elsewhere.

## How to read this index

- **Brief** (`briefs/`) — the original task/prompt that initiated the document.
  Preserved verbatim as provenance. Briefs are inputs, **never** the standard
  itself.
- **Standard** (`standards/`) — the authoritative, signed-off document. This is
  what every spec and every contributor must conform to.
- **Status**:
  - `Frozen` — authored, committed, signed off. Changes require a new ADR.
  - `Draft` — being authored. Not yet enforceable.
  - `Pending` — brief exists, standard not yet materialized.

## Standards

| ID | Title | Status | File |
|---|---|---|---|
| EDS-001 | Engineering Documentation Standard | Frozen v1.0 | `standards/EDS-001.md` |
| EES-001 | Engineering Execution Standard | Frozen v1.0 | `standards/EES-001.md` |
| ESS-001 | Engineering Specification Standard | Frozen v1.0 | `standards/ESS-001.md` |
| TS-001 | Technical Standard Meta-Specification | Frozen v1.0 | `standards/TS-001.md` |
| API-001 | Public API Specification Standard | Frozen v1.0 | `standards/API-001.md` |
| RT-001 | Runtime Specification Standard | Frozen v1.0 | `standards/RT-001.md` |
| SM-001 | State Machine Specification Standard | Frozen v1.0 | `standards/SM-001.md` |
| ADAPT-001 | Adapter Specification Standard | Frozen v1.0 | `standards/ADAPT-001.md` |
| SEC-001 | Security Specification Standard | Frozen v1.0 | `standards/SEC-001.md` |

## Planning Documents

| ID | Title | Status | File |
|---|---|---|---|
| SPD-001 | Spec Planning Document — packages/i18n | Active v1.0 | `standards/SPD-001.md` |
| SPD-002 | Spec Planning Document — packages/billing | Active v1.0 | `standards/SPD-002.md` |

## Dependency Order (materialization sequence)

Standards derive from each other. They must be authored in this order because
each subsequent standard references the structure/terminology of its parents:

```
EDS-001 ──┬──> EES-001
          ├──> ESS-001 ──> TS-001 ──┬──> API-001
          │                          ├──> RT-001
          │                          ├──> SM-001
          │                          └──> ADAPT-001
          └──> (foundation for all)
```

1. **EDS-001** — foundation; defines doc hierarchy, ownership, cross-ref rules.
2. **EES-001** — execution counterpart; depends on EDS-001 taxonomy.
3. **ESS-001** — defines how package specifications are structured; depends on
   EDS-001 + EES-001.
4. **TS-001** — meta-standard inherited by every technical standard; depends on
   ESS-001.
5. **API-001 / RT-001 / SM-001 / ADAPT-001** — each derives from TS-001.
6. **SPD-001** — applies the corpus to packages/i18n; depends on TS-001 + API-001
   (must exist to plan the package's required specs).

## Provenance note

An earlier session described EDS-001 through RT-001 as "Frozen." That freeze
was not persisted to version control — only the originating briefs survived.
The freeze therefore takes effect **in this materialization cycle**: when a
standard is committed to `standards/` and marked Frozen in this index, *that*
commit is its authoritative v1.0. This is the honest baseline going forward.
