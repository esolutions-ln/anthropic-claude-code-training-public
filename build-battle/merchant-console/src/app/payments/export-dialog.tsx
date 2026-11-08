"use client"

import { Button } from "@/components/Button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/Dialog"
import type { ExportColumn, ExportScope } from "@/lib/csv"
import { Download } from "lucide-react"
import { useState } from "react"

const LABELS: Record<ExportColumn, string> = {
  id: "Payment ID",
  created_at: "Created (UTC)",
  merchant: "Merchant",
  description: "Description",
  status: "Status",
  method: "Method",
  card_brand: "Card brand",
  last4: "Card last four",
  amount: "Amount",
  currency: "Currency",
}

/**
 * Export options (NWP-101). Builds the URL only; the server validates the
 * columns and scope and runs the query, so every matching row is exported,
 * not just the page on screen.
 */
export function ExportDialog({
  query,
  columns,
  defaultColumns,
  currentCount,
  allCount,
}: {
  /** The active filters, as the table's own query string. */
  query: string
  columns: readonly ExportColumn[]
  defaultColumns: readonly ExportColumn[]
  currentCount: number
  allCount: number
}) {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<Set<ExportColumn>>(
    () => new Set(defaultColumns),
  )
  const [scope, setScope] = useState<ExportScope>("current")

  const onOpenChange = (next: boolean) => {
    if (next) {
      setSelected(new Set(defaultColumns))
      setScope("current")
    }
    setOpen(next)
  }

  const toggle = (column: ExportColumn) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(column)) next.delete(column)
      else next.add(column)
      return next
    })

  const ordered = columns.filter((column) => selected.has(column))
  const rowCount = scope === "all" ? allCount : currentCount

  const params = new URLSearchParams(query)
  params.delete("page")
  params.set("scope", scope)
  params.set("columns", ordered.join(","))
  const href = `/api/payments/export?${params.toString()}`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="secondary" className="w-full gap-2 py-1.5 sm:w-fit">
          <Download
            className="-ml-0.5 size-4 shrink-0 text-gray-400 dark:text-gray-600"
            aria-hidden="true"
          />
          Export
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export payments</DialogTitle>
          <DialogDescription>
            Choose what goes in the CSV. Card last four is off by default.
          </DialogDescription>
        </DialogHeader>

        <fieldset className="mt-6">
          <legend className="text-sm font-medium text-gray-900 dark:text-gray-50">
            Scope
          </legend>
          <div className="mt-2 flex flex-col gap-2">
            {(
              [
                ["current", "Current filter", currentCount],
                ["all", "All payments", allCount],
              ] as const
            ).map(([value, label, count]) => (
              <label
                key={value}
                className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
              >
                <input
                  type="radio"
                  name="export-scope"
                  value={value}
                  checked={scope === value}
                  onChange={() => setScope(value)}
                  className="size-4 accent-blue-500"
                />
                {label}
                <span className="tabular-nums text-gray-500">
                  ({count.toLocaleString()} rows)
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="mt-6">
          <legend className="text-sm font-medium text-gray-900 dark:text-gray-50">
            Columns
          </legend>
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {columns.map((column) => (
              <label
                key={column}
                className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
              >
                <input
                  type="checkbox"
                  checked={selected.has(column)}
                  onChange={() => toggle(column)}
                  className="size-4 accent-blue-500"
                />
                {LABELS[column]}
              </label>
            ))}
          </div>
        </fieldset>

        <p className="mt-6 text-sm text-gray-500" aria-live="polite">
          {ordered.length === 0
            ? "Select at least one column to download."
            : `${rowCount.toLocaleString()} rows · ${ordered.length} columns`}
        </p>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary" className="py-1.5">
              Cancel
            </Button>
          </DialogClose>
          {ordered.length === 0 ? (
            <Button className="gap-2 py-1.5" disabled>
              <Download className="size-4" aria-hidden="true" />
              Download CSV
            </Button>
          ) : (
            <Button className="gap-2 py-1.5" asChild>
              <a href={href} download onClick={() => setOpen(false)}>
                <Download className="size-4" aria-hidden="true" />
                Download CSV
              </a>
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
