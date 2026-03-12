import { Suspense } from "react"
import DashboardPage from "../dashboard-page"

export default function CostPage() {
  return (
    <Suspense>
      <DashboardPage routeTab="cost" />
    </Suspense>
  )
}
