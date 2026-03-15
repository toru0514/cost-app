import { Resend } from "resend"

// Resendを遅延初期化（APIキーが設定されていない場合のビルドエラーを回避）
let resend: Resend | null = null

function getResend(): Resend {
  if (!resend) {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      throw new Error("RESEND_API_KEY is not configured")
    }
    resend = new Resend(apiKey)
  }
  return resend
}

export async function sendTeamInviteEmail(params: {
  to: string
  teamName: string
  inviteUrl: string
  inviterName?: string
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const { to, teamName, inviteUrl, inviterName } = params
  const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev"

  // デバッグログ: 送信前の情報
  console.log("[Email] Sending team invite email:", {
    to,
    from: fromEmail,
    teamName,
    hasApiKey: !!process.env.RESEND_API_KEY,
    apiKeyPrefix: process.env.RESEND_API_KEY?.substring(0, 8) + "...",
  })

  try {
    const response = await getResend().emails.send({
      from: fromEmail,
      to,
      subject: `${teamName} への招待`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">チーム招待</h2>
          <p style="color: #555; line-height: 1.6;">
            ${inviterName || "チーム管理者"}から <strong>${teamName}</strong> への招待が届きました。
          </p>
          <p style="margin: 30px 0;">
            <a href="${inviteUrl}" style="background: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              招待を受け入れる
            </a>
          </p>
          <p style="color: #888; font-size: 14px;">
            このリンクは7日間有効です。
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
          <p style="color: #999; font-size: 12px;">
            このメールに心当たりがない場合は、無視してください。
          </p>
        </div>
      `,
    })

    // デバッグログ: Resend APIレスポンス
    console.log("[Email] Resend API response:", {
      id: response.data?.id,
      error: response.error,
    })

    if (response.error) {
      console.error("[Email] Resend API error:", {
        name: response.error.name,
        message: response.error.message,
      })
      return { success: false, error: response.error.message }
    }

    return { success: true, messageId: response.data?.id }
  } catch (error) {
    // デバッグログ: 例外エラー
    console.error("[Email] Exception while sending email:", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}
