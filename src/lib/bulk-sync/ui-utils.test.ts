import { describe, expect, it } from "vitest"

import { parsePayloadJson } from "./ui-utils"

describe("parsePayloadJson", () => {
  it("rejects empty input", () => {
    const result = parsePayloadJson(" ")
    expect(result.payload).toBeNull()
    expect(result.error).toBeDefined()
  })

  it("parses valid json", () => {
    const result = parsePayloadJson('{"materials":[]}')
    expect(result.payload).toEqual({ materials: [] })
  })

  it("rejects invalid json", () => {
    const result = parsePayloadJson("{")
    expect(result.payload).toBeNull()
    expect(result.error).toBeDefined()
  })
})
