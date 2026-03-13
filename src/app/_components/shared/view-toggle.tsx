"use client"

import { LayoutGrid, List } from "lucide-react"

type ViewMode = "table" | "grid"

interface ViewToggleProps {
  value: ViewMode
  onChange: (value: ViewMode) => void
}

export function ViewToggle({ value, onChange }: ViewToggleProps) {
  return (
    <div className="flex items-center rounded-md border">
      <button
        type="button"
        onClick={() => onChange("table")}
        className={`flex h-9 w-9 items-center justify-center rounded-l-md transition-colors ${
          value === "table"
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        }`}
        title="テーブル表示"
      >
        <List className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => onChange("grid")}
        className={`flex h-9 w-9 items-center justify-center rounded-r-md transition-colors ${
          value === "grid"
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        }`}
        title="グリッド表示"
      >
        <LayoutGrid className="h-4 w-4" />
      </button>
    </div>
  )
}
