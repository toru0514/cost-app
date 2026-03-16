"use client"

import { useCallback, useRef, useState } from "react"
import { Camera, Copy, Check, Loader2, ImageIcon, RotateCcw } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"

export function PhotoUploadSection() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      if (previewUrl) URL.revokeObjectURL(previewUrl)

      setSelectedFile(file)
      setPreviewUrl(URL.createObjectURL(file))
      setUploadedUrl(null)
    },
    [previewUrl]
  )

  const handleReset = useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setSelectedFile(null)
    setPreviewUrl(null)
    setUploadedUrl(null)
    setCopied(false)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }, [previewUrl])

  const handleUpload = useCallback(async () => {
    if (!selectedFile) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", selectedFile)
      const res = await fetch("/api/microcms/media", {
        method: "POST",
        body: formData,
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `アップロードエラー (${res.status})`)
      }
      const data = await res.json()
      setUploadedUrl(data.url)
      toast.success("画像をアップロードしました")
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "アップロードに失敗しました"
      toast.error(message)
    } finally {
      setUploading(false)
    }
  }, [selectedFile])

  const handleCopyUrl = useCallback(async () => {
    if (!uploadedUrl) return
    await navigator.clipboard.writeText(uploadedUrl)
    setCopied(true)
    toast.success("URLをコピーしました")
    setTimeout(() => setCopied(false), 2000)
  }, [uploadedUrl])

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="space-y-6">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* 撮影エリア */}
      {!previewUrl && (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex w-full flex-col items-center gap-4 rounded-xl border-2 border-dashed border-muted-foreground/30 bg-muted/30 px-6 py-16 transition-colors hover:border-primary/50 hover:bg-muted/50"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Camera className="h-8 w-8 text-primary" />
          </div>
          <div className="text-center">
            <p className="text-lg font-medium">写真を撮影</p>
            <p className="mt-1 text-sm text-muted-foreground">
              タップしてカメラを起動、またはファイルを選択
            </p>
          </div>
        </button>
      )}

      {/* プレビュー & アップロード */}
      {previewUrl && (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-lg border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="プレビュー"
              className="mx-auto max-h-80 w-auto object-contain"
            />
          </div>

          {selectedFile && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ImageIcon className="h-4 w-4 shrink-0" />
              <span className="truncate">{selectedFile.name}</span>
              <span className="shrink-0">
                ({formatFileSize(selectedFile.size)})
              </span>
            </div>
          )}

          {!uploadedUrl ? (
            <div className="flex gap-2">
              <Button
                onClick={handleUpload}
                disabled={uploading}
                className="flex-1"
              >
                {uploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    アップロード中...
                  </>
                ) : (
                  "アップロード"
                )}
              </Button>
              <Button
                variant="outline"
                onClick={handleReset}
                disabled={uploading}
              >
                キャンセル
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2">
                <p className="flex-1 truncate text-sm">{uploadedUrl}</p>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={handleCopyUrl}
                  title="URLをコピー"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <Button variant="outline" onClick={handleReset} className="w-full">
                <RotateCcw className="mr-2 h-4 w-4" />
                次の写真を撮影
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
