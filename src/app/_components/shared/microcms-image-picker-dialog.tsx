"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type MediaItem = {
  url: string
  width: number
  height: number
  fileName: string
  createdAt: string
}

type MediaResponse = {
  media: MediaItem[]
  totalCount: number
  token?: string
}

interface MicroCmsImagePickerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (url: string) => void
}

export function MicroCmsImagePickerDialog({
  open,
  onOpenChange,
  onSelect,
}: MicroCmsImagePickerDialogProps) {
  const [media, setMedia] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [nextToken, setNextToken] = useState<string | null>(null)
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null)

  const fetchMedia = useCallback(async (token?: string) => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ limit: "30" })
      if (token) params.set("token", token)
      const res = await fetch(`/api/microcms/media?${params}`)
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `エラー (${res.status})`)
      }
      const data: MediaResponse = await res.json()
      setMedia((prev) => (token ? [...prev, ...data.media] : data.media))
      setNextToken(data.token ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "画像の取得に失敗しました")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) {
      setMedia([])
      setSelectedUrl(null)
      setNextToken(null)
      fetchMedia()
    }
  }, [open, fetchMedia])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[80vh] max-w-2xl flex-col">
        <DialogHeader>
          <DialogTitle>microCMS 画像を選択</DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {error ? (
            <div className="flex flex-col items-center gap-2 py-8 text-sm text-muted-foreground">
              <p>{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchMedia()}
              >
                再読み込み
              </Button>
            </div>
          ) : media.length === 0 && !loading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              画像が見つかりません
            </p>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
                {media.map((item) => (
                  <button
                    key={item.url}
                    type="button"
                    className={`group relative aspect-square overflow-hidden rounded-md border-2 transition-colors ${
                      selectedUrl === item.url
                        ? "border-primary ring-2 ring-primary/30"
                        : "border-transparent hover:border-muted-foreground/30"
                    }`}
                    onClick={() => setSelectedUrl(item.url)}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.url}
                      alt={item.fileName}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  </button>
                ))}
              </div>

              {nextToken && (
                <div className="flex justify-center py-3">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={loading}
                    onClick={() => fetchMedia(nextToken)}
                  >
                    さらに読み込む
                  </Button>
                </div>
              )}
            </>
          )}

          {loading && (
            <div className="flex justify-center py-6">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            キャンセル
          </Button>
          <Button
            disabled={!selectedUrl}
            onClick={() => {
              if (selectedUrl) {
                onSelect(selectedUrl)
                onOpenChange(false)
              }
            }}
          >
            選択
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
