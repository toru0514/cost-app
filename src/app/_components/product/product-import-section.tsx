"use client"

import { type ChangeEvent, useMemo, useRef, useState } from "react"

import Papa from "papaparse"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { AppActions } from "@/lib/app-data"
import { supabaseClient } from "@/lib/supabase-client"
import type { AppData, Product } from "@/lib/types"

type ImportRowStatus = "ready" | "needs_mapping" | "invalid"

type ProductImportRow = {
  id: string
  lineNumber: number
  status: ImportRowStatus
  issues: string[]
  parsed: PreparedProductImport | null
}

type PreparedProductImport = {
  name: string
  salePrice: number
  baseManHours: number
  expectedProduction: {
    periodYears: number
    quantity: number
  }
  notes?: string
  categoryLargeId?: string
  categoryMediumId?: string
  categorySmallId?: string
  categoryLabel: string
  sizeVariants: Product["sizeVariants"]
}

type ImportHistoryEntry = {
  id: string
  timestamp: string
  totalRows: number
  readyRows: number
  message: string
}

const CSV_COLUMNS = [
  { key: "product_name", label: "商品名", required: true, sample: "ハンドバッグA" },
  { key: "category_large", label: "カテゴリ(大)", required: false, sample: "バッグ" },
  { key: "category_medium", label: "カテゴリ(中)", required: false, sample: "トート" },
  { key: "category_small", label: "カテゴリ(小)", required: false, sample: "ビジネス" },
  { key: "sale_price", label: "販売価格", required: true, sample: "19800" },
  { key: "base_man_hours", label: "工数(時間)", required: true, sample: "2" },
  { key: "expected_period_years", label: "想定期間(年)", required: false, sample: "1" },
  { key: "expected_quantity", label: "想定生産数", required: true, sample: "1000" },
  { key: "size_variants", label: "サイズ/バリエーション(JSON)", required: false, sample: "[{\"label\":\"M\",\"quantity\":500}]" },
  { key: "notes", label: "備考", required: false, sample: "定番色" },
]

const STEP_DESCRIPTIONS = [
  {
    key: "template",
    label: "テンプレート定義",
    description: "CSV列と入力ルールを確認し、テンプレートを配布",
  },
  {
    key: "upload",
    label: "CSVアップロード",
    description: "シートから書き出したCSVを読み込み",
  },
  {
    key: "validation",
    label: "検証",
    description: "必須項目とカテゴリ整合性をチェック",
  },
  {
    key: "staging",
    label: "ステージング",
    description: "検証済データを一時保管し、差分を確認",
  },
  {
    key: "sync",
    label: "Supabase同期",
    description: "問題ない行を一括反映（近日対応）",
  },
  {
    key: "history",
    label: "履歴",
    description: "過去の取り込み実績を監査ログに残す",
  },
]

const createTempId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).substring(2, 11)

interface ProductImportSectionProps {
  data: AppData
  actions: Pick<AppActions, "addProduct" | "updateProduct">
}

