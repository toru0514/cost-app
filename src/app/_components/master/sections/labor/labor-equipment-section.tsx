"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NumberInput } from "@/components/ui/number-input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type { AppActions } from "@/lib/app-data"
import { formatCurrency } from "@/lib/calculations"
import { currencyOptions } from "@/lib/constants"
import type { AppData, Equipment, LaborRole } from "@/lib/types"
import { FieldHint, FormSection, RegisteredList, type FormSectionOpenSignal } from "../../../shared/ui"

interface LaborEquipmentSectionProps {
  data: AppData
  actions: AppActions
  openSignal?: FormSectionOpenSignal | null
  onOpen?: () => void
}

const INITIAL_LABOR_FORM: Omit<LaborRole, "id"> = {
  name: "",
  hourlyRate: 1800,
  currency: "JPY",
  note: "",
}

const INITIAL_EQUIPMENT_FORM: Omit<Equipment, "id"> = {
  name: "",
  acquisitionCost: 0,
  currency: "JPY",
  amortizationYears: 5,
  utilizationRate: 100,
  note: "",
}

export function LaborEquipmentSection({ data, actions, openSignal, onOpen }: LaborEquipmentSectionProps) {
  const [laborForm, setLaborForm] = useState<Omit<LaborRole, "id">>(INITIAL_LABOR_FORM)
  const [equipmentForm, setEquipmentForm] = useState<Omit<Equipment, "id">>(INITIAL_EQUIPMENT_FORM)
  const { addLaborRole, addEquipment } = actions

  return (
    <FormSection
      title="人件費 / 設備マスタ"
      description="工数と時給、設備投資のベースをまとめて管理します。"
      storageKey="master-section-labor-equipment"
      openSignal={openSignal}
      onOpen={onOpen}
    >
      <div className="grid gap-6 md:grid-cols-2">
        <form
          className="grid gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            if (!laborForm.name.trim()) return
            addLaborRole({ ...laborForm })
            setLaborForm(INITIAL_LABOR_FORM)
          }}
        >
          <Label className="text-sm font-semibold">人件費</Label>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">作業カテゴリ</Label>
            <Input
              placeholder="例: 裁断"
              value={laborForm.name}
              onChange={(event) => setLaborForm((prev) => ({ ...prev, name: event.target.value }))}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">時給</Label>
              <NumberInput
                placeholder="例: 1800"
                value={laborForm.hourlyRate}
                onValueChange={(next) => setLaborForm((prev) => ({ ...prev, hourlyRate: next === "" ? 0 : next }))}
              />
              <FieldHint>1時間あたりの標準人件費。原価計算で材料/人数と掛け合わせます。</FieldHint>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">通貨</Label>
              <Select value={laborForm.currency} onValueChange={(value) => setLaborForm((prev) => ({ ...prev, currency: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="通貨" />
                </SelectTrigger>
                <SelectContent>
                  {currencyOptions.map((currency) => (
                    <SelectItem key={currency} value={currency}>
                      {currency}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">備考</Label>
            <Textarea
              placeholder="例: 外部スタッフ"
              value={laborForm.note}
              onChange={(event) => setLaborForm((prev) => ({ ...prev, note: event.target.value }))}
            />
          </div>
          <div className="flex justify-end pt-2">
            <Button type="submit" size="sm">
              人件費を追加
            </Button>
          </div>

          <RegisteredList
            title="登録済み 人件費"
            items={data.laborRoles.map((role) => `${role.name} / ${formatCurrency(role.hourlyRate, role.currency)} / ${role.note || "備考なし"}`)}
          />
        </form>

        <form
          className="grid gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            if (!equipmentForm.name.trim()) return
            addEquipment({ ...equipmentForm })
            setEquipmentForm(INITIAL_EQUIPMENT_FORM)
          }}
        >
          <Label className="text-sm font-semibold">設備投資</Label>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">設備名</Label>
            <Input
              placeholder="例: 工業用ミシン"
              value={equipmentForm.name}
              onChange={(event) => setEquipmentForm((prev) => ({ ...prev, name: event.target.value }))}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">取得額</Label>
              <NumberInput
                placeholder="例: 400000"
                value={equipmentForm.acquisitionCost}
                onValueChange={(next) => setEquipmentForm((prev) => ({ ...prev, acquisitionCost: next === "" ? 0 : next }))}
              />
              <FieldHint>設備購入（またはリース）にかかった初期費用。</FieldHint>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">償却年数</Label>
              <NumberInput
                placeholder="例: 5"
                value={equipmentForm.amortizationYears}
                onValueChange={(next) => setEquipmentForm((prev) => ({ ...prev, amortizationYears: next === "" ? 0 : next }))}
              />
              <FieldHint>設備コストを何年に分けて原価化するか。耐用年数の目安を入力。</FieldHint>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">設備使用率 (%)</Label>
            <NumberInput
              placeholder="例: 50"
              value={equipmentForm.utilizationRate ?? 100}
              onValueChange={(next) =>
                setEquipmentForm((prev) => ({ ...prev, utilizationRate: next === "" ? 0 : Math.min(Math.max(Number(next), 0), 100) }))
              }
              min={0}
              max={100}
            />
            <FieldHint>この製品群で使う割合。半分だけ使うなら50%など。</FieldHint>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">通貨</Label>
            <Select value={equipmentForm.currency} onValueChange={(value) => setEquipmentForm((prev) => ({ ...prev, currency: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="通貨" />
              </SelectTrigger>
              <SelectContent>
                {currencyOptions.map((currency) => (
                  <SelectItem key={currency} value={currency}>
                    {currency}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">備考</Label>
            <Textarea
              placeholder="例: リース"
              value={equipmentForm.note}
              onChange={(event) => setEquipmentForm((prev) => ({ ...prev, note: event.target.value }))}
            />
          </div>
          <div className="flex justify-end pt-2">
            <Button type="submit" size="sm">
              設備を追加
            </Button>
          </div>

          <RegisteredList
            title="登録済み 設備"
            items={data.equipments.map(
              (equipment) =>
                `${equipment.name} / ${formatCurrency(equipment.acquisitionCost, equipment.currency)} / ${equipment.amortizationYears}年 / 利用率${equipment.utilizationRate ?? 100}%`
            )}
          />
        </form>
      </div>
    </FormSection>
  )
}
