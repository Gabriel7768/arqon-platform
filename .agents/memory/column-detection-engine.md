---
name: Column Detection Engine lib
description: Key facts about @workspace/column-detection-engine — API surface, concept priority, and test gotchas.
---

## API

```ts
import { detectSchemaMapping, getColumn } from "@workspace/column-detection-engine";
const result = detectSchemaMapping(columnNames);  // string[]
const col = getColumn(result, "amount");           // string | undefined
```

`result.mappings` is a `ReadonlyMap<Concept, ConceptMapping>` — `.set` is not on the type.

## Concept specificity

The engine prefers the most specific matching concept. `"invoice_amount"` and `"invoice.amount"` normalise to `"invoice amount"` and map to `invoiceAmount`, NOT the generic `amount` concept.

Revenue engine accounts for this with fallback chains:
```ts
amountCol = getColumn(r, "amount") ?? getColumn(r, "invoiceAmount") ?? ...
```

Tests that assert `getColumn(r, "amount")` for an `"invoice_amount"` input will fail — use `getColumn(r, "invoiceAmount") ?? getColumn(r, "amount")`.

**Why:** Concept dictionary ranks compound names (invoiceAmount) as higher-specificity synonyms, so a more-qualified column name resolves to the more-qualified concept.

**How to apply:** When writing tests for column detection, always check against the most-specific concept first or use the `??` fallback chain mirroring the revenue engine.