export function ProductImportSection({ data, actions }: ProductImportSectionProps) {
  const [templateDownloaded, setTemplateDownloaded] = useState(false)
  const [importRows, setImportRows] = useState<ProductImportRow[]>([])
  const [stagedRows, setStagedRows] = useState<ProductImportRow[]>([])
  const [history, setHistory] = useState<ImportHistoryEntry[]>([])
  const [syncing, setSyncing] = useState(false)
  const [fetchingSheet, setFetchingSheet] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const summary = useMemo(() => {
    const ready = importRows.filter((row) => row.status === "ready").length
    const needsMapping = importRows.filter((row) => row.status === "needs_mapping").length
    const invalid = importRows.filter((row) => row.status === "invalid").length
    return { ready, needsMapping, invalid }
  }, [importRows])

  const stagedSummary = useMemo(() => ({ ready: stagedRows.length }), [stagedRows])

  const handleTemplateDownload = () => {
    const header = CSV_COLUMNS.map((column) => column.key)
    const sampleRow = CSV_COLUMNS.map((column) => column.sample ?? "")
    const csv = [header, sampleRow]
      .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","))
      .join("\n")

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "cost-app-product-template.csv"
    link.click()
    URL.revokeObjectURL(url)
    setTemplateDownloaded(true)
  }

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const text = await file.text()
    const result = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true })
    if (result.errors.length > 0) {
      toast.error("CSV の解析に失敗しました", { description: result.errors[0].message })
      return
    }

    const meaningfulRows = result.data.filter((row) =>
      Object.values(row ?? {}).some((value) => String(value ?? "").trim().length > 0)
    )

    if (meaningfulRows.length === 0) {
      toast.message("取り込むデータがありません", { description: "空の行のみでした" })
      setImportRows([])
      return
    }

    const rows = meaningfulRows.map((row, index) => ({ row, lineNumber: index + 2 }))
    hydrateFromRows(rows, "CSV")
  }

  const hydrateFromRows = (
    rows: { row: Record<string, string>; lineNumber: number }[],
    sourceLabel: string
  ) => {
    if (rows.length === 0) {
      toast.message(`${sourceLabel}から読み込めるデータがありません`)
      return
    }
    const nextRows = rows.map((entry) =>
      buildImportRow({ row: entry.row, lineNumber: entry.lineNumber, data })
    )
    setImportRows(nextRows)
    setStagedRows([])
    toast.success(`${sourceLabel}を読み込みました`, {
      description: `${nextRows.length} 行を解析しました`,
    })
  }

  const handleFetchFromSheet = async () => {
    setFetchingSheet(true)
    try {
      const {
        data: { session },
      } = await supabaseClient.auth.getSession()
      if (!session?.access_token) {
        toast.error("ログインするとシートを読み込めます。")
        setFetchingSheet(false)
        return
      }
      const response = await fetch("/api/import/product-sheet", {
        credentials: "include",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload.error ?? "Google シートの取得に失敗しました")
      }
      const payload: {
        rows: { rowNumber: number; values: Record<string, string> }[]
      } = await response.json()
      if (!payload.rows || payload.rows.length === 0) {
        toast.message("シートに取り込める行がありません")
        return
      }
      const rows = payload.rows.map((entry, index) => ({
        row: entry.values,
        lineNumber: entry.rowNumber ?? index + 2,
      }))
      hydrateFromRows(rows, "Google シート")
    } catch (error) {
      console.error(error)
      toast.error("Google シートの読み込みに失敗しました", {
        description: error instanceof Error ? error.message : undefined,
      })
    } finally {
      setFetchingSheet(false)
    }
  }

  const handleClearUpload = () => {
    setImportRows([])
    setStagedRows([])
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleStageRows = () => {
    const readyRows = importRows.filter((row) => row.status === "ready")
    if (readyRows.length === 0) {
      toast.error("ステージング可能な行がありません")
      return
    }
    setStagedRows(readyRows)
    setHistory((prev) => [
      {
        id: createTempId(),
        timestamp: new Date().toISOString(),
        totalRows: importRows.length,
        readyRows: readyRows.length,
        message: "ステージング完了",
      },
      ...prev,
    ])
    toast.success("ステージングしました", { description: `${readyRows.length} 行をステージングしています` })
  }
  const handleMockSync = () => {
    if (stagedRows.length === 0) {
      toast.error("同期対象がありません")
      return
    }
    const preparedRows = stagedRows.filter((row) => row.parsed)
    if (preparedRows.length === 0) {
      toast.error("同期可能な行がありません")
      return
    }
    setSyncing(true)
    try {
      let created = 0
      let updated = 0

      preparedRows.forEach((row) => {
        if (!row.parsed) return
        const payload = buildProductPayload(row.parsed)
        const existing = findExistingProduct(data, row.parsed.name)
        if (existing) {
          actions.updateProduct({
            ...existing,
            ...payload,
            id: existing.id,
            defaultElectricityCost: existing.defaultElectricityCost ?? 0,
            equipmentIds: existing.equipmentIds ?? [],
            registeredAt: existing.registeredAt,
          })
          updated += 1
        } else {
          actions.addProduct(payload)
          created += 1
        }
      })

      setHistory((prev) => [
        {
          id: createTempId(),
          timestamp: new Date().toISOString(),
          totalRows: stagedRows.length,
          readyRows: stagedRows.length,
          message: `Supabase 同期: 新規 ${created} / 更新 ${updated}`,
        },
        ...prev,
      ])
      toast.success("Supabase へ同期しました", {
        description: `新規 ${created} 件 / 更新 ${updated} 件を反映しました。`,
      })
      setStagedRows([])
      setImportRows([])
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    } catch (error) {
      console.error("Failed to sync staged rows", error)
      toast.error("Supabase への同期に失敗しました")
    } finally {
      setSyncing(false)
    }
  }

  const stepStatus = (key: string) => {
    switch (key) {
      case "template":
        return templateDownloaded ? "完了" : "未着手"
      case "upload":
        return importRows.length > 0 ? "完了" : "未着手"
      case "validation":
        if (importRows.length === 0) return "未着手"
        return summary.invalid === 0 ? "完了" : "要修正"
      case "staging":
        return stagedRows.length > 0 ? "完了" : importRows.length > 0 ? "待機" : "未着手"
      case "sync":
        return "計画中"
      case "history":
        return history.length > 0 ? "蓄積中" : "未記録"
      default:
        return "" as const
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>商品CSVインポート（β）</CardTitle>
          <CardDescription>テンプレートの配布からステージングまでをワンストップで実行</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-3 rounded-md border p-4">
              <div>
                <p className="text-sm font-medium">1. テンプレートをダウンロード</p>
                <p className="text-xs text-muted-foreground">
                  列構成と入力例を含む CSV をダウンロードし、スプレッドシートで編集してください。
                </p>
              </div>
              <Button type="button" onClick={handleTemplateDownload}>テンプレートをダウンロード</Button>
              <ul className="text-xs text-muted-foreground list-disc space-y-1 pl-4">
                {CSV_COLUMNS.map((column) => (
                  <li key={column.key}>
                    <span className="font-medium">{column.label}</span>
                    {column.required ? " (必須)" : ""}
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-3 rounded-md border p-4">
            <div>
              <p className="text-sm font-medium">2. CSV を選択</p>
              <p className="text-xs text-muted-foreground">UTF-8 / ヘッダー行付きの CSV を想定しています。</p>
            </div>
            <Input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileChange} />
            <div className="rounded-md border bg-muted/40 p-3 text-xs">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-medium">Google シートから読み込む</p>
                  <p className="text-muted-foreground">
                    共有済みのスプレッドシートから直接データを取得します。
                  </p>
                </div>
                <Button type="button" size="sm" variant="secondary" onClick={handleFetchFromSheet} disabled={fetchingSheet}>
                  {fetchingSheet ? "取得中..." : "シートを読み込む"}
                </Button>
              </div>
            </div>
            {importRows.length > 0 ? (
                <div className="rounded-md border bg-muted/50 p-3 text-xs">
                  <p className="font-medium">解析結果</p>
                  <p>総行数: {importRows.length}</p>
                  <p>検証OK: {summary.ready} / 要カテゴリ確認: {summary.needsMapping} / 取込不可: {summary.invalid}</p>
                  <div className="mt-2 flex gap-2">
                    <Button type="button" size="sm" variant="secondary" onClick={handleStageRows}>
                      ステージングに送る
                    </Button>
                    <Button type="button" size="sm" variant="ghost" onClick={handleClearUpload}>
                      クリア
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">まだファイルは読み込まれていません。</p>
              )}
            </div>
          </div>

          {importRows.length > 0 && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">プレビュー</p>
                  <p className="text-xs text-muted-foreground">結果を確認し、ステータスに応じて修正してください。</p>
                </div>
                <div className="flex gap-2 text-xs">
                  <Badge variant="outline">OK {summary.ready}</Badge>
                  <Badge variant="outline" className="text-amber-600 border-amber-600">
                    要確認 {summary.needsMapping}
                  </Badge>
                  <Badge variant="outline" className="text-destructive border-destructive">
                    取込不可 {summary.invalid}
                  </Badge>
                </div>
              </div>
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">行</TableHead>
                      <TableHead>商品名</TableHead>
                      <TableHead>カテゴリ</TableHead>
                      <TableHead className="text-right">販売価格</TableHead>
                      <TableHead>ステータス</TableHead>
                      <TableHead>メモ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {importRows.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="text-xs text-muted-foreground">{row.lineNumber}</TableCell>
                        <TableCell className="font-medium">{row.parsed?.name ?? "-"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{row.parsed?.categoryLabel ?? "-"}</TableCell>
                        <TableCell className="text-right">
                          {row.parsed ? row.parsed.salePrice.toLocaleString() : "-"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={row.status === "ready" ? "default" : row.status === "needs_mapping" ? "secondary" : "destructive"}>
                            {row.status === "ready"
                              ? "OK"
                              : row.status === "needs_mapping"
                                ? "要カテゴリ確認"
                                : "取込不可"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {row.issues.length === 0 ? "-" : row.issues.join(" / ")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>取り込みステップ</CardTitle>
            <CardDescription>現状の進捗を可視化しています。</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3 text-sm">
              {STEP_DESCRIPTIONS.map((step) => (
                <li key={step.key} className="flex items-start gap-3 rounded-md border p-3">
                  <div className="flex-1">
                    <p className="font-semibold">{step.label}</p>
                    <p className="text-xs text-muted-foreground">{step.description}</p>
                  </div>
                  <Badge variant="outline">{stepStatus(step.key)}</Badge>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>ステージング</CardTitle>
              <CardDescription>Supabase 同期前の確認エリア</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <p>ステージング行数: {stagedSummary.ready}</p>
              {stagedRows.length > 0 ? (
                <ul className="list-disc space-y-1 pl-4 text-xs text-muted-foreground">
                  {stagedRows.slice(0, 5).map((row) => (
                    <li key={row.id}>{row.parsed?.name}</li>
                  ))}
                  {stagedRows.length > 5 && <li>...他 {stagedRows.length - 5} 行</li>}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground">まだステージングされていません。</p>
              )}
              <Button type="button" disabled={stagedRows.length === 0 || syncing} onClick={handleMockSync}>
                {syncing ? "同期中..." : "Supabase へ同期"}
              </Button>
              <p className="text-xs text-muted-foreground">
                ステージングされたデータは、今後 Supabase のトランザクション更新に利用します。
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>取り込み履歴</CardTitle>
              <CardDescription>直近の操作ログを表示</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {history.length === 0 ? (
                <p className="text-xs text-muted-foreground">まだ履歴はありません。</p>
              ) : (
                <ul className="space-y-2">
                  {history.map((entry) => (
                    <li key={entry.id} className="rounded-md border p-2 text-xs">
                      <p className="font-medium">{new Date(entry.timestamp).toLocaleString()}</p>
                      <p>{entry.message}</p>
                      <p className="text-muted-foreground">
                        総行数 {entry.totalRows} / ステージング {entry.readyRows}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function buildImportRow({
  row,
  lineNumber,
  data,
}: {
  row: Record<string, string>
  lineNumber: number
  data: AppData
}): ProductImportRow {
  const fatalIssues: string[] = []
  const mappingIssues: string[] = []

  const name = (row["product_name"] ?? row["name"] ?? "").toString().trim()
  if (!name) {
    fatalIssues.push("商品名が空です")
  }

  const categoryLargeName = row["category_large"]?.toString().trim()
  const categoryMediumName = row["category_medium"]?.toString().trim()
  const categorySmallName = row["category_small"]?.toString().trim()
  const salePrice = parseNumeric(row["sale_price"])
  if (salePrice === null || salePrice < 0) {
    fatalIssues.push("販売価格が数値として読み取れません")
  }

  const baseManHours = parseNumeric(row["base_man_hours"], { allowZero: true })
  if (baseManHours === null || baseManHours < 0) {
    fatalIssues.push("工数が数値として読み取れません")
  }

  const expectedQuantity = parseNumeric(row["expected_quantity"])
  if (expectedQuantity === null || expectedQuantity <= 0) {
    fatalIssues.push("想定生産数が正しく入力されていません")
  }

  const expectedPeriod = parseNumeric(row["expected_period_years"], { allowZero: false }) ?? 1
  const notes = row["notes"]?.toString().trim()
  const sizeVariantInput = row["size_variants"]?.toString().trim()
  const sizeVariants = parseSizeVariants(sizeVariantInput, fatalIssues)

  const { categoryLargeId, categoryMediumId, categorySmallId, categoryLabel } = resolveCategories({
    data,
    categoryLargeName,
    categoryMediumName,
    categorySmallName,
    mappingIssues,
  })

  const status: ImportRowStatus = fatalIssues.length > 0 ? "invalid" : mappingIssues.length > 0 ? "needs_mapping" : "ready"

  if (status === "invalid") {
    return {
      id: createTempId(),
      lineNumber,
      status,
      issues: [...fatalIssues, ...mappingIssues],
      parsed: null,
    }
  }

  return {
    id: createTempId(),
    lineNumber,
    status,
    issues: [...fatalIssues, ...mappingIssues],
    parsed: {
      name,
      salePrice: salePrice ?? 0,
      baseManHours: baseManHours ?? 0,
      expectedProduction: {
        periodYears: expectedPeriod,
        quantity: expectedQuantity ?? 0,
      },
      notes,
      categoryLargeId,
      categoryMediumId,
      categorySmallId,
      categoryLabel,
      sizeVariants,
    },
  }
}

function parseNumeric(value: unknown, options?: { allowZero?: boolean }) {
  const normalized = typeof value === "number" ? value : typeof value === "string" ? value.replace(/,/g, "").trim() : ""
  if (normalized === "") return options?.allowZero ? 0 : null
  const parsed = Number(normalized)
  if (Number.isNaN(parsed)) return null
  if (!options?.allowZero && parsed === 0) return null
  return parsed
}

function parseSizeVariants(input: string | undefined, fatalIssues: string[]): Product["sizeVariants"] {
  if (!input) return []
  try {
    if (input.trim().startsWith("[")) {
      const parsed = JSON.parse(input)
      if (Array.isArray(parsed)) {
        return parsed
          .map((variant) => ({
            label: typeof variant.label === "string" ? variant.label : "",
            quantity: parseNumeric(variant.quantity, { allowZero: true }) ?? 0,
          }))
          .filter((variant) => variant.label)
      }
    }
    const tokenized = input.split(/\||,/).map((token) => token.trim()).filter(Boolean)
    return tokenized
      .map((token) => {
        const [label, qty] = token.split(":")
        return {
          label: label?.trim() ?? "",
          quantity: parseNumeric(qty, { allowZero: true }) ?? 0,
        }
      })
      .filter((variant) => variant.label)
  } catch (error) {
    fatalIssues.push("size_variants の JSON 解析に失敗しました")
  }
  return []
}

function resolveCategories({
  data,
  categoryLargeName,
  categoryMediumName,
  categorySmallName,
  mappingIssues,
}: {
  data: AppData
  categoryLargeName?: string
  categoryMediumName?: string
  categorySmallName?: string
  mappingIssues: string[]
}) {
  const small = categorySmallName
    ? data.categories.small.find((category) => category.name === categorySmallName)
    : undefined

  const medium = categoryMediumName
    ? data.categories.medium.find((category) => category.name === categoryMediumName)
    : small
      ? data.categories.medium.find((category) => category.id === small.mediumId)
      : undefined

  const large = categoryLargeName
    ? data.categories.large.find((category) => category.name === categoryLargeName)
    : medium
      ? data.categories.large.find((category) => category.id === medium.largeId)
      : undefined

  if (categorySmallName && !small) {
    mappingIssues.push(`カテゴリ(小) "${categorySmallName}" が見つかりません`)
  }
  if (categoryMediumName && !medium) {
    mappingIssues.push(`カテゴリ(中) "${categoryMediumName}" が見つかりません`)
  }
  if (categoryLargeName && !large) {
    mappingIssues.push(`カテゴリ(大) "${categoryLargeName}" が見つかりません`)
  }

  if (small && medium && small.mediumId !== medium.id) {
    mappingIssues.push("小カテゴリと中カテゴリの親子関係が一致しません")
  }

  if (medium && large && medium.largeId !== large.id) {
    mappingIssues.push("中カテゴリと大カテゴリの親子関係が一致しません")
  }

  const categoryLabel = [large?.name, medium?.name, small?.name].filter(Boolean).join(" / ") || "未設定"

  return {
    categoryLargeId: large?.id,
    categoryMediumId: medium?.id,
    categorySmallId: small?.id,
    categoryLabel,
  }
}

function findExistingProduct(data: AppData, productName: string) {
  const normalized = productName.trim().toLowerCase()
  return data.products.find((product) => product.name.trim().toLowerCase() === normalized)
}

function buildProductPayload(parsed: PreparedProductImport): Omit<Product, "id"> {
  const normalizedVariants = parsed.sizeVariants.map((variant) => ({
    label: variant.label,
    quantity: Number(variant.quantity) || 0,
  }))
  const expectedProduction = {
    periodYears: Math.max(parsed.expectedProduction.periodYears, 1),
    quantity: Math.max(parsed.expectedProduction.quantity, 1),
  }
  const lotSizeFromVariants = normalizedVariants.reduce((sum, variant) => sum + (variant.quantity || 0), 0)
  const productionLotSize = Math.max(lotSizeFromVariants, expectedProduction.quantity, 1)

  return {
    name: parsed.name,
    categoryLargeId: parsed.categoryLargeId,
    categoryMediumId: parsed.categoryMediumId,
    categorySmallId: parsed.categorySmallId,
    sizeVariants: normalizedVariants,
    baseManHours: parsed.baseManHours,
    defaultElectricityCost: 0,
    salePrice: parsed.salePrice,
    registeredAt: new Date().toISOString().slice(0, 10),
    notes: parsed.notes,
    productionLotSize,
    expectedProduction,
    equipmentIds: [],
  }
}
