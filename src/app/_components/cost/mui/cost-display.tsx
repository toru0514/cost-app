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
import TableSortLabel from "@mui/material/TableSortLabel"
import Typography from "@mui/material/Typography"

import { MuiTableToolbar } from "@/app/_components/cost/mui/table-toolbar"
import { MuiTablePagination } from "@/app/_components/cost/mui/table-pagination"
import {
  filterRowsBySearch,
  useSearchWithScope,
  type SearchField,
} from "@/app/_components/cost/mui/search-with-scope"
import { useTableSort, type SortOption } from "@/hooks/use-table-sort"
import { useTablePagination } from "@/hooks/use-table-pagination"

type CostRow = { product: string; detail: string; amount: string }

const costSearchFields: SearchField[] = [
  { key: "product", label: "商品名" },
  { key: "detail", label: "内容" },
]

const costSortOptions: SortOption<CostRow>[] = [
  { key: "product", label: "商品名" },
  { key: "detail", label: "内容" },
  {
    key: "amount",
    label: "金額",
    compareFn: (a, b) => {
      const aVal = Number(a.amount.replace(/[^\d.-]/g, "")) || 0
      const bVal = Number(b.amount.replace(/[^\d.-]/g, "")) || 0
      return aVal - bVal
    },
  },
]

export function MuiCostDisplay({
  title,
  description,
  rows,
}: {
  title: string
  description: string
  rows: CostRow[]
}) {
  const { query, setQuery, checkedFields, setCheckedFields, allFieldKeys } =
    useSearchWithScope(costSearchFields)

  const filteredRows = useMemo(
    () => filterRowsBySearch(rows, query, checkedFields, allFieldKeys),
    [rows, query, checkedFields, allFieldKeys]
  )

  const {
    sortedItems,
    sortKey,
    sortDirection,
    setSortKey,
    setSortDirection,
    toggleSort,
    sortOptions,
  } = useTableSort(filteredRows, costSortOptions, "product", "asc")

  const pagination = useTablePagination(sortedItems)

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h6" fontWeight={600}>
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {description}
        </Typography>
      </Box>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
        <MuiTableToolbar
          search={{
            fields: costSearchFields,
            query,
            onQueryChange: setQuery,
            checkedFields,
            onCheckedFieldsChange: setCheckedFields,
            placeholder: "キーワードで絞り込み",
            resultCount: query.trim() ? filteredRows.length : undefined,
            totalCount: query.trim() ? rows.length : undefined,
          }}
          sort={{
            sortKey,
            sortDirection,
            setSortKey,
            setSortDirection,
            sortOptions,
          }}
        />
        {sortedItems.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            {rows.length === 0 ? "まだデータがありません。" : "条件に一致するデータがありません。"}
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
                {pagination.pagedRows.map((row, index) => (
                  <TableRow key={`${title}-${index}`}>
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
              currentPage={pagination.currentPage}
              totalPages={pagination.totalPages}
              onPageChange={pagination.onPageChange}
            />
          </TableContainer>
        )}
      </Box>
    </Paper>
  )
}
