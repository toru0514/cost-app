export type RetryOptions = {
  retries: number
  delayMs: number
  factor?: number
  onRetry?: (attempt: number, error: unknown) => void
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export const retry = async <T>(fn: (attempt: number) => Promise<T>, options: RetryOptions): Promise<T> => {
  const { retries, delayMs, factor = 2, onRetry } = options
  let attempt = 0

  while (attempt <= retries) {
    try {
      return await fn(attempt + 1)
    } catch (error) {
      if (attempt >= retries) throw error
      onRetry?.(attempt + 1, error)
      const delay = Math.max(0, Math.round(delayMs * Math.pow(factor, attempt)))
      if (delay > 0) {
        await wait(delay)
      }
      attempt += 1
    }
  }

  throw new Error("retry failed")
}
