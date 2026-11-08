import { filterPayments, parseFilters, sortPayments } from "@/data/queries"
import {
  exportFilename,
  exportScopeLabel,
  parseExportColumns,
  parseExportScope,
  toCsv,
} from "@/lib/csv"
import { NextRequest, NextResponse } from "next/server"

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 })
}

/**
 * Exports payments as CSV (NWP-101).
 *
 * Columns and scope come from the client and are validated against allowlists
 * before anything else runs. Rows always come from the shared query builder,
 * unpaginated, so "current filter" means every matching row, not one page.
 */
export function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams

  const columns = parseExportColumns(params)
  if (!columns.ok) return badRequest(columns.error)

  const scope = parseExportScope(params.get("scope"))
  if (!scope.ok) return badRequest(scope.error)

  // "all" drops the filters but keeps the ordering the user was looking at.
  const filterParams =
    scope.value === "all"
      ? new URLSearchParams(
          [...params].filter(([key]) => key === "sort" || key === "direction"),
        )
      : params
  const filters = parseFilters(filterParams)

  const rows = sortPayments(
    filterPayments(filters),
    filters.sort,
    filters.direction,
  )
  const filename = exportFilename(
    new Date(),
    exportScopeLabel(scope.value, filters),
  )

  return new Response(toCsv(rows, columns.value), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
    },
  })
}
