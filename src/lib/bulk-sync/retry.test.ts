import { describe, expect, it } from "vitest"

import { retry } from "./retry"

describe("retry", () => {
  it("retries and succeeds", async () => {
    let calls = 0
    const result = await retry(
      async () => {
        calls += 1
        if (calls < 3) throw new Error("fail")
        return "ok"
      },
      { retries: 2, delayMs: 0 }
    )

    expect(result).toBe("ok")
    expect(calls).toBe(3)
  })

  it("throws after retries", async () => {
    let calls = 0
    await expect(
      retry(
        async () => {
          calls += 1
          throw new Error("fail")
        },
        { retries: 1, delayMs: 0 }
      )
    ).rejects.toThrow("fail")
    expect(calls).toBe(2)
  })

  it("invokes onRetry", async () => {
    const attempts: number[] = []
    await expect(
      retry(
        async () => {
          throw new Error("fail")
        },
        {
          retries: 1,
          delayMs: 0,
          onRetry: (attempt) => attempts.push(attempt),
        }
      )
    ).rejects.toThrow("fail")

    expect(attempts).toEqual([1])
  })
})
