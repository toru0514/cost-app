import { Suspense } from "react"
import DashboardPage from "../dashboard-page"

export default function BulkPage() {
  return (
    <Suspense>
      <DashboardPage routeTab="bulk" />
    </Suspense>
  )
}
