import { Suspense } from "react"
import DashboardPage from "../dashboard-page"

export default function ProductPage() {
  return (
    <Suspense>
      <DashboardPage routeTab="product" />
    </Suspense>
  )
}
