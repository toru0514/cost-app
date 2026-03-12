import { Suspense } from "react"
import DashboardPage from "../dashboard-page"
import { getServerAppData } from "@/lib/server/get-server-app-data"

export default async function ProductPage() {
  const initialData = await getServerAppData()
  return (
    <Suspense>
      <DashboardPage routeTab="product" initialData={initialData} />
    </Suspense>
  )
}
