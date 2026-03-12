import { Suspense } from "react"
import DashboardPage from "../dashboard-page"

export default function MasterPage() {
  return (
    <Suspense>
      <DashboardPage routeTab="master" />
    </Suspense>
  )
}
