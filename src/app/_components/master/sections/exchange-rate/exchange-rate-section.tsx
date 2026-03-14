"use client"

import { useCallback, useEffect, useState } from "react"
import { Trash2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NumberInput } from "@/components/ui/number-input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { currencyOptions } from "@/lib/constants"
import { supabaseClient } from "@/lib/supabase-client"
import type { ExchangeRate } from "@/lib/types"
import { FormSection, type FormSectionOpenSignal } from "../../../shared/ui"

interface ExchangeRateSectionProps {
  isAuthenticated: boolean
  openSignal?: FormSectionOpenSignal | null
  onRefreshExchangeRates?: () => Promise<void>
  onOpen?: () => void
  onClose?: () => void
}

const INITIAL_FORM: Omit<ExchangeRate, "id"> = {
  fromCurrency: "USD",
  toCurrency: "JPY",
  rate: 150,
  effectiveDate: new Date().toISOString().slice(0, 10),
  note: "",
}

export function ExchangeRateSection({ isAuthenticated, openSignal, onRefreshExchangeRates, onOpen, onClose }: ExchangeRateSectionProps) {
  const [form, setForm] = useState<Omit<ExchangeRate, "id">>(INITIAL_FORM)
  const [rates, setRates] = useState<ExchangeRate[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const loadRates = useCallback(async () => {
    if (!isAuthenticated) return
    setLoading(true)
    try {
      const { data, error } = await supabaseClient
        .from("exchange_rates")
        .select("*")
        .order("effective_date", { ascending: false })

      if (error) throw error
      setRates(
        (data ?? []).map((row) => ({
          id: row.id,
          fromCurrency: row.from_currency,
          toCurrency: row.to_currency,
          rate: Number(row.rate),
          effectiveDate: row.effective_date,
          note: row.note ?? undefined,
        }))
      )
    } catch (error) {
      console.error("Failed to load exchange rates", error)
      toast.error("為替レートの読み込みに失敗しました")
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated])

  useEffect(() => {
    loadRates()
  }, [loadRates])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting || !isAuthenticated) return
    if (form.rate <= 0) {
      toast.error("レートは0より大きい値を入力してください")
      return
    }
    setSubmitting(true)
    try {
      const { error } = await supabaseClient.from("exchange_rates").upsert(
        {
          from_currency: form.fromCurrency,
          to_currency: form.toCurrency,
          rate: form.rate,
          effective_date: form.effectiveDate,
          note: form.note || null,
        },
        { onConflict: "user_id,from_currency,to_currency,effective_date" }
      )
      if (error) throw error
      toast.success("為替レートを登録しました")
      setForm(INITIAL_FORM)
      await loadRates()
      void onRefreshExchangeRates?.()
    } catch (error) {
      console.error("Failed to save exchange rate", error)
      toast.error("為替レートの保存に失敗しました")
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!isAuthenticated) return
    try {
      const { error } = await supabaseClient.from("exchange_rates").delete().eq("id", id)
      if (error) throw error
      toast.success("為替レートを削除しました")
      setRates((prev) => prev.filter((r) => r.id !== id))
      void onRefreshExchangeRates?.()
    } catch (error) {
      console.error("Failed to delete exchange rate", error)
      toast.error("為替レートの削除に失敗しました")
    }
  }

  if (!isAuthenticated) {
    return (
      <FormSection
        title="為替レートマスタ"
        description="外貨金額を日本円に換算するためのレートを設定します。"
        storageKey="master-section-exchange-rate"
        openSignal={openSignal}
        onOpen={onOpen}
        onClose={onClose}
      >
        <p className="text-sm text-muted-foreground">
          為替レート管理はログイン中のみ利用できます。
        </p>
      </FormSection>
    )
  }

  return (
    <FormSection
      title="為替レートマスタ"
      description="外貨金額を日本円に換算するためのレートを設定します。"
      storageKey="master-section-exchange-rate"
      openSignal={openSignal}
      onOpen={onOpen}
      onClose={onClose}
    >
      <div className="space-y-4">
        <form className="grid gap-3" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">変換元通貨</Label>
              <Select
                value={form.fromCurrency}
                onValueChange={(value) => setForm((prev) => ({ ...prev, fromCurrency: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="通貨を選択" />
                </SelectTrigger>
                <SelectContent>
                  {currencyOptions.filter((c) => c !== "JPY").map((currency) => (
                    <SelectItem key={currency} value={currency}>
                      {currency}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">レート (1{form.fromCurrency} = X円)</Label>
              <NumberInput
                placeholder="例: 150"
                value={form.rate}
                enableCommaSeparator
                onValueChange={(next) => setForm((prev) => ({ ...prev, rate: next === "" ? 0 : next }))}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">適用日</Label>
              <Input
                type="date"
                value={form.effectiveDate}
                onChange={(e) => setForm((prev) => ({ ...prev, effectiveDate: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">備考</Label>
              <Input
                placeholder="例: 2024年平均レート"
                value={form.note ?? ""}
                onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button type="submit" size="sm" disabled={submitting}>
              登録
            </Button>
          </div>
        </form>

        <div className="space-y-2">
          <p className="text-sm font-medium">登録済み為替レート</p>
          {loading ? (
            <p className="text-sm text-muted-foreground">読み込み中...</p>
          ) : rates.length === 0 ? (
            <p className="text-sm text-muted-foreground">為替レートがまだ登録されていません。</p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>通貨</TableHead>
                    <TableHead>レート</TableHead>
                    <TableHead>適用日</TableHead>
                    <TableHead>備考</TableHead>
                    <TableHead className="w-[60px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rates.map((rate) => (
                    <TableRow key={rate.id}>
                      <TableCell className="font-medium">{rate.fromCurrency} → {rate.toCurrency}</TableCell>
                      <TableCell>{rate.rate.toLocaleString()}</TableCell>
                      <TableCell>{rate.effectiveDate}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{rate.note ?? "-"}</TableCell>
                      <TableCell>
                        <button
                          type="button"
                          className="rounded p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
                          onClick={() => handleDelete(rate.id)}
                          title="削除"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
    </FormSection>
  )
}
