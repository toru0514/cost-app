import { NextResponse } from "next/server"

import { authenticateApiRequest } from "@/lib/server/api-auth"

export async function POST(request: Request) {
  const auth = await authenticateApiRequest(request)
  if ("error" in auth) return auth.error

  try {
    const body = await request.json()
    const { webhook_url } = body as { webhook_url: string }

    if (!webhook_url || !webhook_url.startsWith("https://hooks.slack.com/services/")) {
      return NextResponse.json(
        { error: "Webhook URLはhttps://hooks.slack.com/services/で始まる必要があります" },
        { status: 400 }
      )
    }

    const testPayload = {
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "Slack連携テスト — この通知が見えれば設定は正しいです。",
          },
        },
      ],
    }

    const slackRes = await fetch(webhook_url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(testPayload),
    })
    if (!slackRes.ok) {
      const text = await slackRes.text()
      console.error("Slack test webhook error:", text)
      return NextResponse.json({ error: "Webhook URLへの送信に失敗しました" }, { status: 502 })
    }
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Error in POST /api/slack/test-webhook:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
