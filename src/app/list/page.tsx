import { Suspense } from "react"
import DashboardPage from "../dashboard-page"

export default function ListPage() {
  return (
    <Suspense>
      <DashboardPage routeTab="list" />
    </Suspense>
  )
}
