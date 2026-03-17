import { Suspense } from "react"
import { getServerAppData } from "@/lib/server/get-server-app-data"
import { TimeTrackPage } from "./timetrack-page"

export default async function TimeTrackRoute() {
  const initialData = await getServerAppData()
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-muted border-t-transparent" />
        </main>
      }
    >
      <TimeTrackPage initialData={initialData} />
    </Suspense>
  )
}
