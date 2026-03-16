"use client"

import { useCallback, useRef, useState } from "react"
import {
  Camera,
  Loader2,
  ImageIcon,
  RotateCcw,
  X,
  Check,
  AlertCircle,
  Plus,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"

type FileItem = {
  id: string
  file: File
  previewUrl: string
  status: "pending" | "uploading" | "done" | "error"
  uploadedUrl?: string
  error?: string
}

export function PhotoUploadSection() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [files, setFiles] = useState<FileItem[]>([])
  const [uploading, setUploading] = useState(false)

  const addFiles = useCallback((newFiles: FileList) => {
    const items: FileItem[] = Array.from(newFiles).map((file) => ({
      id: crypto.randomUUID(),
      file,
      previewUrl: URL.createObjectURL(file),
      status: "pending" as const,
    }))
    setFiles((prev) => [...prev, ...items])
  }, [])

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = e.target.files
      if (!selected || selected.length === 0) return
      addFiles(selected)
      if (fileInputRef.current) fileInputRef.current.value = ""
    },
    [addFiles]
  )

  const handleRemoveFile = useCallback((id: string) => {
    setFiles((prev) => {
      const item = prev.find((f) => f.id === id)
      if (item) URL.revokeObjectURL(item.previewUrl)
      return prev.filter((f) => f.id !== id)
    })
  }, [])

  const handleReset = useCallback(() => {
    setFiles((prev) => {
      for (const item of prev) URL.revokeObjectURL(item.previewUrl)
      return []
    })
    if (fileInputRef.current) fileInputRef.current.value = ""
  }, [])

  const handleUploadAll = useCallback(async () => {
    const pendingFiles = files.filter((f) => f.status === "pending")
    if (pendingFiles.length === 0) return

    setUploading(true)
    let successCount = 0
    let errorCount = 0

    for (const item of pendingFiles) {
      setFiles((prev) =>
        prev.map((f) => (f.id === item.id ? { ...f, status: "uploading" } : f))
      )

      try {
        const formData = new FormData()
        formData.append("file", item.file)
        const res = await fetch("/api/microcms/media", {
          method: "POST",
          body: formData,
        })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.error ?? `アップロードエラー (${res.status})`)
        }
        const data = await res.json()
        setFiles((prev) =>
          prev.map((f) =>
            f.id === item.id
              ? { ...f, status: "done", uploadedUrl: data.url }
              : f
          )
        )
        successCount++
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "アップロードに失敗しました"
        setFiles((prev) =>
          prev.map((f) =>
            f.id === item.id ? { ...f, status: "error", error: message } : f
          )
        )
        errorCount++
      }
    }

    setUploading(false)

    if (errorCount === 0) {
      toast.success(`${successCount}枚の画像をアップロードしました`)
    } else {
      toast.error(
        `${successCount}枚成功、${errorCount}枚失敗しました`
      )
    }
  }, [files])

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const hasFiles = files.length > 0
  const pendingCount = files.filter((f) => f.status === "pending").length
  const doneCount = files.filter((f) => f.status === "done").length
  const allDone = hasFiles && pendingCount === 0 && !uploading

  return (
    <div className="space-y-6">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />

      {/* 撮影 / 選択エリア */}
      {!hasFiles && (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex w-full flex-col items-center gap-4 rounded-xl border-2 border-dashed border-muted-foreground/30 bg-muted/30 px-6 py-16 transition-colors hover:border-primary/50 hover:bg-muted/50"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Camera className="h-8 w-8 text-primary" />
          </div>
          <div className="text-center">
            <p className="text-lg font-medium">写真を撮影 / 選択</p>
            <p className="mt-1 text-sm text-muted-foreground">
              タップしてカメラを起動、またはファイルを選択（複数可）
            </p>
          </div>
        </button>
      )}

      {/* ファイル一覧 */}
      {hasFiles && (
        <div className="space-y-4">
          {/* 進捗表示 */}
          {uploading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>
                {doneCount} / {files.length} アップロード完了
              </span>
            </div>
          )}

          {/* サムネイルグリッド */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {files.map((item) => (
              <div
                key={item.id}
                className="relative overflow-hidden rounded-lg border"
              >
                {/* サムネイル */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.previewUrl}
                  alt={item.file.name}
                  className="aspect-square w-full object-cover"
                />

                {/* ステータスオーバーレイ */}
                {item.status === "uploading" && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                    <Loader2 className="h-8 w-8 animate-spin text-white" />
                  </div>
                )}
                {item.status === "done" && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500">
                      <Check className="h-6 w-6 text-white" />
                    </div>
                  </div>
                )}
                {item.status === "error" && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500">
                      <AlertCircle className="h-6 w-6 text-white" />
                    </div>
                  </div>
                )}

                {/* 削除ボタン（pending時のみ） */}
                {item.status === "pending" && (
                  <button
                    type="button"
                    onClick={() => handleRemoveFile(item.id)}
                    className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}

                {/* ファイル情報 */}
                <div className="flex items-center gap-1 bg-muted/80 px-2 py-1 text-xs text-muted-foreground">
                  <ImageIcon className="h-3 w-3 shrink-0" />
                  <span className="truncate">{item.file.name}</span>
                  <span className="shrink-0">
                    ({formatFileSize(item.file.size)})
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* アクションボタン */}
          {!allDone ? (
            <div className="flex gap-2">
              {pendingCount > 0 && (
                <Button
                  onClick={handleUploadAll}
                  disabled={uploading}
                  className="flex-1"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      アップロード中...
                    </>
                  ) : (
                    `すべてアップロード（${pendingCount}枚）`
                  )}
                </Button>
              )}
              {!uploading && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Plus className="mr-1 h-4 w-4" />
                    追加
                  </Button>
                  <Button variant="outline" onClick={handleReset}>
                    キャンセル
                  </Button>
                </>
              )}
            </div>
          ) : (
            <Button variant="outline" onClick={handleReset} className="w-full">
              <RotateCcw className="mr-2 h-4 w-4" />
              次の写真を撮影
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
