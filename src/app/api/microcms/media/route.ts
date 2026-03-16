import { NextRequest, NextResponse } from "next/server"

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]

function getMicroCmsConfig() {
  const serviceDomain = process.env.MICROCMS_SERVICE_DOMAIN
  const apiKey = process.env.MICROCMS_API_KEY
  if (!serviceDomain || !apiKey) return null
  return { serviceDomain, apiKey }
}

export async function GET(request: NextRequest) {
  const config = getMicroCmsConfig()
  if (!config) {
    return NextResponse.json(
      { error: "microCMS環境変数が設定されていません" },
      { status: 503 }
    )
  }

  const { searchParams } = request.nextUrl
  const limit = Math.min(Number(searchParams.get("limit") ?? 30), 100)
  const token = searchParams.get("token")

  const url = new URL(
    `https://${config.serviceDomain}.microcms-management.io/api/v2/media`
  )
  url.searchParams.set("limit", String(limit))
  url.searchParams.set("imageOnly", "true")
  if (token) {
    url.searchParams.set("token", token)
  }

  const response = await fetch(url.toString(), {
    headers: { "X-MICROCMS-API-KEY": config.apiKey },
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

export async function POST(request: NextRequest) {
  const config = getMicroCmsConfig()
  if (!config) {
    return NextResponse.json(
      { error: "microCMS環境変数が設定されていません" },
      { status: 503 }
    )
  }

  const formData = await request.formData()
  const file = formData.get("file")

  if (!file || !(file instanceof File)) {
    return NextResponse.json(
      { error: "ファイルが指定されていません" },
      { status: 400 }
    )
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "画像ファイルのみアップロードできます（JPEG, PNG, WebP, HEIC）" },
      { status: 400 }
    )
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "ファイルサイズは10MB以下にしてください" },
      { status: 400 }
    )
  }

  const uploadForm = new FormData()
  uploadForm.append("file", file)

  const url = `https://${config.serviceDomain}.microcms-management.io/api/v1/media`
  const response = await fetch(url, {
    method: "POST",
    headers: { "X-MICROCMS-API-KEY": config.apiKey },
    body: uploadForm,
  })

  if (!response.ok) {
    const body = await response.text()
    return NextResponse.json(
      { error: `microCMSアップロードエラー: ${body}` },
      { status: response.status }
    )
  }

  const data = await response.json()
  return NextResponse.json(data, { status: 201 })
}
