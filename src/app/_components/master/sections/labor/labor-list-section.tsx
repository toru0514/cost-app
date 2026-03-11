"use client"

import { useState } from "react"

import { Copy, Edit3 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { NumberInput } from "@/components/ui/number-input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import type { AppActions } from "@/lib/app-data"
import { formatCurrency } from "@/lib/calculations"
import { currencyOptions } from "@/lib/constants"
import type { AppData, LaborRole } from "@/lib/types"
import { toast } from "sonner"

interface LaborListSectionProps {
  data: AppData
  actions: AppActions
  createTempId: () => string
}

export function LaborListSection({ data, actions, createTempId }: LaborListSectionProps) {
  const [editingLabor, setEditingLabor] = useState<Omit<LaborRole, "id"> & { id: string | null }>({
    id: null,
    name: "",
    hourlyRate: 1800,
    currency: "JPY",
    note: "",
  })

  const { updateLaborRole, removeLaborRole, addLaborRole } = actions

  const resetLabor = () => setEditingLabor({ id: null, name: "", hourlyRate: 1800, currency: "JPY", note: "" })

  const renderActionButtons = (onSave: () => void, onCancel: () => void, onDelete?: () => void) => (
    <div className="flex gap-2">
      <Button type="button" size="sm" onClick={onSave}>
        保存
      </Button>
      {onDelete && (
        <Button type="button" size="sm" variant="destructive" onClick={onDelete}>
          削除
        </Button>
      )}
      <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
        キャンセル
      </Button>
    </div>
  )

  const handleLaborSave = () => {
    const { id, ...rest } = editingLabor
    if (!id) return
    const name = editingLabor.name.trim()
    if (!name) return
    updateLaborRole({ id, ...rest, name })
    toast.success("人件費レートを更新しました", {
      description: `${name} / ${formatCurrency(editingLabor.hourlyRate, editingLabor.currency)}`,
    })
    resetLabor()
  }

  const handleLaborDelete = () => {
    const { id } = editingLabor
    if (!id) return
    const name = editingLabor.name.trim() || "人件費レート"
    removeLaborRole(id)
    toast.success("人件費レートを削除しました", { description: `「${name}」を削除しました。` })
    resetLabor()
  }

  const handleLaborCopy = (role: LaborRole) => {
    const newId = createTempId()
    const name = `${role.name} (コピー)`
    addLaborRole({ id: newId, name, hourlyRate: role.hourlyRate, currency: role.currency, note: role.note })
    toast.success("人件費レートをコピーしました", { description: `「${name}」を作成しました。` })
    setEditingLabor({ id: newId, name, hourlyRate: role.hourlyRate, currency: role.currency, note: role.note ?? "" })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>人件費一覧</CardTitle>
      </CardHeader>
      <CardContent>
        {data.laborRoles.length === 0 ? (
          <p className="text-sm text-muted-foreground">まだ登録がありません。</p>
        ) : (
          <div className="relative w-full min-w-0 max-w-full overflow-x-auto overscroll-x-contain touch-pan-x">
            <Table className="min-w-[600px]">
              <TableHeader>
                <TableRow>
                  <TableHead>作業カテゴリ</TableHead>
                  <TableHead>時給</TableHead>
                  <TableHead>備考</TableHead>
                  <TableHead className="w-36 text-right">
                    <span className="sr-only">操作</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.laborRoles.map((role) => {
                  const isEditing = editingLabor.id === role.id
                  return (
                    <TableRow key={role.id}>
                      <TableCell>
                        {isEditing ? (
                          <Input
                            value={editingLabor.name}
                            onChange={(event) => setEditingLabor((prev) => ({ ...prev, name: event.target.value }))}
                          />
                        ) : (
                          role.name
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <div className="flex gap-2">
                            <NumberInput
                              value={editingLabor.hourlyRate}
                              onValueChange={(next) => setEditingLabor((prev) => ({ ...prev, hourlyRate: next === "" ? 0 : next }))}
                            />
                            <Select
                              value={editingLabor.currency}
                              onValueChange={(value) => setEditingLabor((prev) => ({ ...prev, currency: value }))}
                            >
                              <SelectTrigger className="w-24">
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
                        ) : (
                          formatCurrency(role.hourlyRate, role.currency)
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Textarea
                            value={editingLabor.note ?? ""}
                            onChange={(event) => setEditingLabor((prev) => ({ ...prev, note: event.target.value }))}
                          />
                        ) : (
                          role.note || "-"
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {isEditing ? (
                          renderActionButtons(handleLaborSave, resetLabor, handleLaborDelete)
                        ) : (
                          <div className="master-row-actions flex items-center justify-end gap-1">
                            <button
                              type="button"
                              className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                              onClick={() =>
                                setEditingLabor({
                                  id: role.id,
                                  name: role.name,
                                  hourlyRate: role.hourlyRate,
                                  currency: role.currency,
                                  note: role.note ?? "",
                                })
                              }
                              title="編集"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                              onClick={() => handleLaborCopy(role)}
                              title="コピー"
                            >
                              <Copy className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
