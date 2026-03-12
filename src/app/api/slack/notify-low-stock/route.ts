import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const token = authHeader.slice(7)

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 })
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  })
  const { data: userData, error: authError } = await supabase.auth.getUser()
  if (authError || !userData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const webhookUrl = process.env.SLACK_WEBHOOK_URL
  if (!webhookUrl) {
    return NextResponse.json({ error: "Slack webhook URL is not configured" }, { status: 500 })
  }

  const body = await request.json()
  const { itemName, currentStock, threshold, itemType } = body as {
    itemName: string
    currentStock: number
    threshold: number
    itemType: string
  }

  if (!itemName || currentStock === undefined || threshold === undefined) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  const itemTypeLabel =
    itemType === "product" ? "商品" : itemType === "material" ? "材料" : itemType === "packaging" ? "梱包材" : "アイテム"

  const slackPayload = {
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: "在庫アラート通知",
        },
      },
      {
        type: "section",
        fields: [
          { type: "mrkdwn", text: `*種別:*\n${itemTypeLabel}` },
          { type: "mrkdwn", text: `*名称:*\n${itemName}` },
          { type: "mrkdwn", text: `*現在在庫数:*\n${currentStock}` },
          { type: "mrkdwn", text: `*閾値:*\n${threshold}` },
        ],
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `在庫数が閾値以下になりました。補充をご検討ください。`,
          },
        ],
      },
    ],
  }

  try {
    const slackRes = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(slackPayload),
    })
    if (!slackRes.ok) {
      const text = await slackRes.text()
      console.error("Slack webhook error:", text)
      return NextResponse.json({ error: "Failed to send Slack notification" }, { status: 502 })
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("Slack webhook request failed:", err)
    return NextResponse.json({ error: "Failed to send Slack notification" }, { status: 502 })
  }
}
