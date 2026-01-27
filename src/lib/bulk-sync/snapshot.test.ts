import { describe, expect, it } from "vitest"

import { buildSyncPayloadFromAppData } from "./snapshot"
import { emptyAppData } from "../types"

describe("buildSyncPayloadFromAppData", () => {
  it("marks deleted records compared to previous", () => {
    const previous = {
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
          supplier: "A",
          note: "",
        },
      ],
    }

    const snapshot = {
      ...emptyAppData,
      materials: [],
    }

    const payload = buildSyncPayloadFromAppData(snapshot, previous)
    expect(Array.isArray(payload.materials_deleted)).toBe(true)
    expect(payload.materials_deleted).toHaveLength(1)
  })
})
