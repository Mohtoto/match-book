# Domain Logic

This is the part that is genuinely hard and where guessing produces a product that quietly gives wrong answers. Follow it closely.

## Parsing rules

**Identifier columns are strings. Always.** SKUs, part numbers, manufacturer part numbers, barcodes, EANs, GTINs, UPCs. Force string type at read time on every candidate identifier column, before any inference happens.

The failure modes this prevents, all of which occur constantly in real supplier files:

- **Leading zeros destroyed.** `0012345` becomes `12345` and matches nothing, or worse, matches the wrong item.
- **Scientific notation on long barcodes.** `5012345678901` arrives as `5.01234567890E+12`.
- **Trailing decimals.** `12345` becomes `12345.0`.

Additional parsing realities to handle:

- **Non-breaking spaces and trailing whitespace** in identifiers. Strip both.
- **Header row is not row 1.** Supplier files frequently have a logo, a title, a date, and blank rows above the header. Detect the header row rather than assuming; let the user override.
- **Multiple sheets.** Ask which sheet, remember the answer per supplier.
- **Merged cells** in header regions.
- **Currency symbols and thousands separators** inside price columns. Parse `$1,234.50` and `1.234,50` correctly; ask the user for locale if ambiguous rather than guessing.
- **Blank rows and subtotal rows** mid-file. Skip rows with no identifier.

## File type declaration

On every upload the user must declare the supplier file as either:

- **Full catalogue** — the supplier's complete current list. Absence of one of our SKUs may mean discontinued.
- **Delta / partial list** — only affected items. Absence means nothing at all.

Default to **delta**, because it is the safe assumption. Never infer discontinuation from a delta file. Getting this wrong causes a customer to deactivate products they still sell, which is the worst possible failure this product could have.

Also capture an optional **effective date**. If it is in the future, the change report must say so prominently and the export should be labelled accordingly.

## The matching cascade

Run in this order. Stop at the first hit.

1. **Saved mapping.** A previously confirmed supplier-SKU-to-internal-SKU pair for this supplier. Highest priority, because a human already decided.
2. **Exact match** on the supplier part number as written, against the internal supplier-part-number field.
3. **Normalised match.** Uppercase, strip whitespace, hyphens, periods, underscores, and forward slashes. **Preserve leading zeros** — normalise the separators, never the digits.
4. **Alternate identifier match** on manufacturer part number, then barcode/EAN/GTIN, then UPC. Record which identifier produced the match so the user can judge whether to trust it.
5. **Fuzzy match** on normalised part number plus description similarity. Produces *suggestions only*. Never auto-applied. Present with a confidence score and both descriptions side by side so a human can decide in two seconds.

When a human confirms a fuzzy or alternate match, **write it to the saved mappings table immediately.** That is how the second upload becomes trivial, which is the whole business.

## Conflicts

- **One internal SKU matches multiple supplier lines.** Common and legitimate — usually quantity price breaks. If the file has a quantity or price-break column, take the base (quantity 1 / lowest break) price for the primary diff and flag the others as unhandled tiers. If there is no quantity column, do not guess: raise a conflict for human review.
- **One supplier line matches multiple internal SKUs.** Always a conflict. Never auto-resolve. This usually means the customer stocks the same item under two codes, which is their data problem to resolve, and surfacing it is genuinely useful to them.

## Pack size and unit of measure

This is the highest-value piece of logic in the product and the one Excel handles worst.

The supplier prices a box of 100; the customer stocks and sells each. A naive diff reports a 10,000% price increase. Get this wrong and the change report is worse than useless.

Each saved mapping therefore carries a **conversion factor**:

```
internal_unit_price = supplier_price / conversion_factor
```

Where `conversion_factor` is how many internal units come in one supplier priced unit. Default `1`.

Rules:

- If supplier UoM and internal UoM are both present and differ, **do not compute a diff.** Flag for the user to set a conversion factor. A missing answer is far better than a wrong one.
- Once set, the factor persists on the mapping and is reused silently.
- Surface the factor in the change report line detail so the arithmetic is always visible and checkable.
- Watch for suppliers who change pack size between price files — the part number stays the same and the price doubles. The sanity check below is the only thing that catches this, and it matters.

## Diff categories

