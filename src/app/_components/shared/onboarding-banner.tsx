"use client"

import { useEffect, useState } from "react"
import { BookOpen, X } from "lucide-react"

import { Button } from "@/components/ui/button"

const STORAGE_KEY = "cost-app-onboarding-seen"

type Props = {
  onNavigateToMaster: () => void
  /** ログイン済みかつデータがある場合は非表示 */
  isAuthenticated?: boolean
  hasExistingData?: boolean
}

export function OnboardingBanner({ onNavigateToMaster, isAuthenticated, hasExistingData }: Props) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // ログイン済みでデータが既にある場合はスキップ（既存ユーザーの新端末アクセス対策）
    if (isAuthenticated && hasExistingData) {
      setVisible(false)
      localStorage.setItem(STORAGE_KEY, "true")
      return
    }
    const seen = localStorage.getItem(STORAGE_KEY)
    if (!seen) {
      setVisible(true)
    }
  }, [isAuthenticated, hasExistingData])

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, "true")
    setVisible(false)
  }

  const handleNavigate = () => {
    onNavigateToMaster()
    dismiss()
  }

  if (!visible) return null

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
          <Button type="button" size="sm" variant="default" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleNavigate}>
            マスタ登録を開始
          </Button>
          <Button type="button" size="sm" variant="ghost" className="text-blue-700 hover:bg-blue-100 dark:text-blue-300 dark:hover:bg-blue-900" onClick={dismiss}>
            後で
          </Button>
        </div>
      </div>
      <button
        type="button"
        onClick={dismiss}
        className="shrink-0 rounded p-0.5 text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900"
        aria-label="閉じる"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
