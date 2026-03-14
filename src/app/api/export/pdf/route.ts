import { NextResponse } from "next/server"
import { generatePdf } from "@/lib/export/pdf-generator"
import type { AppData } from "@/lib/types"

export async function POST(request: Request) {
  try {
    const data: AppData = await request.json()

    if (!data || !data.products) {
      return NextResponse.json(
        { error: "Invalid data format" },
        { status: 400 }
      )
    }

    const pdfBlob = await generatePdf(data)
    const buffer = await pdfBlob.arrayBuffer()

    const filename = `cost-report-${new Date().toISOString().slice(0, 10)}.pdf`

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error("PDF generation error:", error)
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    )
  }
}
