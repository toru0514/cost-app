"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronRight, Play } from "lucide-react"
import type { ProductProcess } from "@/lib/types/process"

type ProcessGridProps = {
  productProcesses: ProductProcess[]
  onStart: (process: ProductProcess) => void
}

export function ProcessGrid({ productProcesses, onStart }: ProcessGridProps) {
  const [expandedParents, setExpandedParents] = useState<Set<string>>(
    new Set()
  )

  const parentProcesses = useMemo(
    () => productProcesses.filter((pp) => !pp.parentId),
    [productProcesses]
  )

  const childProcessesMap = useMemo(() => {
    const map = new Map<string, ProductProcess[]>()
    for (const pp of productProcesses) {
      if (pp.parentId) {
        const children = map.get(pp.parentId) ?? []
        children.push(pp)
        map.set(pp.parentId, children)
      }
    }
    return map
  }, [productProcesses])

  const toggleExpanded = (parentId: string) => {
    setExpandedParents((prev) => {
      const next = new Set(prev)
      if (next.has(parentId)) {
        next.delete(parentId)
      } else {
        next.add(parentId)
      }
      return next
    })
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {parentProcesses.map((parent) => {
        const children = childProcessesMap.get(parent.id) ?? []
        const hasChildren = children.length > 0
        const isExpanded = expandedParents.has(parent.id)

        return (
          <div
            key={parent.id}
            className={
              hasChildren && isExpanded
                ? "col-span-2 sm:col-span-3"
                : undefined
            }
          >
            {/* Parent process card */}
            <div className="rounded-lg border bg-card shadow-sm transition-colors hover:border-primary/50">
              <button
                type="button"
                onClick={() => onStart(parent)}
                className="flex w-full flex-col items-center gap-1.5 px-4 py-3 text-center"
              >
                <span className="text-sm font-semibold leading-tight">
                  {parent.name}
                </span>
                <span className="text-xs text-muted-foreground">
                  ¥{parent.hourlyRate.toLocaleString()}/h
                </span>
                <span className="mt-0.5 flex items-center gap-1 text-xs font-medium text-primary">
                  <Play className="h-3 w-3" />
                  開始
                </span>
              </button>

              {/* Expand toggle for children */}
              {hasChildren && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleExpanded(parent.id)
                  }}
                  className="flex w-full items-center justify-center gap-1 border-t px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted/50"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronRight className="h-3 w-3" />
                  )}
                  子工程 ({children.length})
                </button>
              )}
            </div>

            {/* Expanded children */}
            {hasChildren && isExpanded && (
              <div className="mt-2 grid grid-cols-2 gap-2 pl-4 sm:grid-cols-3">
                {children.map((child) => (
                  <button
                    key={child.id}
                    type="button"
                    onClick={() => onStart(child)}
                    className="flex flex-col items-center gap-1 rounded-md border bg-card px-3 py-2 text-center shadow-sm transition-colors hover:border-primary/50"
                  >
                    <span className="text-xs font-medium">{child.name}</span>
                    <span className="text-[10px] text-muted-foreground">
                      ¥{child.hourlyRate.toLocaleString()}/h
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
