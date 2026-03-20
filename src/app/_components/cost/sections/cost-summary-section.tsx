"use client"

import { useMemo } from "react"

import Table from "@mui/material/Table"
import TableBody from "@mui/material/TableBody"
import TableCell from "@mui/material/TableCell"
import TableContainer from "@mui/material/TableContainer"
import TableHead from "@mui/material/TableHead"
import TableRow from "@mui/material/TableRow"
import TableSortLabel from "@mui/material/TableSortLabel"
import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"
import Paper from "@mui/material/Paper"
import Grid from "@mui/material/Grid"

import { MuiTablePagination } from "@/app/_components/cost/mui/table-pagination"
import { MuiTableToolbar } from "@/app/_components/cost/mui/table-toolbar"
import {
  filterRowsBySearch,
  useSearchWithScope,
  type SearchField,
} from "@/app/_components/cost/mui/search-with-scope"
import { useTablePagination } from "@/hooks/use-table-pagination"
import { calculateProductUnitCosts, calculateEffectiveProfitRate, buildTimeRecordIndex, formatCurrency } from "@/lib/calculations"
import type { AppData } from "@/lib/types"
import { useTableSort, type SortOption } from "@/hooks/use-table-sort"

interface CostSummarySectionProps {
  data: AppData
  exchangeRateMap?: Map<string, number>
}

