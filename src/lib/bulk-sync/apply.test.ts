import { describe, expect, it } from "vitest"

import { prepareBulkSyncApply } from "./apply"
import { emptyAppData } from "../types"
import type { NormalizedPayload } from "./types"

const normalizedBase: NormalizedPayload = {
  categories_large: [],
  categories_medium: [],
  categories_small: [],
  materials: [],
  packaging_items: [],
  shipping_methods: [],
  labor_roles: [],
  equipments: [],
  fees: [],
  option_presets: [],
  products: [],
}

describe("prepareBulkSyncApply", () => {
  it("resolves delete by natural key", () => {
    const normalized: NormalizedPayload = {
      ...normalizedBase,
      materials: [
        {
          entity: "materials",
          id: undefined,
          naturalKey: "コットン::Supplier",
          isDeleted: true,
          data: { name: "コットン", supplier: "Supplier" },
        },
      ],
    }

    const existing = {
      ...emptyAppData,
      materials: [
        {
          id: "mat-1",
          name: "コットン",
          unit: "m",
          sizeDescription: "",
          currency: "JPY",
          unitCost: 100,
          unitsPerBatch: 1,
          supplier: "Supplier",
          note: "",
        },
      ],
    }

    const result = prepareBulkSyncApply(normalized, existing, [])
    const deleted = result.payload.materials_deleted as Array<{ id: string }>
    expect(deleted).toHaveLength(1)
    expect(deleted[0].id).toBe("mat-1")
  })

  it("fails when referenced category is missing", () => {
    const normalized: NormalizedPayload = {
      ...normalizedBase,
      products: [
        {
          entity: "products",
          id: undefined,
          naturalKey: "バッグA",
          isDeleted: false,
          data: {
            product_name: "バッグA",
            sale_price: 1000,
            base_man_hours: 1,
            expected_quantity: 10,
            category_large: "存在しない",
          },
        },
      ],
    }

    const result = prepareBulkSyncApply(normalized, emptyAppData, [])
    expect(result.errors.some((error) => error.message.includes("カテゴリ(大)が解決できません"))).toBe(true)
    const products = result.payload.products as Array<unknown>
    expect(products).toHaveLength(0)
  })
})
