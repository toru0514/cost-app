"use client"

import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import Typography from "@mui/material/Typography"

interface MuiTablePaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}

export function MuiTablePagination({ currentPage, totalPages, onPageChange }: MuiTablePaginationProps) {
  if (totalPages <= 1) return null

  return (
    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 1, py: 1 }}>
      <Typography variant="caption" color="text.secondary">
        {currentPage} / {totalPages} ページ
      </Typography>
      <Box sx={{ display: "flex", gap: 0.5 }}>
        <Button
          variant="outlined"
          size="small"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          sx={{ minWidth: "auto", px: 1.5, fontSize: "0.75rem" }}
        >
          前へ
        </Button>
        <Button
          variant="outlined"
          size="small"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          sx={{ minWidth: "auto", px: 1.5, fontSize: "0.75rem" }}
        >
          次へ
        </Button>
      </Box>
    </Box>
  )
}
