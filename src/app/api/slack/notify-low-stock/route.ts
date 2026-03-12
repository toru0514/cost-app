import { NextResponse } from "next/server"

import { authenticateApiRequest } from "@/lib/server/api-auth"

export async function POST(request: Request) {
  const auth = await authenticateApiRequest(request)
  if ("error" in auth) return auth.error

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
