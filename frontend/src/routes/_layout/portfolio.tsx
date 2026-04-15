import { createFileRoute, Outlet } from "@tanstack/react-router"

import { PortfolioNavigation } from "@/components/Portfolio/PortfolioNavigation"

export const Route = createFileRoute("/_layout/portfolio")({
  component: PortfolioLayout,
  head: () => ({
    meta: [
      {
        title: "Portfolio - FastAPI Template",
      },
    ],
  }),
})

function PortfolioLayout() {
  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">投资组合</h1>
        <p className="text-muted-foreground">统一持仓、冲突与审计视图</p>
      </div>
      <PortfolioNavigation />
      <Outlet />
    </div>
  )
}
