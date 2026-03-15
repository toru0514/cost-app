"use client"

import { useMemo, useState } from "react"

import { Copy, Edit3, Trash2 } from "lucide-react"

import {
  filterRowsBySearch,
  useSearchWithScope,
  type SearchField,
} from "@/app/_components/shared/search-with-scope"
import { TableToolbar } from "@/app/_components/shared/table-toolbar"
import { useTableSort, type SortOption } from "@/hooks/use-table-sort"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TablePagination } from "@/components/ui/table-pagination"
import { Textarea } from "@/components/ui/textarea"
import { useTablePagination } from "@/hooks/use-table-pagination"
import type { AppActions } from "@/lib/app-data"
import type { AppData, CategoryLarge, CategoryMedium, CategorySmall } from "@/lib/types"
import { toast } from "sonner"

interface CategoryListSectionProps {
  data: AppData
  actions: AppActions
  createTempId: () => string
}

type PendingCategoryDelete =
  | {
      level: "large"
      id: string
      name: string
      impactedProducts: number
      cascadeMessage?: string
    }
  | {
      level: "medium"
      id: string
      name: string
      impactedProducts: number
      cascadeMessage?: string
    }
  | {
      level: "small"
      id: string
      name: string
      impactedProducts: number
      cascadeMessage?: string
    }

