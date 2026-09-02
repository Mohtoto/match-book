---
name: pricelist-reconciler
description: "Build guide for a supplier price list reconciliation app: a distributor uploads their product catalogue export plus a supplier's new price file, and gets back a change report and an import-ready file for their ERP. Use this whenever working on this codebase — scoping, schema design, SKU matching logic, diff rules, sanity checks, export templates, UI, or code review. Also use when asked to add any feature, so the request can be checked against the V1 scope fence before anything is built."
---

# Supplier Price List Reconciler — Build Skill

## The product, in one sentence

Upload your product catalogue export and a supplier's new price file, and get back a change report plus an import-ready file for your system.

Working name: **Matchbook**. 

## Who it is for

The purchasing manager, inventory controller, or pricing admin at a 5–100 employee wholesale distributor or trade supplier with 3,000–50,000 SKUs and 20–150 suppliers, running an older ERP (Epicor Kinetic, Sage, Pronto, MYOB Advanced, Unleashed, Cin7) or a large Shopify/WooCommerce B2B catalogue.

They currently do this in Excel with XLOOKUP or Power Query, or line by line by hand.

## What the product actually does

1. Accepts two files: the customer's catalogue export, and a supplier's price file.
2. Matches supplier line items to internal SKUs, using mappings that **persist per supplier** so the second upload from that supplier is near-instant.
3. Computes a diff: which stocked SKUs went up, down, stayed flat, are new, may be discontinued, and which lines need human review.
4. Emits a change report and a download shaped for the customer's ERP import.

The persistent per-supplier column mapping and SKU mapping are the core asset. Month six is far more valuable than month one because those mappings have accumulated. Protect this in every design decision.

## Non-negotiable rules

These are the rules that keep the product shippable and trustworthy. Do not violate them without the user explicitly overriding.

1. **Never auto-apply a fuzzy match.** Fuzzy results are suggestions requiring human confirmation. Once confirmed, persist as an exact mapping so it never needs confirming again.
2. **Every identifier column is a string, always.** Never let a parser infer a numeric type on a SKU, part number, or barcode column. This single rule prevents the most common and most damaging class of bug in this domain.
3. **Never infer "discontinued" from a delta file.** Only when the user has declared the upload a full catalogue can a missing SKU mean discontinued. Otherwise it means "not in this update."
4. **Never mutate the uploaded files.** Store the raw upload immutably; all parsing is read-only and reproducible.
5. **Every run is auditable and reproducible.** Same inputs plus same mappings must produce the same output, and the user must be able to see why any line was categorised as it was.
6. **Sanity-flag before you export.** Implausible changes (see `reference/domain-logic.md`) get flagged, never silently passed through. The customer's deepest fear is that this tool causes a pricing disaster. Design for that fear.
7. **No feature outside the V1 fence without asking.** Read `reference/scope.md` and stop.

## Scope discipline

Before building anything, read `reference/scope.md`.

If the user requests something on the "not in V1" list, do not build it silently and do not build it enthusiastically. Say plainly that it's outside the V1 fence, say what it would cost in time, note what it displaces, and ask whether they want to move the fence. If they say yes, move it — it's their product. The job here is to make the tradeoff visible, not to refuse.

Treat "while we're in here, we may as well…" as the signal to stop and check.

## Reference material

Load the relevant file when working on that area rather than reading everything up front.

- **`reference/scope.md`** — the V1 fence, the parking lot, definition of done, and the recommended build order. Read this before planning or before responding to any feature request.
- **`reference/domain-logic.md`** — the matching cascade, normalisation rules, pack size and unit-of-measure handling, diff categories, sanity checks, the data model, and an acceptance checklist of real-world edge cases. Read this before touching parsing, matching, or diff code.
- **`reference/outputs.md`** — the change report contract and the ERP export template system. Read this before building either output.

## Technical defaults

If the repository already has a stack, follow it. If greenfield, propose a stack and confirm with the user before scaffolding. Defaults that suit this problem:

- **Parse server-side.** Files are up to ~100k rows. Do it synchronously if it completes in a couple of seconds; otherwise a simple job row in the database with a status column. **Do not add a queue, worker, or broker in V1.**
- **Postgres** for mappings and run history. The mapping tables are the asset; they need real relational integrity.
- **Boring, obvious code** over cleverness. This product's value is correctness, and correctness comes from code a person can read.
- Ship a working end-to-end vertical slice — upload, match, report, export — before making any part of it good.

## Security posture

Cost prices and supplier terms are among a distributor's most commercially sensitive data. This is a genuine objection you will hear in sales calls, so the posture has to be real.

- Encrypt uploads at rest. Strict per-tenant isolation on every query.
- Never log file contents or price values. Log row counts and errors only.
- Let the customer delete raw uploads while retaining mappings and run history.
- **Do not send cost data to a third-party LLM API in V1.** This is one of the reasons PDF extraction is deferred; when it arrives, it needs its own explicit consent decision.

## How to talk to the user about this product

They are building this to validate a hypothesis, not to own a category. The hypothesis is that enough supplier files are messy enough that a general tool beats a bespoke spreadsheet. Every build decision should serve getting a real distributor to run a real file through it as quickly as possible.

If a suggestion would delay that moment, say so.
