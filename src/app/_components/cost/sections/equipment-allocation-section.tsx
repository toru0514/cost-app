"use client"

import { useMemo } from "react"

import Box from "@mui/material/Box"
import Paper from "@mui/material/Paper"
import Table from "@mui/material/Table"
import TableBody from "@mui/material/TableBody"
import TableCell from "@mui/material/TableCell"
import TableContainer from "@mui/material/TableContainer"
import TableHead from "@mui/material/TableHead"
import TableRow from "@mui/material/TableRow"
import Typography from "@mui/material/Typography"

import { MuiTablePagination } from "@/app/_components/cost/mui/table-pagination"
import { useTablePagination } from "@/hooks/use-table-pagination"
import { formatCurrency } from "@/lib/calculations"
import type { AppData, Equipment } from "@/lib/types"
import {
  MuiSearchWithScope,
  filterRowsBySearch,
  useSearchWithScope,
  type SearchField,
} from "@/app/_components/cost/mui/search-with-scope"

interface CostSectionProps {
  data: AppData
}

export function EquipmentAllocationSection({ data }: CostSectionProps) {
  const equipmentUsageGroups = useMemo(() => {
    const groups = new Map<
      string,
      {
        equipment: Equipment
        totalUsageHours?: number
        entries: {
          productName: string
          allocationRatio: number
          annualQuantity: number
          unitCost: number
          usageHours?: number
        }[]
      }
    >()

    data.costEntries.equipmentAllocations.forEach((entry) => {
      const equipment = data.equipments.find((item) => item.id === entry.equipmentId)
      if (!equipment) return
      const product = data.products.find((item) => item.id === entry.productId)
      const productName = product?.name ?? "未設定"
      const utilizationRate = Math.min(Math.max(equipment.utilizationRate ?? 100, 0), 100) / 100
      const annualCost = (equipment.acquisitionCost / Math.max(equipment.amortizationYears || 1, 1)) * utilizationRate
      const unitCost = (annualCost * entry.allocationRatio) / Math.max(entry.annualQuantity || 1, 1)

      if (!groups.has(equipment.id)) {
        groups.set(equipment.id, { equipment, totalUsageHours: undefined, entries: [] })
      }

      const group = groups.get(equipment.id)!
      if (entry.usageHours !== undefined) {
        group.totalUsageHours = (group.totalUsageHours ?? 0) + entry.usageHours
      }

      group.entries.push({
        productName,
        allocationRatio: entry.allocationRatio,
        annualQuantity: entry.annualQuantity,
        unitCost,
        usageHours: entry.usageHours,
      })
    })

    return Array.from(groups.values())
  }, [data.costEntries.equipmentAllocations, data.equipments, data.products])

  const searchFields: SearchField[] = useMemo(
    () => [{ key: "equipmentName", label: "設備名" }],
    []
  )
  const { query, setQuery, checkedFields, setCheckedFields, allFieldKeys } = useSearchWithScope(searchFields)

  const searchableRows = useMemo(
    () => equipmentUsageGroups.map((g) => ({ id: g.equipment.id, equipmentName: g.equipment.name })),
    [equipmentUsageGroups]
  )

  const filteredGroups = useMemo(() => {
    const filtered = filterRowsBySearch(searchableRows, query, checkedFields, allFieldKeys)
    const filteredIds = new Set(filtered.map((r) => r.id as string))
    return equipmentUsageGroups.filter((g) => filteredIds.has(g.equipment.id))
  }, [equipmentUsageGroups, searchableRows, query, checkedFields, allFieldKeys])

  const pagination = useTablePagination(filteredGroups)

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h6" fontWeight={600}>設備配賦</Typography>
        <Typography variant="body2" color="text.secondary">設備単位での配賦状況</Typography>
      </Box>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
        {equipmentUsageGroups.length === 0 ? (
          <Typography variant="body2" color="text.secondary">まだ設備配賦が登録されていません。</Typography>
        ) : (
          <>
            <MuiSearchWithScope
              fields={searchFields}
              query={query}
              onQueryChange={setQuery}
              checkedFields={checkedFields}
              onCheckedFieldsChange={setCheckedFields}
              placeholder="設備名を検索..."
            />
            {filteredGroups.length === 0 ? (
              <Typography variant="body2" color="text.secondary">条件に一致する設備がありません。</Typography>
            ) : (
              <TableContainer sx={{ borderRadius: 1, border: 1, borderColor: "divider", overflowX: "auto" }}>
                <Table size="small" sx={{ width: "auto", minWidth: "max-content" }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>設備</TableCell>
                      <TableCell>取得額 / 償却年数</TableCell>
                      <TableCell>配賦内訳</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {pagination.pagedRows.map((group) => (
                      <TableRow key={`equipment-group-${group.equipment.id}`}>
                        <TableCell>{group.equipment.name}</TableCell>
                        <TableCell>
                          {(() => {
                            const utilizationRate = Math.min(Math.max(group.equipment.utilizationRate ?? 100, 0), 100)
                            const effectiveCost = (group.equipment.acquisitionCost * utilizationRate) / 100
                            return (
                              <>
                                {formatCurrency(group.equipment.acquisitionCost, group.equipment.currency)} /
                                {group.equipment.amortizationYears}年
                                <Typography variant="caption" color="text.secondary" display="block">
                                  利用率 {utilizationRate}% / 配賦対象額 {formatCurrency(effectiveCost, group.equipment.currency)}
                                </Typography>
                              </>
                            )
                          })()}
                        </TableCell>
                        <TableCell sx={{ fontSize: "0.75rem", color: "text.secondary" }}>
                          {group.entries
                            .map((entry) => {
                              const ratio =
                                group.totalUsageHours && entry.usageHours !== undefined && group.totalUsageHours > 0
                                  ? Math.round((entry.usageHours / group.totalUsageHours) * 100)
                                  : Math.round(entry.allocationRatio * 100)
                              const hoursText = entry.usageHours !== undefined ? `${entry.usageHours.toFixed(2)}h` : "-"
                              return `${entry.productName}: ${ratio}% / ${entry.annualQuantity}個 / ${hoursText} / ${formatCurrency(entry.unitCost, group.equipment.currency)}`
                            })
                            .join(" / ")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <MuiTablePagination currentPage={pagination.currentPage} totalPages={pagination.totalPages} onPageChange={pagination.onPageChange} />
              </TableContainer>
            )}
          </>
        )}
      </Box>
    </Paper>
  )
}
