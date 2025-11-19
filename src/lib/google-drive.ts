import { google } from "googleapis"

import { ensureEnv, loadServiceAccount } from "./google-sheets"

const DRIVE_SCOPE = ["https://www.googleapis.com/auth/drive"]

export async function createSpreadsheetFromTemplate({
  templateId,
  title,
  shareWithEmail,
}: {
  templateId: string
  title: string
  shareWithEmail?: string
}) {
  const creds = loadServiceAccount()
  const auth = new google.auth.JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: DRIVE_SCOPE,
  })
  const drive = google.drive({ version: "v3", auth })
  const copyResponse = await drive.files.copy({
    fileId: templateId,
    requestBody: {
      name: title,
      mimeType: "application/vnd.google-apps.spreadsheet",
    },
    fields: "id",
  })
  const spreadsheetId = copyResponse.data.id
  if (!spreadsheetId) {
    throw new Error("Failed to copy template spreadsheet")
  }
  if (shareWithEmail) {
    try {
      await drive.permissions.create({
        fileId: spreadsheetId,
        requestBody: {
          type: "user",
          role: "writer",
          emailAddress: shareWithEmail,
        },
        sendNotificationEmail: false,
      })
    } catch (error) {
      console.error("Failed to share spreadsheet", error)
    }
  }
  return { spreadsheetId }
}

export function getTemplateSpreadsheetId() {
  return ensureEnv("GOOGLE_SHEETS_TEMPLATE_ID")
}
