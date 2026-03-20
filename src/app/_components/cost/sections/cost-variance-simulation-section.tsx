"use client"

import { useMemo, useState } from "react"

import RestartAltIcon from "@mui/icons-material/RestartAlt"
import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import Paper from "@mui/material/Paper"
import Table from "@mui/material/Table"
import TableBody from "@mui/material/TableBody"
import TableCell from "@mui/material/TableCell"
import TableContainer from "@mui/material/TableContainer"
import TableHead from "@mui/material/TableHead"
import TableRow from "@mui/material/TableRow"
import TextField from "@mui/material/TextField"
import Typography from "@mui/material/Typography"
import { simulateProductCosts, formatCurrency, type CostVarianceRates } from "@/lib/calculations"
import type { AppData } from "@/lib/types"

interface CostVarianceSimulationSectionProps {
  data: AppData
  exchangeRateMap?: Map<string, number>
}

const defaultRates: CostVarianceRates = {
  material: 1,
  packaging: 1,
  labor: 1,
  outsourcing: 1,
  development: 1,
  equipment: 1,
  logistics: 1,
  electricity: 1,
  fees: 1,
}

const rateLabels: { key: keyof CostVarianceRates; label: string }[] = [
  { key: "material", label: "材料費" },
  { key: "packaging", label: "梱包費" },
  { key: "labor", label: "人件費" },
  { key: "outsourcing", label: "外注費" },
  { key: "development", label: "開発費" },
  { key: "equipment", label: "設備費" },
  { key: "logistics", label: "物流費" },
  { key: "electricity", label: "電気代" },
  { key: "fees", label: "手数料" },
]

