export type ExchangeRate = {
  id: string
  fromCurrency: string
  toCurrency: string
  rate: number
  effectiveDate: string
  note?: string
}
