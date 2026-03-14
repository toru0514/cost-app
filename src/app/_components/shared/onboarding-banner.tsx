"use client"

import { useEffect, useState } from "react"
import { BookOpen, Package, X } from "lucide-react"

import { Button } from "@/components/ui/button"

const STORAGE_KEY_MASTER = "cost-app-onboarding-master-seen"
const STORAGE_KEY_PRODUCT = "cost-app-onboarding-product-seen"

type Props = {
  onNavigateToMaster: () => void
  onNavigateToProduct?: () => void
  /** ログイン済みかつデータがある場合は非表示 */
  isAuthenticated?: boolean
  hasExistingData?: boolean
  /** マスタデータが登録されているか */
  hasMasterData?: boolean
  /** 商品データが登録されているか */
  hasProductData?: boolean
}

export function OnboardingBanner({
  onNavigateToMaster,
  onNavigateToProduct,
  isAuthenticated,
  hasExistingData,
  hasMasterData,
  hasProductData,
}: Props) {
  const [masterBannerVisible, setMasterBannerVisible] = useState(false)
  const [productBannerVisible, setProductBannerVisible] = useState(false)

  useEffect(() => {
    // ログイン済みでデータが既にある場合はスキップ（既存ユーザーの新端末アクセス対策）
    if (isAuthenticated && hasExistingData) {
      setMasterBannerVisible(false)
      setProductBannerVisible(false)
      localStorage.setItem(STORAGE_KEY_MASTER, "true")
      localStorage.setItem(STORAGE_KEY_PRODUCT, "true")
      return
    }

    // ステップ1: マスタ登録バナー
    const masterSeen = localStorage.getItem(STORAGE_KEY_MASTER)
    if (!masterSeen && !hasMasterData) {
      setMasterBannerVisible(true)
      setProductBannerVisible(false)
      return
    }

    // ステップ2: 商品登録バナー（マスタ登録済み、商品未登録の場合）
    const productSeen = localStorage.getItem(STORAGE_KEY_PRODUCT)
    if (hasMasterData && !hasProductData && !productSeen) {
      setMasterBannerVisible(false)
      setProductBannerVisible(true)
      return
    }

    // 両方完了済み
    setMasterBannerVisible(false)
    setProductBannerVisible(false)
  }, [isAuthenticated, hasExistingData, hasMasterData, hasProductData])

  const dismissMaster = () => {
    localStorage.setItem(STORAGE_KEY_MASTER, "true")
    setMasterBannerVisible(false)
  }

  const dismissProduct = () => {
    localStorage.setItem(STORAGE_KEY_PRODUCT, "true")
    setProductBannerVisible(false)
  }

  const handleNavigateToMaster = () => {
    onNavigateToMaster()
    dismissMaster()
  }

  const handleNavigateToProduct = () => {
    onNavigateToProduct?.()
    dismissProduct()
  }

  if (masterBannerVisible) {
    return (
      <div className="mb-4 flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/40">
        <BookOpen className="mt-0.5 h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />
        <div className="flex-1 space-y-1">
          <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">
            Cost App へようこそ
          </p>
          <p className="text-xs text-blue-700 dark:text-blue-300">
            まずは <strong>マスタ登録</strong>（材料・梱包材・設備など）から始めましょう。
            マスタを登録すると、商品ごとの原価を自動計算できます。
          </p>
          <div className="flex gap-2 pt-1">
            <Button type="button" size="sm" variant="default" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleNavigateToMaster}>
              マスタ登録を開始
            </Button>
            <Button type="button" size="sm" variant="ghost" className="text-blue-700 hover:bg-blue-100 dark:text-blue-300 dark:hover:bg-blue-900" onClick={dismissMaster}>
              後で
            </Button>
          </div>
        </div>
        <button
          type="button"
          onClick={dismissMaster}
          className="shrink-0 rounded p-0.5 text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900"
          aria-label="閉じる"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    )
  }

  if (productBannerVisible) {
    return (
      <div className="mb-4 flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950/40">
        <Package className="mt-0.5 h-5 w-5 shrink-0 text-green-600 dark:text-green-400" />
        <div className="flex-1 space-y-1">
          <p className="text-sm font-semibold text-green-900 dark:text-green-100">
            マスタ登録が完了しました
          </p>
          <p className="text-xs text-green-700 dark:text-green-300">
            次に <strong>商品登録</strong> を行いましょう。
            登録したマスタを使って、商品の原価を計算できます。
          </p>
          <div className="flex gap-2 pt-1">
            <Button type="button" size="sm" variant="default" className="bg-green-600 hover:bg-green-700 text-white" onClick={handleNavigateToProduct}>
              商品登録を開始
            </Button>
            <Button type="button" size="sm" variant="ghost" className="text-green-700 hover:bg-green-100 dark:text-green-300 dark:hover:bg-green-900" onClick={dismissProduct}>
              後で
            </Button>
          </div>
        </div>
        <button
          type="button"
          onClick={dismissProduct}
          className="shrink-0 rounded p-0.5 text-green-500 hover:bg-green-100 dark:hover:bg-green-900"
          aria-label="閉じる"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    )
  }

  return null
}
