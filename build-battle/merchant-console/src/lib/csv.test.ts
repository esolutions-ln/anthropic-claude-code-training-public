import { describe, expect, it } from "vitest"
import { Payment } from "@/data/types"
import {
  DEFAULT_EXPORT_COLUMNS,
  EXPORT_COLUMNS,
  exportFilename,
  exportScopeLabel,
  parseExportColumns,
  parseExportScope,
  toCsv,
} from "./csv"

/**
 * The export is the file ops hands to a merchant, so a broken cell is a
 * support ticket rather than a stack trace. These tests pin the escaping and
 * the column contract; NWP-101 changes which columns ship, not how a cell is
 * written, and these should still pass afterwards.
 */

const payment: Payment = {
  id: "pay_0001",
  merchantId: "mch_01",
  amount: 25000,
  currency: "USD",
  status: "captured",
  method: "card",
  cardBrand: "visa",
  last4: "4242",
  createdAt: "2026-03-14T10:15:00.000Z",
  description: "Order 1180",
}

describe("toCsv", () => {
  it("writes a header row followed by one row per payment", () => {
    const lines = toCsv([payment]).split("\n")
    expect(lines).toHaveLength(2)
    expect(lines[0]).toBe(EXPORT_COLUMNS.join(","))
  })

  it("writes only the requested columns, in the order given", () => {
    expect(toCsv([payment], ["id", "amount"])).toBe(
      ["id,amount", "pay_0001,$250.00"].join("\n"),
    )
  })

  it("quotes cells containing a comma, so amounts do not split", () => {
    const large = { ...payment, amount: 123456789 }
    expect(toCsv([large], ["amount"])).toBe(
      ["amount", '"$1,234,567.89"'].join("\n"),
    )
  })

  it("doubles embedded quotes rather than dropping them", () => {
    const quoted = { ...payment, description: 'Order "rush"' }
    expect(toCsv([quoted], ["description"])).toBe(
      ["description", '"Order ""rush"""'].join("\n"),
    )
  })

  it("keeps a newline inside a description in one quoted cell", () => {
    const multiline = { ...payment, description: "Order 1180\nsecond line" }
    const body = toCsv([multiline], ["description"])
      .split("\n")
      .slice(1)
      .join("\n")
    expect(body).toBe('"Order 1180\nsecond line"')
  })

  it("resolves the merchant name, and falls back to the id when unknown", () => {
    expect(toCsv([payment], ["merchant"])).toContain("Lumen Coffee Roasters")
    const orphan = { ...payment, merchantId: "mch_missing" }
    expect(toCsv([orphan], ["merchant"])).toContain("mch_missing")
  })

  it("writes an empty cell for a payment with no card", () => {
    const bank: Payment = {
      ...payment,
      method: "bank_transfer",
      cardBrand: null,
      last4: null,
    }
    expect(toCsv([bank], ["card_brand", "last4"])).toBe(
      ["card_brand,last4", ","].join("\n"),
    )
  })

  it("emits a header even with no rows", () => {
    expect(toCsv([], ["id"])).toBe("id")
  })
})

describe("exportFilename", () => {
  it("stamps the UTC date, so two exports on the same day collide by design", () => {
    expect(exportFilename(new Date("2026-03-14T23:00:00.000Z"))).toBe(
      "payments-2026-03-14.csv",
    )
  })
})

describe("column selection (NWP-101)", () => {
  const columnsFrom = (query: string) =>
    parseExportColumns(new URLSearchParams(query))

  it("writes a requested subset in the requested order, not the default order", () => {
    const parsed = columnsFrom("columns=amount,id,currency")
    expect(parsed).toEqual({ ok: true, value: ["amount", "id", "currency"] })
    if (!parsed.ok) return
    expect(toCsv([payment], parsed.value)).toBe(
      ["amount,id,currency", "$250.00,pay_0001,USD"].join("\n"),
    )
  })

  it("accepts repeated params and drops duplicates, keeping first position", () => {
    expect(columnsFrom("columns=amount&columns=id,amount")).toEqual({
      ok: true,
      value: ["amount", "id"],
    })
  })

  it("excludes the card last four by default", () => {
    const parsed = columnsFrom("")
    expect(parsed.ok && parsed.value).toEqual([...DEFAULT_EXPORT_COLUMNS])
    expect(DEFAULT_EXPORT_COLUMNS).not.toContain("last4")
    expect(DEFAULT_EXPORT_COLUMNS).toEqual(
      EXPORT_COLUMNS.filter((column) => column !== "last4"),
    )
    if (!parsed.ok) return
    const csv = toCsv([payment], parsed.value)
    expect(csv.split("\n")[0]).not.toContain("last4")
    expect(csv).not.toContain("4242")
  })

  it("keeps amount and currency as separate columns by default", () => {
    expect(DEFAULT_EXPORT_COLUMNS).toContain("amount")
    expect(DEFAULT_EXPORT_COLUMNS).toContain("currency")
  })

  it("rejects an empty selection rather than producing an empty file", () => {
    for (const query of ["columns=", "columns=,,", "columns=%20"]) {
      const parsed = columnsFrom(query)
      expect(parsed.ok).toBe(false)
      if (!parsed.ok) expect(parsed.error).toMatch(/at least one column/i)
    }
  })

  it("rejects column names outside the allowlist without echoing them", () => {
    const parsed = columnsFrom("columns=id,amount;DROP TABLE payments")
    expect(parsed.ok).toBe(false)
    if (!parsed.ok) expect(parsed.error).not.toContain("DROP")
  })
})

describe("export scope (NWP-101)", () => {
  it("defaults to the current filter and accepts only current or all", () => {
    expect(parseExportScope(null)).toEqual({ ok: true, value: "current" })
    expect(parseExportScope("all")).toEqual({ ok: true, value: "all" })
    expect(parseExportScope("everything").ok).toBe(false)
  })

  it("labels the filename from validated values only", () => {
    expect(exportScopeLabel("all", { status: "disputed" })).toBe("all")
    expect(exportScopeLabel("current", { status: "disputed" })).toBe("disputed")
    expect(
      exportScopeLabel("current", { status: "all", merchantId: "mch_01" }),
    ).toBe("mch_01")
    expect(exportScopeLabel("current", { merchantId: "../../etc" })).toBe(
      "filtered",
    )
    expect(exportScopeLabel("current", { search: "Robert'); DROP" })).toBe(
      "filtered",
    )
    expect(exportScopeLabel("current", { status: "all" })).toBe("all")
  })

  it("puts the scope and the UTC date in the filename", () => {
    const day = new Date("2026-08-13T23:30:00.000Z")
    expect(exportFilename(day, "disputed")).toBe(
      "payments-disputed-2026-08-13.csv",
    )
    expect(exportFilename(day, 'x"; rm')).toBe("payments-2026-08-13.csv")
  })
})
