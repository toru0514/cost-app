"use client"

import { createTheme } from "@mui/material/styles"

// OKLch values from globals.css mapped to approximate hex for MUI palette
// Light mode colors
const lightPalette = {
  background: { default: "#ffffff", paper: "#ffffff" },
  text: { primary: "#1a1a1a", secondary: "#838383" },
  primary: { main: "#2e2e2e", contrastText: "#fafafa" },
  secondary: { main: "#f7f7f7", contrastText: "#2e2e2e" },
  error: { main: "#dc2626" },
  divider: "rgba(0,0,0,0.12)",
}

const darkPalette = {
  background: { default: "#1a1a1a", paper: "#2e2e2e" },
  text: { primary: "#fafafa", secondary: "#a3a3a3" },
  primary: { main: "#e5e5e5", contrastText: "#2e2e2e" },
  secondary: { main: "#3a3a3a", contrastText: "#fafafa" },
  error: { main: "#ef4444" },
  divider: "rgba(255,255,255,0.1)",
}

export function createAppTheme(mode: "light" | "dark" = "light") {
  const palette = mode === "light" ? lightPalette : darkPalette

  return createTheme({
    palette: {
      mode,
      ...palette,
    },
    typography: {
      fontFamily: "var(--font-geist-sans), sans-serif",
      fontSize: 14,
    },
    shape: {
      borderRadius: 10, // matches --radius: 0.625rem
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          // Don't reset body styles - let Tailwind handle that for non-MUI pages
          body: {
            // Intentionally empty - avoid conflicts with Tailwind base
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: {
            whiteSpace: "nowrap",
            padding: "8px",
            fontSize: "0.875rem",
          },
          head: {
            fontWeight: 600,
          },
        },
      },
      MuiTableRow: {
        styleOverrides: {
          root: {
            "&:hover": {
              backgroundColor: mode === "light" ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.04)",
            },
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: "none",
            fontWeight: 500,
          },
          sizeSmall: {
            fontSize: "0.75rem",
            padding: "4px 10px",
          },
        },
      },
      MuiAccordion: {
        styleOverrides: {
          root: {
            border: `1px solid ${palette.divider}`,
            borderRadius: "10px !important",
            "&:before": { display: "none" },
            boxShadow: "none",
          },
        },
      },
      MuiAccordionSummary: {
        styleOverrides: {
          root: {
            minHeight: 40,
            "&.Mui-expanded": { minHeight: 40 },
            borderRadius: "10px",
          },
          content: {
            margin: "8px 0",
            "&.Mui-expanded": { margin: "8px 0" },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: "none",
          },
        },
      },
    },
  })
}