export function CostVarianceSimulationSection({ data, exchangeRateMap }: CostVarianceSimulationSectionProps) {
  const [rates, setRates] = useState<CostVarianceRates>(defaultRates)

  const updateRate = (key: keyof CostVarianceRates, percentChange: number) => {
    setRates((prev) => ({
      ...prev,
      [key]: 1 + percentChange / 100,
    }))
  }

  const resetRates = () => {
    setRates(defaultRates)
  }

  const simulationResults = useMemo(() => {
    return data.products.map((product) => ({
      product,
      simulation: simulateProductCosts(product.id, data, rates, exchangeRateMap),
    }))
  }, [data, rates, exchangeRateMap])

  const formatDiff = (value: number) => {
    if (value === 0) return "-"
    const sign = value >= 0 ? "+" : ""
    return `${sign}${formatCurrency(value)}`
  }

  const getPercentValue = (rate: number | undefined): number => {
    return Math.round(((rate ?? 1) - 1) * 100)
  }

  const hasChanges = Object.values(rates).some((r) => r !== 1)

  // 全体合計の計算
  const totals = useMemo(() => {
    return simulationResults.reduce(
      (acc, { simulation }) => ({
        originalTotal: acc.originalTotal + simulation.original.total,
        simulatedTotal: acc.simulatedTotal + simulation.simulated.total,
        diffTotal: acc.diffTotal + simulation.diff.total,
      }),
      { originalTotal: 0, simulatedTotal: 0, diffTotal: 0 }
    )
  }, [simulationResults])

  const getDiffColor = (value: number) => {
    if (value > 0) return "error.main"
    if (value < 0) return "success.main"
    return undefined
  }

  return (
    <Paper variant="outlined" sx={{ p: 2, minWidth: 0 }}>
      <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: 1, mb: 1.5 }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            原価変動シミュレーション
          </Typography>
          <Typography variant="body2" color="text.secondary">
            各コスト項目の変動率を入力し、原価への影響を確認できます。
          </Typography>
        </Box>
        {hasChanges && (
          <Button variant="outlined" size="small" onClick={resetRates} startIcon={<RestartAltIcon />}>
            リセット
          </Button>
        )}
      </Box>

      {data.products.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          商品が登録されると試算できます。
        </Typography>
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {/* 変動率入力フォーム */}
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1.5 }}>
              変動率設定 (%)
            </Typography>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "repeat(2, 1fr)",
                  sm: "repeat(3, 1fr)",
                  md: "repeat(5, 1fr)",
                  lg: "repeat(9, 1fr)",
                },
                gap: 1.5,
              }}
            >
              {rateLabels.map(({ key, label }) => (
                <Box key={key}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
                    {label}
                  </Typography>
                  <TextField
                    type="number"
                    size="small"
                    fullWidth
                    value={getPercentValue(rates[key])}
                    onChange={(e) => {
                      const val = e.target.value
                      updateRate(key, val === "" ? 0 : Number(val))
                    }}
                    inputProps={{ min: -100, max: 1000 }}
                    placeholder="0"
                  />
                </Box>
              ))}
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
              正の値で増加、負の値で減少（例: 10 = 10%増、-5 = 5%減）
            </Typography>
          </Paper>

          {/* シミュレーション結果テーブル */}
          <TableContainer sx={{ maxWidth: "100%", overflowX: "auto" }}>
            <Table size="small" sx={{ minWidth: "max-content" }}>
              <TableHead>
                <TableRow sx={{ bgcolor: "action.hover" }}>
                  <TableCell sx={{ fontWeight: 600 }}>商品名</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>現行原価</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>変動後原価</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>差額</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>変動率</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>販売価格</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>変動後利益率</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {simulationResults.map(({ product, simulation }) => {
                  const salePrice = product.salePrice ?? 0
                  const originalMargin =
                    salePrice > 0 ? ((salePrice - simulation.original.total) / salePrice) * 100 : 0
                  const simulatedMargin =
                    salePrice > 0 ? ((salePrice - simulation.simulated.total) / salePrice) * 100 : 0
                  const changePercent =
                    simulation.original.total > 0
                      ? ((simulation.simulated.total - simulation.original.total) / simulation.original.total) * 100
                      : 0

                  return (
                    <TableRow key={product.id}>
                      <TableCell sx={{ fontWeight: 500 }}>{product.name}</TableCell>
                      <TableCell align="right">{formatCurrency(simulation.original.total)}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>
                        {formatCurrency(simulation.simulated.total)}
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{ color: getDiffColor(simulation.diff.total) }}
                      >
                        {formatDiff(simulation.diff.total)}
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{ color: getDiffColor(changePercent) }}
                      >
                        {changePercent !== 0 ? `${changePercent >= 0 ? "+" : ""}${changePercent.toFixed(1)}%` : "-"}
                      </TableCell>
                      <TableCell align="right">{formatCurrency(salePrice)}</TableCell>
                      <TableCell align="right">
                        <Box
                          component="span"
                          sx={{
                            color:
                              simulatedMargin < originalMargin
                                ? "error.main"
                                : simulatedMargin > originalMargin
                                  ? "success.main"
                                  : undefined,
                          }}
                        >
                          {salePrice > 0 ? `${simulatedMargin.toFixed(1)}%` : "-"}
                        </Box>
                        {salePrice > 0 && simulatedMargin !== originalMargin && (
                          <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                            ({originalMargin.toFixed(1)}%)
                          </Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
                {/* 合計行 */}
                <TableRow sx={{ bgcolor: "action.hover", "& td": { fontWeight: 600 } }}>
                  <TableCell>合計</TableCell>
                  <TableCell align="right">{formatCurrency(totals.originalTotal)}</TableCell>
                  <TableCell align="right">{formatCurrency(totals.simulatedTotal)}</TableCell>
                  <TableCell
                    align="right"
                    sx={{ color: getDiffColor(totals.diffTotal) }}
                  >
                    {formatDiff(totals.diffTotal)}
                  </TableCell>
                  <TableCell align="right">
                    {totals.originalTotal > 0
                      ? `${((totals.simulatedTotal - totals.originalTotal) / totals.originalTotal * 100) >= 0 ? "+" : ""}${(
                          ((totals.simulatedTotal - totals.originalTotal) / totals.originalTotal) *
                          100
                        ).toFixed(1)}%`
                      : "-"}
                  </TableCell>
                  <TableCell align="right">-</TableCell>
                  <TableCell align="right">-</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>

          {/* 項目別内訳（変動がある場合のみ表示） */}
          {hasChanges && simulationResults.length > 0 && (
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1.5 }}>
                項目別影響額（全商品合計）
              </Typography>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "repeat(2, 1fr)",
                    sm: "repeat(3, 1fr)",
                    md: "repeat(5, 1fr)",
                  },
                  gap: 1,
                  fontSize: "0.875rem",
                }}
              >
                {rateLabels.map(({ key, label }) => {
                  const totalDiff = simulationResults.reduce(
                    (sum, { simulation }) => sum + simulation.diff[key],
                    0
                  )
                  if (totalDiff === 0) return null
                  return (
                    <Box
                      key={key}
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        borderRadius: 1,
                        bgcolor: "action.hover",
                        p: 1,
                      }}
                    >
                      <Typography variant="body2" color="text.secondary">
                        {label}
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          color: totalDiff > 0 ? "error.main" : "success.main",
                        }}
                      >
                        {formatDiff(totalDiff)}
                      </Typography>
                    </Box>
                  )
                })}
              </Box>
            </Paper>
          )}
        </Box>
      )}
    </Paper>
  )
}
