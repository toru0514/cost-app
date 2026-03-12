"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { AppData, Product } from "@/lib/types"

type ConfirmationDialogsProps = {
  pendingDeleteProduct: Product | null
  onCloseDeleteProduct: () => void
  onConfirmDeleteProduct: () => void
  pendingBackupRestore: { fileName: string; data: Partial<AppData> } | null
  onCloseBackupRestore: () => void
  onConfirmBackupRestore: () => void
  pendingGuestData: unknown
  remoteLoadCompleted: boolean
  onDiscardGuestData: () => void
  onMergeGuestData: () => void
}

export function ConfirmationDialogs({
  pendingDeleteProduct,
  onCloseDeleteProduct,
  onConfirmDeleteProduct,
  pendingBackupRestore,
  onCloseBackupRestore,
  onConfirmBackupRestore,
  pendingGuestData,
  remoteLoadCompleted,
  onDiscardGuestData,
  onMergeGuestData,
}: ConfirmationDialogsProps) {
  return (
    <>
      <Dialog open={pendingDeleteProduct !== null} onOpenChange={(open) => !open && onCloseDeleteProduct()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>商品を削除しますか？</DialogTitle>
            <DialogDescription>
              {pendingDeleteProduct
                ? `「${pendingDeleteProduct.name}」を削除します。関連するコスト明細も削除されます。`
                : "関連するコスト明細も削除されます。"}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onCloseDeleteProduct}>
              キャンセル
            </Button>
            <Button type="button" variant="destructive" onClick={onConfirmDeleteProduct}>
              削除する
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={pendingBackupRestore !== null} onOpenChange={(open) => !open && onCloseBackupRestore()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>バックアップを復元しますか？</DialogTitle>
            <DialogDescription>
              現在のデータを上書きします。{pendingBackupRestore ? `対象ファイル: ${pendingBackupRestore.fileName}` : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onCloseBackupRestore}>
              キャンセル
            </Button>
            <Button type="button" variant="destructive" onClick={onConfirmBackupRestore}>
              復元する
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={pendingGuestData !== null && remoteLoadCompleted} onOpenChange={() => {}}>
        <DialogContent onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>ローカルデータのマージ確認</DialogTitle>
            <DialogDescription>
              ログアウト中に追加されたローカルデータがあります。サーバーのデータにマージしますか？破棄するとローカルデータは失われます。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onDiscardGuestData}>
              破棄する
            </Button>
            <Button type="button" onClick={onMergeGuestData}>
              マージする
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
