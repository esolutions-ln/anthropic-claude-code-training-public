# SPEC · NWP-101 — Payments export: choose columns and scope

> Written before any code. Load it as context when you build: `@docs/specs/NWP-101-export-options.md`

**Ticket:** [NWP-101](../tickets/NWP-101.md)
**Author:** Lucky Ncube
**Status:** building

## Problem

Ops exports payments several times a day, and every file carries every column including the card last four. Anything going to a merchant is cleaned by hand first (3–4 hours a month), and an unedited file nearly went to the wrong merchant last quarter. Ops needs to pick columns and scope before downloading.

## Current state

- `src/app/api/payments/export/route.ts` — reads filters with `parseFilters`, runs `filterPayments` + `sortPayments` (all matching rows, not a page), writes every column, filename `payments-YYYY-MM-DD.csv`.
- `src/lib/csv.ts` — `EXPORT_COLUMNS` and `toCsv(rows, columns)` already write only the given columns in the given order; `last4` is in the default set. No parser validates client column names.
- `src/data/queries.ts` — the one query builder (`parseFilters`, `filterPayments`, `sortPayments`, `queryPayments`). `GET /api/payments` returns `total`.
- `src/app/payments/page.tsx` — Export is a plain `<a>` to the export route; no dialog.
- `src/components/` — the rules mention a `Dialog`, but none exists. `Drawer.tsx` wraps `@radix-ui/react-dialog`, which is already a dependency. No Checkbox component.
- `sortPayments` compares amounts as strings (`"9000" > "10000"`). Separate bug, not fixed here.

## Domain rules

| Rule | Source | What breaks if ignored |
| --- | --- | --- |
| "Validate on the server" — column names checked against an allowlist before a query or filename | `merchant-console/CLAUDE.md` | Arbitrary strings reach the response header / file |
| "One query builder" | `merchant-console/CLAUDE.md` | Export and table disagree about what "current filter" means |
| Money is integer minor units, formatted once at the edge with its currency | `.claude/rules/money.md` | Cents drift; currency ambiguity |
| Dialogs: accessible name, focus in and back, Escape closes | `.claude/rules/components.md` | Unusable by keyboard |

## Approach

Keep the export server-side so it covers every filtered row, not one page. Add an allowlist parser for `columns` and `scope` in `src/lib/csv.ts` next to `EXPORT_COLUMNS`, and have the route reject bad input with a 400 before touching the store. Scope `all` runs the same builder with empty filters. The dialog only builds a URL; the row count comes from the existing `GET /api/payments` `total`.

**Considered and rejected:** building the CSV in the browser from table rows — exports the current page only (the ticket names this as the bug). A separate count endpoint — `GET /api/payments` already returns `total`.

## File map

| File | Add or change | Why |
| --- | --- | --- |
| `src/lib/csv.ts` | change | `DEFAULT_EXPORT_COLUMNS`, `parseExportColumns`, `parseExportScope`, `exportScopeLabel`, label in `exportFilename` |
| `src/app/api/payments/export/route.ts` | change | Validate, scope, columns, filename |
| `src/components/Dialog.tsx` | add | Radix dialog primitive, Tremor styling |
| `src/app/payments/export-dialog.tsx` | add | Options dialog |
| `src/app/payments/page.tsx` | change | Use the dialog instead of the link |
| `src/lib/csv.test.ts` | change | Column selection tests |

## Plan

1. **Parser + route** — done when: `curl` with bad columns returns 400 and good columns return them in order.
2. **Dialog** — done when: the dialog opens from Export, shows the row count per scope, and Download is disabled with no columns.
3. **Tests** — done when: `npm test` passes with the new cases.

## Verification

| Acceptance criterion | How it is proven |
| --- | --- |
| Choose columns; last four off by default | Unit test on `DEFAULT_EXPORT_COLUMNS`/`parseExportColumns`; dialog opens with last four unticked |
| Scope current (default) or all; row count visible | `curl ?scope=all&status=disputed` returns every row; dialog shows both totals |
| Filename reflects scope and date | Unit test on `exportFilename`; `curl -I` shows `payments-disputed-<date>.csv` |
| Minor units internally, formatted once, currency column | `toCsv` uses `formatMoney` only at write time; `currency` column present by default |
| No columns disables Download | Dialog button disabled; server returns 400 for `columns=` |

## Risks

- Filename built from client input — only allowlisted values (`all`, a known status, a known merchant id, or `filtered`) ever reach it.

## Out of scope

- String-based amount sort in `sortPayments`.
- Persisting a user's column preference.

## Open questions

- None blocking.