Every supplier line and every internal SKU ends up in exactly one category.

| Category | Meaning |
|---|---|
| `price_increase` | Matched, new unit price higher |
| `price_decrease` | Matched, new unit price lower |
| `price_unchanged` | Matched, no movement |
| `not_stocked` | On the supplier's list, we don't carry it. Informational; may be a range-extension opportunity |
| `unmatched_supplier_line` | Couldn't be matched, needs human review |
| `possibly_discontinued` | We stock it, absent from a **full catalogue** upload |
| `not_in_this_update` | We stock it, absent from a **delta** upload. Expected, not a finding |
| `conflict` | Ambiguous match, needs human resolution |
| `uom_unresolved` | Matched but no conversion factor set |

## Sanity checks

Applied to every computed diff line. Each produces a flag, not a block, except where noted.

- **Movement beyond a threshold**, default ±30%, configurable per customer. Very often a pack-size change or a decimal error rather than a genuine price move.
- **Order-of-magnitude change** (roughly 10× or 0.1×). Almost always a decimal point or a pack-size problem. Flag loudly.
- **Zero or negative price.** Never export these. Hard block on the line.
- **Price present but identifier missing.** Skip the row.
- **New price identical across an implausible number of distinct items** — a common sign that a column was mapped wrongly.
- **More than 40% of the supplier file unmatched.** Almost certainly a column mapping error, not 40% of genuinely new products. Warn before showing results, because the user's instinct will be to distrust the tool rather than check the mapping.

The change report must present flagged lines first, above the clean ones. The customer's trust is built on the tool catching the thing they would have missed.

## Data model

Names are indicative; adapt to the stack's conventions.

**`supplier`** — id, tenant_id, name, default_currency, notes

**`upload`** — id, tenant_id, supplier_id (null for catalogue uploads), kind (`catalogue` | `supplier_price`), original_filename, stored_object_key, sheet_name, header_row_index, declared_type (`full` | `delta`), effective_date, row_count, uploaded_at, uploaded_by

Store the raw file immutably. Reproducibility depends on it.

**`column_mapping`** — id, tenant_id, supplier_id, source (`catalogue` | `supplier`), field (`part_number` | `description` | `price` | `uom` | `pack_size` | `mfr_part_number` | `barcode` | `quantity_break`), source_column_name, created_at

This table is why the second upload is fast. It is the highest-value data in the system after `sku_mapping`.

**`sku_mapping`** — id, tenant_id, supplier_id, supplier_part_number, internal_sku, conversion_factor (default 1), match_method (`exact` | `normalised` | `alternate_id` | `manual` | `fuzzy_confirmed`), confirmed_by, confirmed_at

**`reconciliation_run`** — id, tenant_id, supplier_id, catalogue_upload_id, supplier_upload_id, status, summary_json, created_at

**`reconciliation_line`** — id, run_id, category, supplier_part_number, internal_sku, description_supplier, description_internal, old_unit_price, new_unit_price, delta_absolute, delta_percent, conversion_factor_applied, flags (array), match_method

**`export_template`** — id, tenant_id, name, target_system, column_spec_json, delimiter, date_format, encoding, include_header

## Acceptance checklist

Before calling matching and diff logic done, verify against a fixture file exercising every one of these. Build the fixtures early; they will catch more bugs than any amount of unit testing of happy paths.

- [ ] SKU with leading zeros survives parse, match, and export intact
- [ ] 13-digit barcode does not arrive in scientific notation
- [ ] Supplier file with three junk rows above the header parses correctly
- [ ] Supplier file with the price column formatted as `$1,234.50` parses correctly
- [ ] Supplier prices per box of 100, internal stock per each, correct unit price computed
- [ ] Same part number appearing three times with quantity breaks handled without a false conflict
- [ ] Two internal SKUs matching one supplier line raises a conflict rather than picking one
- [ ] Delta upload does not mark any internal SKU as discontinued
- [ ] Full catalogue upload does mark absent internal SKUs as possibly discontinued
- [ ] A 12× price jump is flagged, not silently exported
- [ ] Zero-priced line is blocked from export
- [ ] A confirmed manual match is reused automatically on the next upload from that supplier
- [ ] Two consecutive uploads from the same supplier require no column mapping the second time
