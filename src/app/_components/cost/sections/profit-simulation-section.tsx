"use client"

import { useMemo, useState } from "react"

import Box from "@mui/material/Box"
import Paper from "@mui/material/Paper"
import TextField from "@mui/material/TextField"
import Typography from "@mui/material/Typography"
import { calculateProductUnitCosts, formatCurrency } from "@/lib/calculations"
import type { AppData } from "@/lib/types"

interface ProfitSimulationSectionProps {
  data: AppData
  exchangeRateMap?: Map<string, number>
}

type ProfitSimulationInput = {
  margin: number
  quantity: number
}

const formatMaybeCurrency = (value?: number | null, currency?: string) => {
  if (value === undefined || value === null || !Number.isFinite(value)) {
    return "-"
  }
  return formatCurrency(value, currency)
}

export function ProfitSimulationSection({ data, exchangeRateMap }: ProfitSimulationSectionProps) {
  const [profitSimulations, setProfitSimulations] = useState<Record<string, ProfitSimulationInput>>({})

  const productSummaries = useMemo(() => {
    return data.products.map((product) => ({
      product,
      costs: calculateProductUnitCosts(product.id, data, exchangeRateMap),
    }))
  }, [data, exchangeRateMap])

  const applyProfitSimulationPatch = (
    productId: string,
    fallback: ProfitSimulationInput,
    patch: Partial<ProfitSimulationInput>
  ) => {
    setProfitSimulations((prev) => {
      const current = prev[productId] ?? fallback
      const next = { ...current, ...patch }
      return { ...prev, [productId]: next }
    })
  }

  return (
    <Paper variant="outlined" sx={{ p: 2, minWidth: 0 }}>
      <Box sx={{ mb: 1.5 }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          目標利益率シミュレーション
        </Typography>
        <Typography variant="body2" color="text.secondary">
          目標利益率と販売数量を入力し、必要な販売価格と粗利を逆算します。
        </Typography>
      </Box>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
        {productSummaries.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            商品が登録されると試算できます。
          </Typography>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {productSummaries.map(({ product, costs }) => {
              const unitCost = costs.total ?? 0
              const currentSalePrice = Number(product.salePrice ?? 0)
              const currentMargin =
                currentSalePrice > 0 ? ((currentSalePrice - unitCost) / currentSalePrice) * 100 : 0
              const defaultInputs: ProfitSimulationInput = {
                margin: Number.isFinite(currentMargin) && currentMargin > 0 ? Number(currentMargin.toFixed(1)) : 30,
                quantity: product.expectedProduction.quantity || product.productionLotSize || 1000,
              }
              const simulation = profitSimulations[product.id] ?? defaultInputs
              const targetMargin = Math.max(0, Number(simulation.margin) || 0)
              const plannedQuantity = Math.max(0, Number(simulation.quantity) || 0)
              const cappedMargin = Math.min(targetMargin, 99.9)
              const marginRatio = cappedMargin / 100
              const canCompute = cappedMargin < 100
              const requiredSalePrice = canCompute ? unitCost / Math.max(1 - marginRatio, 0.0001) : null
              const targetRevenue = requiredSalePrice !== null ? requiredSalePrice * plannedQuantity : null
              const totalCostAtQuantity = unitCost * plannedQuantity
              const targetProfit = requiredSalePrice !== null ? targetRevenue! - totalCostAtQuantity : null
              const profitPerUnit = requiredSalePrice !== null ? requiredSalePrice - unitCost : null
              const salePriceGap = requiredSalePrice !== null ? requiredSalePrice - currentSalePrice : null
              const marginGap = targetMargin - currentMargin

              return (
                <Paper key={`profit-sim-${product.id}`} variant="outlined" sx={{ p: 2, display: "flex", flexDirection: "column", gap: 2 }}>
                  <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: 1.5 }}>
                    <Box>
                      <Typography variant="body1" sx={{ fontWeight: 600 }}>
                        {product.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        原価 {formatCurrency(unitCost)} / 現行販売価格 {formatCurrency(currentSalePrice)}
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: "right" }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                        現行利益率: {currentSalePrice > 0 ? `${currentMargin.toFixed(1)}%` : "-"}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                        現行粗利: {formatCurrency(currentSalePrice - unitCost)}
                      </Typography>
                    </Box>
                  </Box>
                  <Box
                    sx={{
                      display: "grid",
                      gap: 2,
                      gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" },
                    }}
                  >
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
                          目標利益率 (%)
                        </Typography>
                        <TextField
                          type="number"
                          size="small"
                          fullWidth
                          value={simulation.margin}
                          onChange={(e) => {
                            const val = e.target.value
                            applyProfitSimulationPatch(product.id, defaultInputs, {
                              margin: val === "" ? 0 : Number(val),
                            })
                          }}
                          inputProps={{ min: 0, max: 99.9 }}
                        />
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
                          想定販売数量
                        </Typography>
                        <TextField
                          type="number"
                          size="small"
                          fullWidth
                          value={simulation.quantity}
                          onChange={(e) => {
                            const val = e.target.value
                            applyProfitSimulationPatch(product.id, defaultInputs, {
                              quantity: val === "" ? 0 : Number(val),
                            })
                          }}
                          inputProps={{ min: 0 }}
                        />
                      </Box>
                    </Box>
                    <Paper variant="outlined" sx={{ p: 1.5, fontSize: "0.875rem", display: "flex", flexDirection: "column", gap: 0.5 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        逆算結果
                      </Typography>
                      <Typography variant="body2">必要販売価格: {formatMaybeCurrency(requiredSalePrice)}</Typography>
                      <Typography variant="body2">単位粗利: {formatMaybeCurrency(profitPerUnit)}</Typography>
                      <Typography variant="body2">想定売上: {formatMaybeCurrency(targetRevenue)}</Typography>
                      <Typography variant="body2">想定粗利: {formatMaybeCurrency(targetProfit)}</Typography>
                    </Paper>
                    <Paper variant="outlined" sx={{ p: 1.5, fontSize: "0.875rem", display: "flex", flexDirection: "column", gap: 0.5 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        現状との差分
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        販売価格差: {salePriceGap !== null ? `${salePriceGap >= 0 ? "+" : ""}${formatCurrency(salePriceGap)}` : "-"}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        利益率差: {Number.isFinite(marginGap) ? `${marginGap >= 0 ? "+" : ""}${marginGap.toFixed(1)}%` : "-"}
                      </Typography>
                    </Paper>
                  </Box>
                </Paper>
              )
            })}
          </Box>
        )}
      </Box>
    </Paper>
  )
}
