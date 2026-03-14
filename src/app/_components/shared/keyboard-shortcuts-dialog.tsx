"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type KeyboardShortcutsDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const shortcuts = [
  { key: "Ctrl/Cmd + K", description: "検索にフォーカス" },
  { key: "Ctrl/Cmd + Z", description: "操作を取り消し" },
  { key: "?", description: "ショートカット一覧を表示" },
]

export function KeyboardShortcutsDialog({ open, onOpenChange }: KeyboardShortcutsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>キーボードショートカット</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          {shortcuts.map((shortcut) => (
            <div
              key={shortcut.key}
              className="flex items-center justify-between rounded-md border px-3 py-2"
            >
              <span className="text-sm text-muted-foreground">{shortcut.description}</span>
              <kbd className="rounded bg-muted px-2 py-1 text-xs font-mono">
                {shortcut.key}
              </kbd>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          ヒント: このダイアログは ? キーでいつでも表示できます。
        </p>
      </DialogContent>
    </Dialog>
  )
}
