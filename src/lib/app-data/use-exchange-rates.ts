"use client"

import { useCallback, useState } from "react"
import type { AuthState } from "../auth"
import { supabaseClient } from "../supabase-client"
import type { ExchangeRate } from "../types"

export function useExchangeRates(authState: AuthState) {
  const [exchangeRates, setExchangeRates] = useState<ExchangeRate[]>([])
  const [exchangeRatesLoaded, setExchangeRatesLoaded] = useState(false)

  const refreshExchangeRates = useCallback(async () => {
    if (authState.status !== "authenticated") return
    try {
      const { data, error } = await supabaseClient
        .from("exchange_rates")
        .select("*")
        .order("effective_date", { ascending: false })

      if (error) throw error
      setExchangeRates(
        (data ?? []).map((row) => ({
          id: row.id,
          fromCurrency: row.from_currency,
          toCurrency: row.to_currency,
          rate: Number(row.rate),
          effectiveDate: row.effective_date,
          note: row.note ?? undefined,
        }))
      )
      setExchangeRatesLoaded(true)
    } catch (error) {
      console.error("Failed to load exchange rates", error)
    }
  }, [authState])

  const resetExchangeRateState = useCallback(() => {
    setExchangeRates([])
    setExchangeRatesLoaded(false)
  }, [])

  return {
    exchangeRates,
    exchangeRatesLoaded,
    refreshExchangeRates,
    resetExchangeRateState,
  }
}
