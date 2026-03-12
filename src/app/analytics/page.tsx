import { Suspense } from "react"
import DashboardPage from "../dashboard-page"

export default function AnalyticsPage() {
  return (
    <Suspense>
      <DashboardPage routeTab="analytics" />
    </Suspense>
  )
}
