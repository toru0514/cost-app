"use client"

import { useMemo, useState } from "react"

import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import FormControl from "@mui/material/FormControl"
import IconButton from "@mui/material/IconButton"
import InputLabel from "@mui/material/InputLabel"
import MenuItem from "@mui/material/MenuItem"
import Paper from "@mui/material/Paper"
import Select from "@mui/material/Select"
import Table from "@mui/material/Table"
import TableBody from "@mui/material/TableBody"
import TableCell from "@mui/material/TableCell"
import TableContainer from "@mui/material/TableContainer"
import TableHead from "@mui/material/TableHead"
import TableRow from "@mui/material/TableRow"
import TableSortLabel from "@mui/material/TableSortLabel"
import Typography from "@mui/material/Typography"
import ExpandLess from "@mui/icons-material/ExpandLess"
import ExpandMore from "@mui/icons-material/ExpandMore"

import { MuiTablePagination } from "@/app/_components/cost/mui/table-pagination"
import {
  MuiSearchWithScope,
  filterRowsBySearch,
  useSearchWithScope,
  type SearchField,
} from "@/app/_components/cost/mui/search-with-scope"
import { useTablePagination } from "@/hooks/use-table-pagination"
import { formatCurrency } from "@/lib/calculations"
import type { AppData } from "@/lib/types"

interface MaterialCostSectionProps {
  data: AppData
}

type SortKey = "product" | "detail" | "amount"
type SortDirection = "asc" | "desc"

