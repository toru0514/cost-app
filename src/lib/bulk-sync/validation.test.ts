import { describe, expect, it } from "vitest"

import { validateBulkSyncPayload } from "./validation"
import { emptyAppData } from "../types"

const baseData = {
  ...emptyAppData,
  categories: {
    large: [{ id: "cat-l-1", name: "バッグ", description: "" }],
    medium: [{ id: "cat-m-1", largeId: "cat-l-1", name: "トート", description: "" }],
    small: [{ id: "cat-s-1", mediumId: "cat-m-1", name: "ミニ", description: "" }],
  },
  equipments: [{
    id: "eq-1",
    name: "ミシン",
    acquisitionCost: 1000,
    currency: "JPY",
    amortizationYears: 3,
    utilizationRate: 100,
  }],
}

describe("validateBulkSyncPayload", () => {
  it("flags missing required fields", () => {
    const { issues } = validateBulkSyncPayload(
      {
        products: [{ product_name: "", sale_price: "", base_man_hours: "", expected_quantity: "" }],
      },
      baseData
    )

    const messages = issues.map((issue) => issue.message)
    expect(messages).toContain("product_name は必須です")
    expect(messages).toContain("sale_price は必須の数値です")
    expect(messages).toContain("base_man_hours は必須の数値です")
    expect(messages).toContain("expected_quantity は必須の数値です")
  })

  it("flags duplicate natural keys", () => {
    const { issues } = validateBulkSyncPayload(
      {
        materials: [
          { name: "コットン", supplier: "A" },
          { name: "コットン", supplier: "A" },
        ],
      },
      baseData
    )

    const duplicateIssues = issues.filter((issue) => issue.message.includes("自然キーが重複"))
    expect(duplicateIssues.length).toBeGreaterThan(0)
  })

  it("resolves category references", () => {
    const { issues } = validateBulkSyncPayload(
      {
        products: [
          {
            product_name: "バッグA",
            sale_price: 1000,
            base_man_hours: 1,
            expected_quantity: 10,
            category_large: "バッグ",
            category_medium: "トート",
            category_small: "ミニ",
          },
        ],
      },
      baseData
    )

    const categoryIssues = issues.filter((issue) => issue.field?.startsWith("category"))
    expect(categoryIssues).toHaveLength(0)
  })

  it("flags missing equipment names", () => {
    const { issues } = validateBulkSyncPayload(
      {
        products: [
          {
            product_name: "バッグB",
            sale_price: 1000,
            base_man_hours: 1,
            expected_quantity: 10,
            equipment_names: "存在しない設備",
          },
        ],
      },
      baseData
    )

    expect(issues.some((issue) => issue.message.includes("設備が見つかりません"))).toBe(true)
  })
})
