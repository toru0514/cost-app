import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const serviceDomain = process.env.MICROCMS_SERVICE_DOMAIN
  const apiKey = process.env.MICROCMS_API_KEY

  if (!serviceDomain || !apiKey) {
    return NextResponse.json(
      { error: "microCMS環境変数が設定されていません" },
      { status: 503 }
    )
  }

  const { searchParams } = request.nextUrl
  const limit = Math.min(Number(searchParams.get("limit") ?? 30), 100)
  const token = searchParams.get("token")

  const url = new URL(
    `https://${serviceDomain}.microcms-management.io/api/v2/media`
  )
  url.searchParams.set("limit", String(limit))
  url.searchParams.set("imageOnly", "true")
  if (token) {
    url.searchParams.set("token", token)
  }

  const response = await fetch(url.toString(), {
    headers: { "X-MICROCMS-API-KEY": apiKey },
  })

  if (!response.ok) {
    return NextResponse.json(
      { error: "microCMS APIエラー" },
      { status: response.status }
    )
  }

  const data = await response.json()
  return NextResponse.json(data)
}
