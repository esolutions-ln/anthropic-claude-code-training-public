import { merchantById } from "@/data/merchants"
import { Payment, PaymentFilters } from "@/data/types"
import { formatMoney } from "./money"

/**
 * CSV export for the payments table.
 *
 * Ops chooses the columns and the scope (NWP-101). Column names and scope
 * arrive from the client, so they are checked against an allowlist here
 * before they reach the query builder, the file, or the filename.
 */

export const EXPORT_COLUMNS = [
  "id",
  "created_at",
  "merchant",
  "description",
  "status",
  "method",
  "card_brand",
  "last4",
  "amount",
  "currency",
] as const

export type ExportColumn = (typeof EXPORT_COLUMNS)[number]

/** What a file contains when ops has not chosen: everything but the card last four. */
export const DEFAULT_EXPORT_COLUMNS: readonly ExportColumn[] =
  EXPORT_COLUMNS.filter((column) => column !== "last4")

export const EXPORT_SCOPES = ["current", "all"] as const
export type ExportScope = (typeof EXPORT_SCOPES)[number]

type Parsed<T> = { ok: true; value: T } | { ok: false; error: string }

function isExportColumn(value: string): value is ExportColumn {
  return (EXPORT_COLUMNS as readonly string[]).includes(value)
}

/**
 * Reads `columns` (comma separated, or repeated) against the allowlist.
 * Absent means the defaults. Present but empty, or naming a column that does
 * not exist, is rejected: an empty file or a guessed column is worse than an error.
 * Duplicates are dropped; the requested order is kept.
 */
export function parseExportColumns(
  params: URLSearchParams,
): Parsed<ExportColumn[]> {
  if (!params.has("columns"))
    return { ok: true, value: [...DEFAULT_EXPORT_COLUMNS] }

  const requested = params
    .getAll("columns")
    .flatMap((value) => value.split(","))
    .map((value) => value.trim())
    .filter(Boolean)

  if (requested.length === 0) {
    return { ok: false, error: "Choose at least one column to export." }
  }
  if (!requested.every(isExportColumn)) {
    return {
      ok: false,
      error: "One or more export columns are not recognised.",
    }
  }
  return { ok: true, value: [...new Set(requested)] }
}

/** `current` (the default) honours the active filters; `all` ignores them. */
export function parseExportScope(value: string | null): Parsed<ExportScope> {
  if (value === null || value === "") return { ok: true, value: "current" }
  if ((EXPORT_SCOPES as readonly string[]).includes(value)) {
    return { ok: true, value: value as ExportScope }
  }
  return { ok: false, error: "Scope must be current or all." }
}

/**
 * The filename's scope segment. Built only from values the server has already
 * validated (the scope, an allowlisted status, a merchant id that exists), never
 * from free text like the search box.
 */
export function exportScopeLabel(
  scope: ExportScope,
  filters: PaymentFilters,
): string {
  if (scope === "all") return "all"
  const parts: string[] = []
  if (filters.status && filters.status !== "all") parts.push(filters.status)
  if (filters.merchantId && merchantById(filters.merchantId))
    parts.push(filters.merchantId)
  if (parts.length > 0) return parts.join("-")
  return filters.search || filters.merchantId || filters.from || filters.to
    ? "filtered"
    : "all"
}

function escapeCell(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

function cell(payment: Payment, column: ExportColumn): string {
  switch (column) {
    case "id":
      return payment.id
    case "created_at":
      return payment.createdAt
    case "merchant":
      return merchantById(payment.merchantId)?.name ?? payment.merchantId
    case "description":
      return payment.description
    case "status":
      return payment.status
    case "method":
      return payment.method
    case "card_brand":
      return payment.cardBrand ?? ""
    case "last4":
      return payment.last4 ?? ""
    case "amount":
      return formatMoney(payment.amount, payment.currency)
    case "currency":
      return payment.currency
  }
}

export function toCsv(
  payments: Payment[],
  columns: readonly ExportColumn[] = EXPORT_COLUMNS,
): string {
  const header = columns.join(",")
  const rows = payments.map((payment) =>
    columns.map((column) => escapeCell(cell(payment, column))).join(","),
  )
  return [header, ...rows].join("\n")
}

/** `payments-<label>-YYYY-MM-DD.csv`, UTC date. A label that is not a plain slug is dropped. */
export function exportFilename(date = new Date(), label?: string): string {
  const day = date.toISOString().slice(0, 10)
  const safe = label && /^[a-z0-9_-]+$/.test(label) ? `${label}-` : ""
  return `payments-${safe}${day}.csv`
}