export function MaterialCostSection({ data }: MaterialCostSectionProps) {
  const [materialDetailOpen, setMaterialDetailOpen] = useState(true)
  const [materialSummaryOpen, setMaterialSummaryOpen] = useState(true)
  const [productFilter, setProductFilter] = useState("all")
  const [materialFilter, setMaterialFilter] = useState("all")
  const [sortKey, setSortKey] = useState<SortKey>("product")
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")
  const [summaryProductFilter, setSummaryProductFilter] = useState("all")
  const [summarySortDirection, setSummarySortDirection] = useState<SortDirection>("desc")

  const detailSearchFields: SearchField[] = useMemo(
    () => [
      { key: "productName", label: "商品名" },
      { key: "materialName", label: "材料名" },
    ],
    []
  )
  const detailSearch = useSearchWithScope(detailSearchFields)

  const sortLabelMap: Record<SortKey, string> = {
    product: "商品名",
    detail: "内容",
    amount: "金額",
  }

  const baseRows = useMemo(() => {
    return data.costEntries.materials.map((entry) => {
      const productName = data.products.find((product) => product.id === entry.productId)?.name ?? "未設定"
      const materialName = data.materials.find((m) => m.id === entry.materialId)?.name ?? "-"
      const amountValue = entry.costPerUnit
      return {
        product: productName,
        materialName,
        detail: materialName,
        amount: formatCurrency(amountValue, entry.currency),
        amountValue,
      }
    })
  }, [data])

  const productOptions = useMemo(() => {
    const collator = new Intl.Collator("ja-JP")
    return Array.from(new Set(baseRows.map((row) => row.product))).sort((a, b) => collator.compare(a, b))
  }, [baseRows])

  const materialOptions = useMemo(() => {
    const collator = new Intl.Collator("ja-JP")
    return Array.from(new Set(baseRows.map((row) => row.materialName))).sort((a, b) => collator.compare(a, b))
  }, [baseRows])

  const rows = useMemo(() => {
    const collator = new Intl.Collator("ja-JP")

    const filtered = baseRows.filter((row) => {
      const productHit = productFilter === "all" || row.product === productFilter
      const materialHit = materialFilter === "all" || row.materialName === materialFilter
      return productHit && materialHit
    })

    return filtered.sort((a, b) => {
      const direction = sortDirection === "asc" ? 1 : -1
      if (sortKey === "amount") {
        return (a.amountValue - b.amountValue) * direction
      }
      if (sortKey === "detail") {
        return collator.compare(a.detail, b.detail) * direction
      }
      return collator.compare(a.product, b.product) * direction
    })
  }, [baseRows, materialFilter, productFilter, sortDirection, sortKey])

  const searchableDetailRows = useMemo(
    () => rows.map((row, i) => ({ _index: i, productName: row.product, materialName: row.materialName })),
    [rows]
  )

  const searchFilteredRows = useMemo(() => {
    const filtered = filterRowsBySearch(
      searchableDetailRows,
      detailSearch.query,
      detailSearch.checkedFields,
      detailSearch.allFieldKeys
    )
    const filteredIndices = new Set(filtered.map((r) => r._index as number))
    return rows.filter((_, i) => filteredIndices.has(i))
  }, [rows, searchableDetailRows, detailSearch.query, detailSearch.checkedFields, detailSearch.allFieldKeys])

  const detailPagination = useTablePagination(searchFilteredRows)

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((prevDirection) => (prevDirection === "asc" ? "desc" : "asc"))
      return
    }
    setSortKey(key)
    setSortDirection("asc")
  }

  const summaryRows = useMemo(() => {
    const collator = new Intl.Collator("ja-JP")
    const grouped = new Map<string, { product: string; items: Map<string, { amountValue: number; currency: string }> }>()

    data.costEntries.materials.forEach((entry) => {
      const productName = data.products.find((product) => product.id === entry.productId)?.name ?? "未設定"
      const materialName = data.materials.find((m) => m.id === entry.materialId)?.name ?? "-"
      const amountValue = entry.costPerUnit
      const productKey = `${entry.productId}:${productName}`
      if (!grouped.has(productKey)) {
        grouped.set(productKey, { product: productName, items: new Map() })
      }
      const current = grouped.get(productKey)
      if (!current) return
      const prev = current.items.get(materialName)
      current.items.set(materialName, {
        amountValue: (prev?.amountValue ?? 0) + amountValue,
        currency: prev?.currency ?? entry.currency,
      })
    })

    const summaries = Array.from(grouped.values()).map((group) => {
      const details = Array.from(group.items.entries())
        .sort((a, b) => collator.compare(a[0], b[0]))
        .map(([itemName, value]) => ({
          text: `${itemName}: ${formatCurrency(value.amountValue, value.currency)}`,
          amountValue: value.amountValue,
          currency: value.currency,
        }))
      const totalValue = details.reduce((sum, detail) => sum + detail.amountValue, 0)
      const totalCurrency = details[0]?.currency ?? "JPY"
      return {
        product: group.product,
        details,
        totalValue,
        totalText: formatCurrency(totalValue, totalCurrency),
      }
    })

    const filtered = summaries.filter((row) => summaryProductFilter === "all" || row.product === summaryProductFilter)

    return filtered.sort((a, b) => {
      const direction = summarySortDirection === "asc" ? 1 : -1
      return (a.totalValue - b.totalValue) * direction
    })
  }, [data, summaryProductFilter, summarySortDirection])

  const summaryPagination = useTablePagination(summaryRows)

  const renderSectionToggle = (isOpen: boolean, toggle: () => void, title: string, description: string) => (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        cursor: "pointer",
        userSelect: "none",
        borderRadius: 1,
        px: 1,
        py: 0.5,
        "&:hover": { bgcolor: "action.hover" },
      }}
      role="button"
      tabIndex={0}
      aria-expanded={isOpen}
      onClick={toggle}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          toggle()
        }
      }}
    >
      <Box>
        <Typography variant="h6" fontWeight={600}>
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {description}
        </Typography>
      </Box>
      <IconButton size="small" aria-hidden="true" sx={{ pointerEvents: "none" }}>
        {isOpen ? <ExpandLess /> : <ExpandMore />}
      </IconButton>
    </Box>
  )

  return (
    <Box sx={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
      <Paper variant="outlined" sx={{ minWidth: 0, p: 2, display: "flex", flexDirection: "column", gap: 1.5 }}>
        {renderSectionToggle(
          materialDetailOpen,
          () => setMaterialDetailOpen((prev) => !prev),
          "材料費",
          "材料の使用コスト"
        )}
        {materialDetailOpen && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            <Box sx={{ display: "grid", gap: 1, gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" } }}>
              <FormControl size="small" fullWidth>
                <InputLabel>商品名で絞り込み</InputLabel>
                <Select
                  value={productFilter}
                  label="商品名で絞り込み"
                  onChange={(e) => setProductFilter(e.target.value)}
                >
                  <MenuItem value="all">商品: すべて</MenuItem>
                  {productOptions.map((product) => (
                    <MenuItem key={`product-filter-${product}`} value={product}>
                      {product}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" fullWidth>
                <InputLabel>材料名で絞り込み</InputLabel>
                <Select
                  value={materialFilter}
                  label="材料名で絞り込み"
                  onChange={(e) => setMaterialFilter(e.target.value)}
                >
                  <MenuItem value="all">材料: すべて</MenuItem>
                  {materialOptions.map((material) => (
                    <MenuItem key={`material-filter-${material}`} value={material}>
                      {material}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            <MuiSearchWithScope
              fields={detailSearchFields}
              query={detailSearch.query}
              onQueryChange={detailSearch.setQuery}
              checkedFields={detailSearch.checkedFields}
              onCheckedFieldsChange={detailSearch.setCheckedFields}
              placeholder="材料費を検索..."
            />
            <Typography variant="caption" color="text.secondary">
              並び順: {sortLabelMap[sortKey]}（{sortDirection === "asc" ? "昇順" : "降順"}）
              {(productFilter !== "all" || materialFilter !== "all") &&
                ` / フィルター: 商品「${productFilter === "all" ? "未指定" : productFilter}」、材料「${materialFilter === "all" ? "未指定" : materialFilter}」`}
            </Typography>
            {searchFilteredRows.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                条件に一致するデータがありません。
              </Typography>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>
                        <TableSortLabel
                          active={sortKey === "product"}
                          direction={sortKey === "product" ? sortDirection : "asc"}
                          onClick={() => toggleSort("product")}
                        >
                          商品
                        </TableSortLabel>
                      </TableCell>
                      <TableCell>
                        <TableSortLabel
                          active={sortKey === "detail"}
                          direction={sortKey === "detail" ? sortDirection : "asc"}
                          onClick={() => toggleSort("detail")}
                        >
                          内容
                        </TableSortLabel>
                      </TableCell>
                      <TableCell align="right">
                        <TableSortLabel
                          active={sortKey === "amount"}
                          direction={sortKey === "amount" ? sortDirection : "asc"}
                          onClick={() => toggleSort("amount")}
                        >
                          金額
                        </TableSortLabel>
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {detailPagination.pagedRows.map((row, index) => (
                      <TableRow key={`${row.product}-${row.materialName}-${index}`}>
                        <TableCell>{row.product}</TableCell>
                        <TableCell>{row.detail}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 500 }}>
                          {row.amount}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <MuiTablePagination
                  currentPage={detailPagination.currentPage}
                  totalPages={detailPagination.totalPages}
                  onPageChange={detailPagination.onPageChange}
                />
              </TableContainer>
            )}
          </Box>
        )}
      </Paper>

      <Paper variant="outlined" sx={{ minWidth: 0, p: 2, display: "flex", flexDirection: "column", gap: 1.5 }}>
        {renderSectionToggle(
          materialSummaryOpen,
          () => setMaterialSummaryOpen((prev) => !prev),
          "商品別材料費合計",
          "商品ごとの材料費内訳と合計"
        )}
        {materialSummaryOpen && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            <Box sx={{ display: "flex", flexDirection: { xs: "column", md: "row" }, alignItems: { md: "center" }, gap: 1 }}>
              <FormControl size="small" sx={{ minWidth: { md: 200 } }}>
                <InputLabel>商品名で絞り込み</InputLabel>
                <Select
                  value={summaryProductFilter}
                  label="商品名で絞り込み"
                  onChange={(e) => setSummaryProductFilter(e.target.value)}
                >
                  <MenuItem value="all">商品: すべて</MenuItem>
                  {productOptions.map((product) => (
                    <MenuItem key={`summary-product-filter-${product}`} value={product}>
                      {product}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Button
                variant="text"
                size="small"
                onClick={() => setSummarySortDirection((prev) => (prev === "asc" ? "desc" : "asc"))}
                sx={{ textTransform: "none", textAlign: { xs: "left", md: "right" } }}
              >
                合計で並び替え（{summarySortDirection === "asc" ? "昇順" : "降順"}）
              </Button>
            </Box>
            <Typography variant="caption" color="text.secondary">
              並び順: 合計（{summarySortDirection === "asc" ? "昇順" : "降順"}）
              {summaryProductFilter !== "all" && ` / フィルター: 商品「${summaryProductFilter}」`}
            </Typography>
            {summaryRows.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                条件に一致するデータがありません。
              </Typography>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>商品</TableCell>
                      <TableCell>内訳</TableCell>
                      <TableCell align="right">合計</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {summaryPagination.pagedRows.map((row, index) => (
                      <TableRow key={`${row.product}-${index}`}>
                        <TableCell sx={{ fontWeight: 500 }}>{row.product}</TableCell>
                        <TableCell>{row.details.map((detail) => detail.text).join(" | ")}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>
                          {row.totalText}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <MuiTablePagination
                  currentPage={summaryPagination.currentPage}
                  totalPages={summaryPagination.totalPages}
                  onPageChange={summaryPagination.onPageChange}
                />
              </TableContainer>
            )}
          </Box>
        )}
      </Paper>
    </Box>
  )
}
