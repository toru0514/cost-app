import { describe, expect, it } from "vitest"

import { buildBulkSyncDiff } from "./diff"
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

describe("buildBulkSyncDiff", () => {
  it("creates diff for create/update/delete", () => {
    const normalized: NormalizedPayload = {
      ...normalizedBase,
      materials: [
        {
          entity: "materials",
          id: "mat-1",
          naturalKey: "コットン",
          isDeleted: false,
          data: { name: "コットン", unit_cost: 100 },
        },
        {
          entity: "materials",
          id: "mat-del",
          naturalKey: "削除対象",
          isDeleted: true,
          data: { name: "削除対象" },
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
          unitCost: 80,
          unitsPerBatch: 1,
          supplier: "",
          note: "",
        },
        {
          id: "mat-del",
          name: "削除対象",
          unit: "m",
          sizeDescription: "",
          currency: "JPY",
          unitCost: 50,
          unitsPerBatch: 1,
          supplier: "",
          note: "",
        },
      ],
    }

    const result = buildBulkSyncDiff(normalized, existing, [])
    const update = result.items.find((item) => item.operation === "update")
    const deletion = result.items.find((item) => item.operation === "delete")

    expect(update).toBeTruthy()
    expect(deletion).toBeTruthy()
    expect(result.summary.update).toBe(1)
    expect(result.summary.delete).toBe(1)
  })

  it("detects clear when sheet value is blank", () => {
    const normalized: NormalizedPayload = {
      ...normalizedBase,
      materials: [
        {
          entity: "materials",
          id: "mat-1",
          naturalKey: "コットン",
          isDeleted: false,
          data: { name: "コットン" },
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
          unitCost: 80,
          unitsPerBatch: 1,
          supplier: "",
          note: "メモあり",
        },
      ],
    }

    const result = buildBulkSyncDiff(normalized, existing, [])
    expect(result.summary.update).toBe(1)
  })

  it("keeps issues even when there is no diff", () => {
    const normalized: NormalizedPayload = {
      ...normalizedBase,
      materials: [
        {
          entity: "materials",
          id: "mat-1",
          naturalKey: "コットン",
          isDeleted: false,
          data: {
            name: "コットン",
            unit: "m",
            size_description: "",
            currency: "JPY",
            unit_cost: 100,
            units_per_batch: 1,
            supplier: "",
            note: "",
          },
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
          supplier: "",
          note: "",
        },
      ],
    }

    const result = buildBulkSyncDiff(normalized, existing, [
      {
        entity: "materials",
        key: "mat-1",
        message: "テスト警告",
        severity: "warning",
      },
    ])

    expect(result.items.length).toBe(1)
    expect(result.items[0].issueOnly).toBe(true)
    expect(result.summary.total).toBe(0)
  })
})
