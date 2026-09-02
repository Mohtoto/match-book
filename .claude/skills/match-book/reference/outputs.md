# Outputs

There are exactly two outputs. Both must be trustworthy at a glance, because the user is deciding whether to act on money.

## Output 1 — The change report

### Summary block

Shown first, above everything. This is the screen the customer will screenshot and send to their manager, so it has to stand alone.

```
Supplier:        Acme Electrical Supply
File:            acme-pricelist-sep26.xlsx  (delta, effective 1 Oct 2026)
Compared against: catalogue-export-30sep26.csv

  Needs your attention
    12  flagged as implausible
     8  unmatched supplier lines
     3  conflicts
     2  unit of measure unresolved

  Price movements on stocked items
   184  increased        average +4.2%   largest +31.0%
    11  decreased        average -2.1%
   402  unchanged

  Other
    47  on supplier list, not stocked
   118  stocked, not in this update
```

Rules for the summary:

- **Attention items come first.** Not price movements. The value of the product is catching what a human would miss.
- Never show a percentage without the count behind it.
- State the file type (`full` / `delta`) and the effective date on the face of the report. Misreading a delta as a full catalogue is the most expensive mistake available here.
- If more than 40% of the supplier file is unmatched, replace the summary with a mapping warning. Do not show a report the user shouldn't trust.

### Line detail

One row per `reconciliation_line`, sorted with flagged lines first, then by absolute dollar impact descending — not alphabetically by SKU. The largest movers are what the customer needs to see.

Columns:

`Flag` · `Internal SKU` · `Supplier part #` · `Description` · `Old unit price` · `New unit price` · `Change` · `Change %` · `Pack factor` · `Match method` · `Category`

- Show `Pack factor` whenever it is not 1, so the arithmetic is always checkable.
- Show `Match method` always. A user who sees `fuzzy_confirmed` on a surprising line knows where to look.
- Make the flag reason readable on hover or expand — "12.4× increase, check pack size" beats a warning triangle.

Downloadable as CSV with identical columns. Many customers will want to review it in Excel, and that is fine; do not fight it.

## Output 2 — The ERP import file

### The template system

Each customer's ERP wants a specific shape. Templates are per-tenant configuration, not code.

An `export_template` defines:

- **Column spec** — an ordered list of output columns, each mapping to either a source field (`internal_sku`, `new_unit_price`, `supplier_part_number`, `effective_date`, `supplier_name`) or a literal constant value. Constants matter more than they seem; ERPs often want a fixed price-list code or currency code in a column.
- **Header** — include or omit, and the exact header text, which frequently must match the ERP's expected string precisely.
- **Delimiter** — comma, tab, or pipe.
- **Date format** — ERPs are unforgiving here.
- **Encoding** — default UTF-8, but offer Windows-1252, because older ERPs need it and will silently corrupt characters otherwise.
- **Decimal places** on price, and whether to pad or truncate.

For V1, hardcode a single template for the first customer's ERP and put the configuration UI behind it only once a second customer needs a different shape. Do not build a template designer before you have two templates.

### What goes in the export

By default, **only lines the customer should act on**: `price_increase` and `price_decrease`, with a resolved match and no blocking flag.

Explicitly excluded:

- Anything unmatched, conflicted, or with unresolved unit of measure
- Zero or negative prices — hard block
- `not_stocked` lines, since the customer doesn't carry them
- `possibly_discontinued` lines, since a price file is the wrong instrument for deactivating products
- Unchanged prices, unless the customer asks, and some will for a full refresh

Let the user include flagged lines if they choose, but require an explicit action and label the download clearly when they do. Never make "export everything including the suspicious lines" the default or the easy path.

### After export

Record on the run: which template was used, how many lines were exported, and a checksum of the file. When a customer asks in three months why a price is what it is, the run history answers it. This is cheap to build now and impossible to reconstruct later.