export function CostSummarySection({ data, exchangeRateMap }: CostSummarySectionProps) {

  const searchFields: SearchField[] = useMemo(
    () => [
      { key: "productName", label: "商品名" },
      { key: "detailText", label: "内容" },
    ],
    []
  )
  const { query, setQuery, checkedFields, setCheckedFields, allFieldKeys } = useSearchWithScope(searchFields)

  const timeRecordIdx = useMemo(() => buildTimeRecordIndex(data), [data])

  const allRows = useMemo(() => {
    return data.products.map((product) => {
      const costs = calculateProductUnitCosts(product.id, data, exchangeRateMap)
      const effectiveResult = calculateEffectiveProfitRate(product.id, data, exchangeRateMap, costs, timeRecordIdx)
      const detailText = [
        `材料 ${formatCurrency(costs.material)}`,
        `梱包 ${formatCurrency(costs.packaging)}`,
        `人件費 ${formatCurrency(costs.labor)}`,
        `外注 ${formatCurrency(costs.outsourcing)}`,
        `開発 ${formatCurrency(costs.development)}`,
        `設備 ${formatCurrency(costs.equipment)}`,
        `物流 ${formatCurrency(costs.logistics)}`,
        `電気 ${formatCurrency(costs.electricity)}`,
        `手数料 ${formatCurrency(costs.fees)}`,
      ].join(" / ")
      return { product, costs, effectiveResult, detailText, productName: product.name }
    })
  }, [data, exchangeRateMap])

  const filteredRows = useMemo(
    () => filterRowsBySearch(allRows, query, checkedFields, allFieldKeys),
    [allRows, query, checkedFields, allFieldKeys]
  )

  const costSortOptions = useMemo<SortOption<(typeof filteredRows)[number]>[]>(() => [
    { key: "product", label: "商品名", compareFn: (a, b) => new Intl.Collator("ja-JP").compare(a.product.name, b.product.name) },
    { key: "detail", label: "内容", compareFn: (a, b) => new Intl.Collator("ja-JP").compare(a.detailText, b.detailText) },
    { key: "amount", label: "金額", compareFn: (a, b) => a.costs.total - b.costs.total },
  ], [])

  const { sortedItems: productSummaries, sortKey, sortDirection, setSortKey, setSortDirection, toggleSort, sortOptions: costSortOpts } = useTableSort(filteredRows, costSortOptions, "product", "asc")

  const pagination = useTablePagination(productSummaries)

  return (
    <Box component="section" sx={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 1.5 }}>
      <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: 1 }}>
        <Box>
          <Typography variant="h6" fontWeight={600}>原価サマリ</Typography>
          <Typography variant="body2" color="text.secondary">カテゴリ別の積み上げと合計を確認できます。</Typography>
        </Box>
      </Box>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
        <MuiTableToolbar
          search={{
            fields: searchFields,
            query,
            onQueryChange: setQuery,
            checkedFields,
            onCheckedFieldsChange: setCheckedFields,
            placeholder: "キーワードで絞り込み",
          }}
          sort={{
            sortKey,
            sortDirection,
            setSortKey,
            setSortDirection,
            sortOptions: costSortOpts,
          }}
        />
        {productSummaries.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            {data.products.length === 0 ? "まだ原価計算対象の商品がありません。" : "条件に一致する商品がありません。"}
          </Typography>
        ) : (
          <Box sx={{ position: "relative", width: "100%", minWidth: 0, maxWidth: "100%", overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
            <TableContainer>
              <Table size="small" className="cost-summary-table" sx={{ width: "auto", minWidth: "max-content" }}>
                <TableHead>
                  <TableRow sx={{ backgroundColor: "action.hover" }}>
                    <TableCell sx={{ fontWeight: 600 }}>
                      <TableSortLabel
                        active={sortKey === "product"}
                        direction={sortKey === "product" ? (sortDirection as "asc" | "desc") : "asc"}
                        onClick={() => toggleSort("product")}
                      >
                        商品
                      </TableSortLabel>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>材料</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>梱包</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>人件費</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>外注</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>開発</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>設備</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>物流</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>電気</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>手数料</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>
                      <TableSortLabel
                        active={sortKey === "amount"}
                        direction={sortKey === "amount" ? (sortDirection as "asc" | "desc") : "asc"}
                        onClick={() => toggleSort("amount")}
                      >
                        合計
                      </TableSortLabel>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>実質利益率</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>実質時給</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pagination.pagedRows.map(({ product, costs, effectiveResult }) => (
                    <TableRow key={product.id}>
                      <TableCell sx={{ fontWeight: 500 }}>{product.name}</TableCell>
                      <TableCell>{formatCurrency(costs.material)}</TableCell>
                      <TableCell>{formatCurrency(costs.packaging)}</TableCell>
                      <TableCell>{formatCurrency(costs.labor)}</TableCell>
                      <TableCell>{formatCurrency(costs.outsourcing)}</TableCell>
                      <TableCell>{formatCurrency(costs.development)}</TableCell>
                      <TableCell>{formatCurrency(costs.equipment)}</TableCell>
                      <TableCell>{formatCurrency(costs.logistics)}</TableCell>
                      <TableCell>{formatCurrency(costs.electricity)}</TableCell>
                      <TableCell>{formatCurrency(costs.fees)}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{formatCurrency(costs.total)}</TableCell>
                      <TableCell>
                        {effectiveResult.minRecordCount > 0 && effectiveResult.effectiveProfitRate != null
                          ? `${effectiveResult.effectiveProfitRate.toFixed(1)}%`
                          : <Typography variant="body2" color="text.secondary" component="span">-</Typography>}
                      </TableCell>
                      <TableCell>
                        {effectiveResult.minRecordCount > 0
                          ? formatCurrency(effectiveResult.effectiveHourlyRate ?? 0)
                          : <Typography variant="body2" color="text.secondary" component="span">-</Typography>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <MuiTablePagination currentPage={pagination.currentPage} totalPages={pagination.totalPages} onPageChange={pagination.onPageChange} />
          </Box>
        )}

        {/* 実績ベース詳細 */}
        {pagination.pagedRows.some((row) => row.effectiveResult.minRecordCount > 0) && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Typography variant="h6" fontWeight={600} sx={{ fontSize: "1.125rem" }}>実績ベース詳細</Typography>
            {pagination.pagedRows
              .filter((row) => row.effectiveResult.minRecordCount > 0)
              .map(({ product, effectiveResult }) => (
                <Paper key={product.id} variant="outlined" sx={{ p: 2, display: "flex", flexDirection: "column", gap: 1 }}>
                  <Typography variant="body2" fontWeight={500}>{product.name} - 実績ベース</Typography>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 6, sm: 3 }}>
                      <Typography variant="caption" color="text.secondary">実質利益率</Typography>
                      <Typography variant="h6" fontWeight={600}>
                        {effectiveResult.effectiveProfitRate != null ? `${effectiveResult.effectiveProfitRate.toFixed(1)}%` : "-"}
                      </Typography>
                    </Grid>
                    <Grid size={{ xs: 6, sm: 3 }}>
                      <Typography variant="caption" color="text.secondary">実質時給</Typography>
                      <Typography variant="h6" fontWeight={600}>
                        {formatCurrency(effectiveResult.effectiveHourlyRate ?? 0)}
                      </Typography>
                    </Grid>
                    <Grid size={{ xs: 6, sm: 3 }}>
                      <Typography variant="caption" color="text.secondary">実績人件費</Typography>
                      <Typography variant="h6" fontWeight={600}>
                        {formatCurrency(effectiveResult.actualLaborCost)}
                      </Typography>
                    </Grid>
                    <Grid size={{ xs: 6, sm: 3 }}>
                      <Typography variant="caption" color="text.secondary">実績合計時間</Typography>
                      <Typography variant="h6" fontWeight={600}>
                        {effectiveResult.actualTotalHours.toFixed(1)}h
                      </Typography>
                    </Grid>
                  </Grid>
                  {effectiveResult.actualLaborByProcess.length > 0 && (
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="caption" fontWeight={500} color="text.secondary" sx={{ mb: 0.5, display: "block" }}>工程別実績</Typography>
                      <Grid container spacing={0.5}>
                        {effectiveResult.actualLaborByProcess.map((proc) => (
                          <Grid key={proc.processId} size={{ xs: 12, sm: 6, lg: 4 }}>
                            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", bgcolor: "action.hover", borderRadius: 1, px: 1, py: 0.5 }}>
                              <Typography variant="caption">{proc.processName}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                {proc.avgMinutes.toFixed(1)}分 / {formatCurrency(proc.cost)} ({proc.recordCount}回)
                              </Typography>
                            </Box>
                          </Grid>
                        ))}
                      </Grid>
                    </Box>
                  )}
                </Paper>
              ))}
          </Box>
        )}
      </Box>
    </Box>
  )
}
