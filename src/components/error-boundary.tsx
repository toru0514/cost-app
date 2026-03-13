"use client"

import { Component, type ReactNode } from "react"

import { Button } from "@/components/ui/button"

type Props = {
  children: ReactNode
  fallback?: ReactNode
}

type State = {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error("[ErrorBoundary]", error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback
      return (
        <div className="flex min-h-[200px] flex-col items-center justify-center gap-4 rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center">
          <div className="space-y-1">
            <p className="font-semibold text-destructive">予期しないエラーが発生しました</p>
            <p className="text-sm text-muted-foreground">
              {this.state.error?.message ?? "不明なエラー"}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.reload()}
          >
            再読み込み
          </Button>
        </div>
      )
    }
    return this.props.children
  }
}
