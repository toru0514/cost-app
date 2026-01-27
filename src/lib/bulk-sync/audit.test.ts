import { describe, expect, it } from "vitest"

import { buildBulkSyncAuditChanges } from "./audit"
import type { DiffItem } from "./types"
import { emptyAppData } from "../types"

describe("buildBulkSyncAuditChanges", () => {
  it("collects added/updated/removed labels", () => {
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

    const items: DiffItem[] = [
      {
        entity: "materials",
        operation: "update",
        key: { id: "mat-1", naturalKey: "コットン" },
        before: null,
        after: null,
        issues: [],
      },
      {
        entity: "materials",
        operation: "create",
        key: { naturalKey: "リネン" },
        before: null,
        after: null,
        issues: [],
      },
      {
        entity: "materials",
        operation: "delete",
        key: { naturalKey: "削除対象" },
        before: null,
        after: null,
        issues: [],
      },
    ]

    const changes = buildBulkSyncAuditChanges(items, existing)
    expect(changes.materials?.updated).toContain("コットン")
    expect(changes.materials?.added).toContain("リネン")
    expect(changes.materials?.removed).toContain("削除対象")
  })
})
