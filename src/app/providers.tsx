"use client"

import { ThemeProvider } from "@mui/material/styles"
import CssBaseline from "@mui/material/CssBaseline"

import { AuthProvider } from "@/lib/auth"
import { createAppTheme } from "@/lib/mui-theme"

const theme = createAppTheme("light")

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ThemeProvider theme={theme}>
        <CssBaseline enableColorScheme />
        {children}
      </ThemeProvider>
    </AuthProvider>
  )
}