export function CategoryListSection({ data, actions, createTempId }: CategoryListSectionProps) {
  const [editingLarge, setEditingLarge] = useState({ id: null as string | null, name: "", description: "" })
  const [editingMedium, setEditingMedium] = useState({
    id: null as string | null,
    name: "",
    description: "",
    largeId: "",
  })
  const [editingSmall, setEditingSmall] = useState({
    id: null as string | null,
    name: "",
    description: "",
    mediumId: "",
  })
  const [pendingDeleteCategory, setPendingDeleteCategory] = useState<PendingCategoryDelete | null>(null)

  // Search & pagination for large categories
  const largeSearchFields = useMemo<SearchField[]>(() => [{ key: "name", label: "名称" }], [])
  const { query: largeQuery, setQuery: setLargeQuery, checkedFields: largeCheckedFields, setCheckedFields: setLargeCheckedFields, allFieldKeys: largeAllFieldKeys } = useSearchWithScope(largeSearchFields)
  const filteredLarge = useMemo(() => filterRowsBySearch(data.categories.large, largeQuery, largeCheckedFields, largeAllFieldKeys), [data.categories.large, largeQuery, largeCheckedFields, largeAllFieldKeys])
  const largeSortOptions = useMemo<SortOption<(typeof filteredLarge)[number]>[]>(() => [
    { key: "name", label: "名称" },
  ], [])
  const { sortedItems: sortedLarge, sortKey: largeSortKey, sortDirection: largeSortDir, setSortKey: setLargeSortKey, setSortDirection: setLargeSortDir, sortOptions: largeSortOpts } = useTableSort(filteredLarge, largeSortOptions, "name", "asc")
  const { pagedRows: pagedLarge, currentPage: largeCurrentPage, totalPages: largeTotalPages, onPageChange: onLargePageChange } = useTablePagination(sortedLarge)

  // Search & pagination for medium categories
  const mediumSearchFields = useMemo<SearchField[]>(() => [{ key: "name", label: "名称" }], [])
  const { query: mediumQuery, setQuery: setMediumQuery, checkedFields: mediumCheckedFields, setCheckedFields: setMediumCheckedFields, allFieldKeys: mediumAllFieldKeys } = useSearchWithScope(mediumSearchFields)
  const filteredMedium = useMemo(() => filterRowsBySearch(data.categories.medium, mediumQuery, mediumCheckedFields, mediumAllFieldKeys), [data.categories.medium, mediumQuery, mediumCheckedFields, mediumAllFieldKeys])
  const mediumSortOptions = useMemo<SortOption<(typeof filteredMedium)[number]>[]>(() => [
    { key: "name", label: "名称" },
  ], [])
  const { sortedItems: sortedMedium, sortKey: mediumSortKey, sortDirection: mediumSortDir, setSortKey: setMediumSortKey, setSortDirection: setMediumSortDir, sortOptions: mediumSortOpts } = useTableSort(filteredMedium, mediumSortOptions, "name", "asc")
  const { pagedRows: pagedMedium, currentPage: mediumCurrentPage, totalPages: mediumTotalPages, onPageChange: onMediumPageChange } = useTablePagination(sortedMedium)

  // Search & pagination for small categories
  const smallSearchFields = useMemo<SearchField[]>(() => [{ key: "name", label: "名称" }], [])
  const { query: smallQuery, setQuery: setSmallQuery, checkedFields: smallCheckedFields, setCheckedFields: setSmallCheckedFields, allFieldKeys: smallAllFieldKeys } = useSearchWithScope(smallSearchFields)
  const filteredSmall = useMemo(() => filterRowsBySearch(data.categories.small, smallQuery, smallCheckedFields, smallAllFieldKeys), [data.categories.small, smallQuery, smallCheckedFields, smallAllFieldKeys])
  const smallSortOptions = useMemo<SortOption<(typeof filteredSmall)[number]>[]>(() => [
    { key: "name", label: "名称" },
  ], [])
  const { sortedItems: sortedSmall, sortKey: smallSortKey, sortDirection: smallSortDir, setSortKey: setSmallSortKey, setSortDirection: setSmallSortDir, sortOptions: smallSortOpts } = useTableSort(filteredSmall, smallSortOptions, "name", "asc")
  const { pagedRows: pagedSmall, currentPage: smallCurrentPage, totalPages: smallTotalPages, onPageChange: onSmallPageChange } = useTablePagination(sortedSmall)

  const {
    addLargeCategory,
    updateLargeCategory,
    removeLargeCategory,
    addMediumCategory,
    updateMediumCategory,
    removeMediumCategory,
    addSmallCategory,
    updateSmallCategory,
    removeSmallCategory,
  } = actions

  const resetLarge = () => setEditingLarge({ id: null, name: "", description: "" })
  const resetMedium = () =>
    setEditingMedium({ id: null, name: "", description: "", largeId: data.categories.large[0]?.id ?? "" })
  const resetSmall = () => setEditingSmall({ id: null, name: "", description: "", mediumId: "" })

  const countImpactedProductsByLargeCategory = (largeId: string) => {
    const mediumIds = new Set(data.categories.medium.filter((category) => category.largeId === largeId).map((category) => category.id))
    const smallIds = new Set(data.categories.small.filter((category) => mediumIds.has(category.mediumId)).map((category) => category.id))
    return data.products.filter(
      (product) =>
        product.categoryLargeId === largeId ||
        (product.categoryMediumId ? mediumIds.has(product.categoryMediumId) : false) ||
        (product.categorySmallId ? smallIds.has(product.categorySmallId) : false)
    ).length
  }

  const countChildCategoriesByLargeCategory = (largeId: string) => {
    const mediumIds = new Set(data.categories.medium.filter((category) => category.largeId === largeId).map((category) => category.id))
    const smallCount = data.categories.small.filter((category) => mediumIds.has(category.mediumId)).length
    return { mediumCount: mediumIds.size, smallCount }
  }

  const countImpactedProductsByMediumCategory = (mediumId: string) => {
    const smallIds = new Set(data.categories.small.filter((category) => category.mediumId === mediumId).map((category) => category.id))
    return data.products.filter(
      (product) =>
        product.categoryMediumId === mediumId ||
        (product.categorySmallId ? smallIds.has(product.categorySmallId) : false)
    ).length
  }

  const countChildCategoriesByMediumCategory = (mediumId: string) =>
    data.categories.small.filter((category) => category.mediumId === mediumId).length

  const countImpactedProductsBySmallCategory = (smallId: string) =>
    data.products.filter((product) => product.categorySmallId === smallId).length

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

  const handleLargeSave = () => {
    if (!editingLarge.id) return
    const name = editingLarge.name.trim()
    if (!name) return
    updateLargeCategory({ id: editingLarge.id, name, description: editingLarge.description || undefined })
    toast.success("大カテゴリを更新しました", { description: `「${name}」を更新しました。` })
    resetLarge()
  }

  const handleLargeDelete = () => {
    if (!editingLarge.id) return
    const name = editingLarge.name.trim() || "大カテゴリ"
    const impactedProducts = countImpactedProductsByLargeCategory(editingLarge.id)
    const { mediumCount, smallCount } = countChildCategoriesByLargeCategory(editingLarge.id)
    const cascadeMessage =
      mediumCount > 0 || smallCount > 0
        ? `配下の中カテゴリ ${mediumCount} 件・小カテゴリ ${smallCount} 件も削除されます。`
        : ""
    setPendingDeleteCategory({
      level: "large",
      id: editingLarge.id,
      name,
      impactedProducts,
      cascadeMessage,
    })
  }

  const handleLargeCopy = (category: CategoryLarge) => {
    const newId = createTempId()
    const name = `${category.name} (コピー)`
    addLargeCategory({ id: newId, name, description: category.description })
    toast.success("大カテゴリをコピーしました", { description: `「${name}」を作成しました。` })
    setEditingLarge({ id: newId, name, description: category.description ?? "" })
  }

  const handleMediumSave = () => {
    if (!editingMedium.id || !editingMedium.largeId) return
    const name = editingMedium.name.trim()
    if (!name) return
    updateMediumCategory({
      id: editingMedium.id,
      name,
      description: editingMedium.description || undefined,
      largeId: editingMedium.largeId,
    })
    toast.success("中カテゴリを更新しました", { description: `「${name}」を更新しました。` })
    resetMedium()
  }

  const handleMediumDelete = () => {
    if (!editingMedium.id) return
    const name = editingMedium.name.trim() || "中カテゴリ"
    const impactedProducts = countImpactedProductsByMediumCategory(editingMedium.id)
    const childSmallCount = countChildCategoriesByMediumCategory(editingMedium.id)
    const cascadeMessage = childSmallCount > 0 ? `配下の小カテゴリ ${childSmallCount} 件も削除されます。` : ""
    setPendingDeleteCategory({
      level: "medium",
      id: editingMedium.id,
      name,
      impactedProducts,
      cascadeMessage,
    })
  }

  const handleMediumCopy = (category: CategoryMedium) => {
    const newId = createTempId()
    const name = `${category.name} (コピー)`
    addMediumCategory({ id: newId, name, description: category.description, largeId: category.largeId })
    toast.success("中カテゴリをコピーしました", { description: `「${name}」を作成しました。` })
    setEditingMedium({ id: newId, name, description: category.description ?? "", largeId: category.largeId })
  }

  const handleSmallSave = () => {
    if (!editingSmall.id || !editingSmall.mediumId) return
    const name = editingSmall.name.trim()
    if (!name) return
    updateSmallCategory({
      id: editingSmall.id,
      name,
      description: editingSmall.description || undefined,
      mediumId: editingSmall.mediumId,
    })
    toast.success("小カテゴリを更新しました", { description: `「${name}」を更新しました。` })
    resetSmall()
  }

  const handleSmallDelete = () => {
    if (!editingSmall.id) return
    const name = editingSmall.name.trim() || "小カテゴリ"
    const impactedProducts = countImpactedProductsBySmallCategory(editingSmall.id)
    setPendingDeleteCategory({
      level: "small",
      id: editingSmall.id,
      name,
      impactedProducts,
    })
  }

  const handleSmallCopy = (category: CategorySmall) => {
    const newId = createTempId()
    const name = `${category.name} (コピー)`
    addSmallCategory({ id: newId, name, description: category.description, mediumId: category.mediumId })
    toast.success("小カテゴリをコピーしました", { description: `「${name}」を作成しました。` })
    setEditingSmall({ id: newId, name, description: category.description ?? "", mediumId: category.mediumId })
  }

  const closeDeleteDialog = () => {
    setPendingDeleteCategory(null)
  }

  const confirmDeleteCategory = () => {
    if (!pendingDeleteCategory) return

    if (pendingDeleteCategory.level === "large") {
      removeLargeCategory(pendingDeleteCategory.id)
      toast.success("大カテゴリを削除しました", { description: `「${pendingDeleteCategory.name}」を削除しました。` })
      resetLarge()
    } else if (pendingDeleteCategory.level === "medium") {
      removeMediumCategory(pendingDeleteCategory.id)
      toast.success("中カテゴリを削除しました", { description: `「${pendingDeleteCategory.name}」を削除しました。` })
      resetMedium()
    } else {
      removeSmallCategory(pendingDeleteCategory.id)
      toast.success("小カテゴリを削除しました", { description: `「${pendingDeleteCategory.name}」を削除しました。` })
      resetSmall()
    }

    closeDeleteDialog()
  }

  const getDeleteDialogTitle = () => {
    if (!pendingDeleteCategory) return "カテゴリを削除しますか？"
    const levelLabelMap: Record<PendingCategoryDelete["level"], string> = {
      large: "大",
      medium: "中",
      small: "小",
    }
    return `${levelLabelMap[pendingDeleteCategory.level]}カテゴリを削除しますか？`
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>カテゴリ一覧</CardTitle>
          <CardDescription>既存カテゴリをその場で編集できます。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
        <div>
          <p className="mb-2 font-semibold">大カテゴリ</p>
          {data.categories.large.length === 0 ? (
            <p className="text-sm text-muted-foreground">まだ登録がありません。</p>
          ) : (
            <div className="space-y-2">
            <TableToolbar
              search={{ fields: largeSearchFields, query: largeQuery, onQueryChange: setLargeQuery, checkedFields: largeCheckedFields, onCheckedFieldsChange: setLargeCheckedFields }}
              sort={{ sortKey: largeSortKey, sortDirection: largeSortDir, setSortKey: setLargeSortKey, setSortDirection: setLargeSortDir, sortOptions: largeSortOpts }}
            />
            <div className="relative w-full min-w-0 max-w-full overflow-x-auto overscroll-x-contain touch-pan-x">
              <Table className="min-w-[640px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>名称</TableHead>
                    <TableHead>概要</TableHead>
                    <TableHead className="w-36 text-right">
                      <span className="sr-only">操作</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedLarge.map((category) => {
                    const isEditing = editingLarge.id === category.id
                    return (
                      <TableRow key={category.id} className="group">
                        <TableCell>
                          {isEditing ? (
                            <Input
                              value={editingLarge.name}
                              onChange={(event) => setEditingLarge((prev) => ({ ...prev, name: event.target.value }))}
                            />
                          ) : (
                            category.name
                          )}
                        </TableCell>
                        <TableCell>
                          {isEditing ? (
                            <Textarea
                              value={editingLarge.description}
                              onChange={(event) => setEditingLarge((prev) => ({ ...prev, description: event.target.value }))}
                            />
                          ) : (
                            category.description || "-"
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {isEditing ? (
                            renderActionButtons(handleLargeSave, resetLarge, handleLargeDelete)
                          ) : (
                            <div className="master-row-actions flex items-center justify-end gap-1">
                              <button
                                type="button"
                                className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                                onClick={() =>
                                  setEditingLarge({ id: category.id, name: category.name, description: category.description ?? "" })
                                }
                                title="編集"
                              >
                                <Edit3 className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                                onClick={() => handleLargeCopy(category)}
                                title="コピー"
                              >
                                <Copy className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                className="rounded p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
                                onClick={() => {
                                  const impactedProducts = countImpactedProductsByLargeCategory(category.id)
                                  const { mediumCount, smallCount } = countChildCategoriesByLargeCategory(category.id)
                                  const cascadeMessage =
                                    mediumCount > 0 || smallCount > 0
                                      ? `配下の中カテゴリ ${mediumCount} 件・小カテゴリ ${smallCount} 件も削除されます。`
                                      : ""
                                  setPendingDeleteCategory({
                                    level: "large",
                                    id: category.id,
                                    name: category.name,
                                    impactedProducts,
                                    cascadeMessage,
                                  })
                                }}
                                title="削除"
                              >
                                <Trash2 className="h-4 w-4" />
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
            <TablePagination currentPage={largeCurrentPage} totalPages={largeTotalPages} onPageChange={onLargePageChange} />
            </div>
          )}
        </div>

        <div>
          <p className="mb-2 font-semibold">中カテゴリ</p>
          {data.categories.medium.length === 0 ? (
            <p className="text-sm text-muted-foreground">まだ登録がありません。</p>
          ) : (
            <div className="space-y-2">
            <TableToolbar
              search={{ fields: mediumSearchFields, query: mediumQuery, onQueryChange: setMediumQuery, checkedFields: mediumCheckedFields, onCheckedFieldsChange: setMediumCheckedFields }}
              sort={{ sortKey: mediumSortKey, sortDirection: mediumSortDir, setSortKey: setMediumSortKey, setSortDirection: setMediumSortDir, sortOptions: mediumSortOpts }}
            />
            <div className="relative w-full min-w-0 max-w-full overflow-x-auto overscroll-x-contain touch-pan-x">
              <Table className="min-w-[700px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>名称</TableHead>
                    <TableHead>親カテゴリ</TableHead>
                    <TableHead>概要</TableHead>
                    <TableHead className="w-36 text-right">
                      <span className="sr-only">操作</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedMedium.map((category) => {
                    const isEditing = editingMedium.id === category.id
                    const parentName = data.categories.large.find((c) => c.id === category.largeId)?.name ?? "-"
                    return (
                      <TableRow key={category.id} className="group">
                        <TableCell>
                          {isEditing ? (
                            <Input
                              value={editingMedium.name}
                              onChange={(event) => setEditingMedium((prev) => ({ ...prev, name: event.target.value }))}
                            />
                          ) : (
                            category.name
                          )}
                        </TableCell>
                        <TableCell>
                          {isEditing ? (
                            <Select
                              value={editingMedium.largeId}
                              onValueChange={(value) => setEditingMedium((prev) => ({ ...prev, largeId: value }))}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="親カテゴリ" />
                              </SelectTrigger>
                              <SelectContent>
                                {data.categories.large.map((large) => (
                                  <SelectItem key={large.id} value={large.id}>
                                    {large.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            parentName
                          )}
                        </TableCell>
                        <TableCell>
                          {isEditing ? (
                            <Textarea
                              value={editingMedium.description}
                              onChange={(event) => setEditingMedium((prev) => ({ ...prev, description: event.target.value }))}
                            />
                          ) : (
                            category.description || "-"
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {isEditing ? (
                            renderActionButtons(handleMediumSave, resetMedium, handleMediumDelete)
                          ) : (
                            <div className="master-row-actions flex items-center justify-end gap-1">
                              <button
                                type="button"
                                className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                                onClick={() =>
                                  setEditingMedium({
                                    id: category.id,
                                    name: category.name,
                                    description: category.description ?? "",
                                    largeId: category.largeId,
                                  })
                                }
                                title="編集"
                              >
                                <Edit3 className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                                onClick={() => handleMediumCopy(category)}
                                title="コピー"
                              >
                                <Copy className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                className="rounded p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
                                onClick={() => {
                                  const impactedProducts = countImpactedProductsByMediumCategory(category.id)
                                  const childSmallCount = countChildCategoriesByMediumCategory(category.id)
                                  const cascadeMessage = childSmallCount > 0 ? `配下の小カテゴリ ${childSmallCount} 件も削除されます。` : ""
                                  setPendingDeleteCategory({
                                    level: "medium",
                                    id: category.id,
                                    name: category.name,
                                    impactedProducts,
                                    cascadeMessage,
                                  })
                                }}
                                title="削除"
                              >
                                <Trash2 className="h-4 w-4" />
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
            <TablePagination currentPage={mediumCurrentPage} totalPages={mediumTotalPages} onPageChange={onMediumPageChange} />
            </div>
          )}
        </div>

        <div>
          <p className="mb-2 font-semibold">小カテゴリ</p>
          {data.categories.small.length === 0 ? (
            <p className="text-sm text-muted-foreground">まだ登録がありません。</p>
          ) : (
            <div className="space-y-2">
            <TableToolbar
              search={{ fields: smallSearchFields, query: smallQuery, onQueryChange: setSmallQuery, checkedFields: smallCheckedFields, onCheckedFieldsChange: setSmallCheckedFields }}
              sort={{ sortKey: smallSortKey, sortDirection: smallSortDir, setSortKey: setSmallSortKey, setSortDirection: setSmallSortDir, sortOptions: smallSortOpts }}
            />
            <div className="relative w-full min-w-0 max-w-full overflow-x-auto overscroll-x-contain touch-pan-x">
              <Table className="min-w-[720px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>名称</TableHead>
                    <TableHead>親カテゴリ</TableHead>
                    <TableHead>概要</TableHead>
                    <TableHead className="w-36 text-right">
                      <span className="sr-only">操作</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedSmall.map((category) => {
                    const isEditing = editingSmall.id === category.id
                    const parent = data.categories.medium.find((c) => c.id === category.mediumId)?.name ?? "-"
                    return (
                      <TableRow key={category.id} className="group">
                        <TableCell>
                          {isEditing ? (
                            <Input
                              value={editingSmall.name}
                              onChange={(event) => setEditingSmall((prev) => ({ ...prev, name: event.target.value }))}
                            />
                          ) : (
                            category.name
                          )}
                        </TableCell>
                        <TableCell>
                          {isEditing ? (
                            <Select
                              value={editingSmall.mediumId}
                              onValueChange={(value) => setEditingSmall((prev) => ({ ...prev, mediumId: value }))}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="親カテゴリ" />
                              </SelectTrigger>
                              <SelectContent>
                                {data.categories.medium.map((medium) => (
                                  <SelectItem key={medium.id} value={medium.id}>
                                    {medium.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            parent
                          )}
                        </TableCell>
                        <TableCell>
                          {isEditing ? (
                            <Textarea
                              value={editingSmall.description}
                              onChange={(event) => setEditingSmall((prev) => ({ ...prev, description: event.target.value }))}
                            />
                          ) : (
                            category.description || "-"
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {isEditing ? (
                            renderActionButtons(handleSmallSave, resetSmall, handleSmallDelete)
                          ) : (
                            <div className="master-row-actions flex items-center justify-end gap-1">
                              <button
                                type="button"
                                className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                                onClick={() =>
                                  setEditingSmall({
                                    id: category.id,
                                    name: category.name,
                                    description: category.description ?? "",
                                    mediumId: category.mediumId,
                                  })
                                }
                                title="編集"
                              >
                                <Edit3 className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                                onClick={() => handleSmallCopy(category)}
                                title="コピー"
                              >
                                <Copy className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                className="rounded p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
                                onClick={() => {
                                  const impactedProducts = countImpactedProductsBySmallCategory(category.id)
                                  setPendingDeleteCategory({
                                    level: "small",
                                    id: category.id,
                                    name: category.name,
                                    impactedProducts,
                                  })
                                }}
                                title="削除"
                              >
                                <Trash2 className="h-4 w-4" />
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
            <TablePagination currentPage={smallCurrentPage} totalPages={smallTotalPages} onPageChange={onSmallPageChange} />
            </div>
          )}
        </div>
        </CardContent>
      </Card>
      <Dialog open={pendingDeleteCategory !== null} onOpenChange={(open) => !open && closeDeleteDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{getDeleteDialogTitle()}</DialogTitle>
            <DialogDescription className="space-y-1">
              <p>
                {pendingDeleteCategory
                  ? `このカテゴリを参照している商品が ${pendingDeleteCategory.impactedProducts} 件あります。`
                  : ""}
              </p>
              {pendingDeleteCategory?.cascadeMessage ? <p>{pendingDeleteCategory.cascadeMessage}</p> : null}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={closeDeleteDialog}>
              キャンセル
            </Button>
            <Button type="button" variant="destructive" onClick={confirmDeleteCategory}>
              削除する
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
