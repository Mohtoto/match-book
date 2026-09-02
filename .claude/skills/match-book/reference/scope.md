# V1 Scope Fence

## In V1

1. Upload a catalogue export (CSV/XLSX) and a supplier price file (CSV/XLSX).
2. Per-supplier column mapping — which column is the part number, description, price, unit of measure, pack size — saved and reused on subsequent uploads.
3. Matching: saved mapping → exact → normalised → alternate identifier → fuzzy suggestion requiring confirmation.
4. Manual mapping UI for unmatched lines, with confirmations persisted.
5. Diff computation across the categories in `domain-logic.md`.
6. Sanity flags on implausible changes.
7. Change report on screen, downloadable as CSV.
8. Export file generated from a per-customer ERP template.
9. Run history, so a customer can see what they imported last month and why.

That is the whole product. It is enough.

## Not in V1

Each of these is a real feature that a real customer will eventually want. None of them belongs in the first version.

- **ERP API integration or write-back.** Upload and download only. This is the single most important line on this list — it is what keeps the MVP at three weeks and removes every API approval, credential, and vendor-partnership dependency.
- **PDF extraction.** Deferred to v1.1, after evidence that PDF price letters are common enough to matter. Also has an unresolved security decision attached.
- **Email ingestion** of supplier files.
- **Pricing recommendations, margin optimisation, or suggested sell prices.** This is a different product sold to a different buyer. It is the thing the enterprise vendors do. Do not drift into it.
- **Supplier-facing portal** or supplier logins.
- **Approval workflows,** multi-step sign-off, or change requests.
- **User roles and permissions.** One account per company in V1.
- **Dashboards, charts, analytics, trend graphs.** The change report is not a dashboard.
- **Multi-currency** conversion.
- **Any inventory, purchasing, reordering, or stock feature.**
- **Notifications, scheduling, recurring runs, or reminders.**
- **A chat or AI assistant interface.**
- **Bulk supplier onboarding** or catalogue-wide bulk operations.
- **Mobile app or responsive-first design.** This is used at a desk with two files open.
- **SSO, audit-log exports, SOC 2 tooling.** Enterprise concerns for an enterprise you do not have yet.

## The parking lot

When the user raises something on the "not in V1" list and agrees to defer it, record it here rather than losing it. Deferred is not rejected.

- PDF price-increase letter extraction (highest-value deferred item; gate on customer evidence)
- Direct ERP connectors, most likely starting with whichever ERP the first three customers share
- Price break / quantity tier handling beyond base price
- Supplier file arrival by email or SFTP
- Effective-date scheduling, so a future-dated price file applies automatically on the right day

## Definition of done for V1

A real distributor, unassisted, can:

1. Upload their catalogue export and a real supplier price file.
2. Map the columns once.
3. See a change report they trust enough to act on.
4. Resolve the unmatched lines.
5. Download a file their ERP accepts on first attempt.
6. Do the same supplier again next month in under two minutes.

Step 6 is the one that proves the business. Do not consider V1 complete until a second upload from the same supplier is genuinely trivial.

## Recommended build order

Build a thin vertical slice first, then deepen. Do not build the matching engine in isolation before anything can call it.

1. **Two file uploads, parsed and displayed as tables.** Nothing else. Prove the parsing handles a real file.
2. **Column mapping UI, persisted per supplier.** Now the second upload is already cheaper than the first.
3. **Exact and normalised matching.** Show matched and unmatched counts. This is where you learn whether the customer's SKU formats are as messy as assumed.
4. **Diff computation and the change report.**
5. **Manual mapping for unmatched lines,** persisted as confirmed mappings.
6. **Export with one hardcoded template,** for the first customer's ERP.
7. **Sanity flags.**
8. **Run history.**
9. **Fuzzy match suggestions.** Last, because steps 3 and 5 may reveal it is unnecessary.

Stop after step 9. Show it to customers. Let their reactions decide what comes next, not this document.
