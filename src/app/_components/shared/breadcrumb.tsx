"use client"

import { ChevronRight, Home } from "lucide-react"

export type BreadcrumbItem = {
  label: string
  href?: string
  onClick?: () => void
}

type BreadcrumbProps = {
  items: BreadcrumbItem[]
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  if (items.length === 0) return null

  return (
    <nav aria-label="パンくずリスト" className="mb-4">
      <ol className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
        <li className="flex items-center gap-1">
          <Home className="h-3.5 w-3.5" />
          <span className="sr-only">ホーム</span>
        </li>
        {items.map((item, index) => {
          const isLast = index === items.length - 1
          return (
            <li key={index} className="flex items-center gap-1">
              <ChevronRight className="h-3.5 w-3.5" />
              {isLast ? (
                <span className="font-medium text-foreground">{item.label}</span>
              ) : item.onClick ? (
                <button
                  type="button"
                  onClick={item.onClick}
                  className="hover:text-foreground hover:underline"
                >
                  {item.label}
                </button>
              ) : (
                <span>{item.label}</span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
