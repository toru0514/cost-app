"use client"

import { Suspense, useState, useEffect, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import ReactMarkdown, { type Components } from "react-markdown"
import remarkGfm from "remark-gfm"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { guideSections } from "@/lib/guide-content"
import {
  ArrowLeft,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  X as XIcon,
} from "lucide-react"

export default function GuidePage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-muted border-t-transparent" />
        </main>
      }
    >
      <GuidePageContent />
    </Suspense>
  )
}

function GuidePageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sectionParam = searchParams.get("section")

  const [openSections, setOpenSections] = useState<Set<string>>(() => {
    if (sectionParam) return new Set([sectionParam])
    return new Set<string>()
  })
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)

  const markdownComponents: Components = {
    img: ({ src, alt, ...props }) => (
      <button
        type="button"
        onClick={() => typeof src === "string" && setLightboxSrc(src)}
        className="my-3 block cursor-zoom-in"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt ?? ""}
          className="max-w-full rounded-lg border shadow-sm transition-shadow hover:shadow-md"
          loading="lazy"
          {...props}
        />
        {alt && <span className="mt-1 block text-center text-xs text-muted-foreground">{alt}</span>}
      </button>
    ),
    table: ({ children }) => (
      <div className="my-4 overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">{children}</table>
      </div>
    ),
    thead: ({ children }) => <thead className="border-b bg-muted/50">{children}</thead>,
    th: ({ children }) => <th className="px-4 py-2 text-left font-semibold">{children}</th>,
    td: ({ children }) => <td className="border-t px-4 py-2">{children}</td>,
  }

  // Auto-scroll to section when linked via ?section=xxx
  useEffect(() => {
    if (sectionParam) {
      setOpenSections((prev) => new Set([...prev, sectionParam]))
      // Wait a tick for the section to open, then scroll
      requestAnimationFrame(() => {
        const el = document.getElementById(`guide-${sectionParam}`)
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" })
        }
      })
    }
  }, [sectionParam])

  const toggleSection = useCallback((id: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const expandAll = useCallback(() => {
    setOpenSections(new Set(guideSections.map((s) => s.id)))
  }, [])

  const collapseAll = useCallback(() => {
    setOpenSections(new Set())
  }, [])

  const sidebarWidthClass = sidebarCollapsed ? "w-[76px]" : "w-[260px]"

  const tocContent = (onItemClick?: () => void) => (
    <nav className="space-y-1">
      {guideSections.map((section, idx) => (
        <button
          key={section.id}
          type="button"
          onClick={() => {
            setOpenSections((prev) => new Set([...prev, section.id]))
            onItemClick?.()
            requestAnimationFrame(() => {
              const el = document.getElementById(`guide-${section.id}`)
              el?.scrollIntoView({ behavior: "smooth", block: "start" })
            })
          }}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-muted text-xs font-medium">
            {idx}
          </span>
          {!sidebarCollapsed && <span className="truncate">{section.title}</span>}
        </button>
      ))}
    </nav>
  )

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <aside className={`hidden h-full overflow-y-auto border-r bg-card p-3 md:flex md:flex-col ${sidebarWidthClass}`}>
        <div className={`mb-3 flex items-center px-1 ${sidebarCollapsed ? "flex-col gap-1" : "justify-between gap-2"}`}>
          {!sidebarCollapsed && <p className="text-sm font-semibold">使い方ガイド</p>}
          <div className={`flex items-center ${sidebarCollapsed ? "flex-col gap-1" : "gap-1"}`}>
            <Button type="button" variant="ghost" size="sm" onClick={() => setSidebarCollapsed(!sidebarCollapsed)}>
              {sidebarCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </Button>
            {!sidebarCollapsed && <ThemeToggle />}
          </div>
        </div>
        {tocContent()}
        <div className="mt-auto border-t pt-3">
          <Link
            href="/cost"
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            title={sidebarCollapsed ? "ダッシュボードに戻る" : undefined}
          >
            <ArrowLeft className="h-4 w-4 shrink-0" />
            {!sidebarCollapsed && <span>ダッシュボードに戻る</span>}
          </Link>
        </div>
      </aside>

      {/* Mobile drawer */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button type="button" className="absolute inset-0 bg-black/40" onClick={() => setMobileNavOpen(false)} aria-label="メニューを閉じる" />
          <aside className="absolute left-0 top-0 flex h-full w-72 flex-col border-r bg-card p-3 shadow-lg">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold">使い方ガイド</p>
              <div className="flex items-center gap-1">
                <ThemeToggle />
                <Button type="button" variant="ghost" size="sm" onClick={() => setMobileNavOpen(false)}>
                  <XIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {tocContent(() => setMobileNavOpen(false))}
            <div className="mt-auto border-t pt-3">
              <Link
                href="/cost"
                onClick={() => setMobileNavOpen(false)}
                className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4 shrink-0" />
                <span>ダッシュボードに戻る</span>
              </Link>
            </div>
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
          <div className="flex h-14 items-center justify-between gap-2 px-3 md:px-6">
            <div className="flex items-center gap-2">
              <Button type="button" variant="ghost" size="icon" className="md:hidden h-10 w-10" onClick={() => setMobileNavOpen(true)}>
                <Menu className="h-7 w-7" />
              </Button>
              <div className="flex items-center gap-1.5">
                <BookOpen className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-semibold md:text-sm">使い方ガイド</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={expandAll}>
                すべて展開
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={collapseAll}>
                すべて折りたたむ
              </Button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-4xl p-4 md:p-6">
            {/* Intro */}
            <div className="mb-8">
              <h1 className="mb-2 text-2xl font-bold md:text-3xl">コスト設計ダッシュボード 操作マニュアル</h1>
              <p className="text-muted-foreground">
                各セクションをクリックして、詳しい操作方法を確認できます。
              </p>
            </div>

            {/* TOC cards (mobile-friendly) */}
            <div className="mb-8 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {guideSections.map((section, idx) => (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => {
                    setOpenSections((prev) => new Set([...prev, section.id]))
                    requestAnimationFrame(() => {
                      const el = document.getElementById(`guide-${section.id}`)
                      el?.scrollIntoView({ behavior: "smooth", block: "start" })
                    })
                  }}
                  className="flex items-start gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-muted"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-primary text-xs font-medium text-primary-foreground">
                    {idx}
                  </span>
                  <div>
                    <p className="text-sm font-medium">{section.title}</p>
                    <p className="text-xs text-muted-foreground">{section.description}</p>
                  </div>
                </button>
              ))}
            </div>

            {/* Sections */}
            <div className="space-y-3">
              {guideSections.map((section, idx) => {
                const isOpen = openSections.has(section.id)
                return (
                  <div key={section.id} id={`guide-${section.id}`} className="scroll-mt-20 rounded-lg border">
                    <button
                      type="button"
                      onClick={() => toggleSection(section.id)}
                      className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-muted/50"
                    >
                      {isOpen ? (
                        <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
                      )}
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-primary text-xs font-medium text-primary-foreground">
                        {idx}
                      </span>
                      <div>
                        <h2 className="text-base font-semibold md:text-lg">{section.title}</h2>
                        <p className="text-xs text-muted-foreground">{section.description}</p>
                      </div>
                    </button>
                    {isOpen && (
                      <div className="border-t px-4 py-4 md:px-6">
                        <div className="guide-markdown prose prose-sm dark:prose-invert max-w-none">
                          <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>{section.content}</ReactMarkdown>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Back to dashboard */}
            <div className="mt-8 flex justify-center">
              <Button type="button" variant="outline" onClick={() => router.push("/cost")}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                ダッシュボードに戻る
              </Button>
            </div>
          </div>
        </main>
      </div>

      {/* Image lightbox */}
      {lightboxSrc && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4" onClick={() => setLightboxSrc(null)}>
          <button
            type="button"
            onClick={() => setLightboxSrc(null)}
            className="absolute right-4 top-4 rounded-full bg-black/50 p-2 text-white transition-colors hover:bg-black/80"
            aria-label="閉じる"
          >
            <XIcon className="h-6 w-6" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightboxSrc}
            alt=""
            className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}
