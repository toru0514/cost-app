import { NextResponse } from "next/server"
import { authenticateApiRequest } from "@/lib/server/api-auth"
import { generateExcel } from "@/lib/export/excel-generator"
import type { AppData } from "@/lib/types"

export async function POST(request: Request) {
  try {
    const auth = await authenticateApiRequest(request)
    if ("error" in auth) return auth.error

    const data: AppData = await request.json()

    if (!data || !data.products) {
      return NextResponse.json(
        { error: "Invalid data format" },
        { status: 400 }
      )
    }

    const excelBlob = await generateExcel(data)
    const buffer = await excelBlob.arrayBuffer()

    const filename = `cost-report-${new Date().toISOString().slice(0, 10)}.xlsx`

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error("Excel generation error:", error)
    return NextResponse.json(
      { error: "Failed to generate Excel" },
      { status: 500 }
    )
  }
}
