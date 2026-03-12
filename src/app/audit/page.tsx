import { Suspense } from "react"
import DashboardPage from "../dashboard-page"

export default function AuditPage() {
  return (
    <Suspense>
      <DashboardPage routeTab="audit" />
    </Suspense>
  )
}
