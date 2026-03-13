"use client"

import { useEffect, useState } from "react"
import { Moon, Sun } from "lucide-react"

import { Button } from "@/components/ui/button"

const STORAGE_KEY = "cost-app-theme"

function applyTheme(dark: boolean) {
  document.documentElement.classList.toggle("dark", dark)
}

function getInitialDark(): boolean {
  if (typeof window === "undefined") return false
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === "dark") return true
  if (stored === "light") return false
  return window.matchMedia("(prefers-color-scheme: dark)").matches
}

export function ThemeToggle() {
  const [dark, setDark] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const isDark = getInitialDark()
    setDark(isDark)
    applyTheme(isDark)
    setMounted(true)
  }, [])

  const toggle = () => {
    const next = !dark
    setDark(next)
    applyTheme(next)
    localStorage.setItem(STORAGE_KEY, next ? "dark" : "light")
  }

  if (!mounted) return null

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={toggle}
      title={dark ? "ライトモードに切替" : "ダークモードに切替"}
      className="h-8 w-8 px-0"
    >
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  )
}
