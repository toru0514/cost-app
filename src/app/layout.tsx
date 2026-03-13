import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"

import { ErrorBoundary } from "@/components/error-boundary"
import { Toaster } from "@/components/ui/toaster"
import { Providers } from "./providers"

import "./globals.css"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "コスト設計ダッシュボード",
  description: "原価計算・分析を一元管理するダッシュボード",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ja">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Providers>
          <ErrorBoundary>{children}</ErrorBoundary>
        </Providers>
        <Toaster />
      </body>
    </html>
  )
}
