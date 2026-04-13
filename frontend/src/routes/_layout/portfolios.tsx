import { createFileRoute } from "@tanstack/react-router"

import { PortfolioFormDialog } from "@/components/Portfolios/PortfolioFormDialog"
import { PortfoliosTable } from "@/components/Portfolios/PortfoliosTable"
import { useAccounts } from "@/hooks/useAccounts"
import { usePortfolios } from "@/hooks/usePortfolios"

export const Route = createFileRoute("/_layout/portfolios")({
  component: PortfoliosPage,
  head: () => ({
    meta: [
      {
        title: "Portfolios - FastAPI Template",
      },
    ],
  }),
})

function PortfoliosPage() {
  const { data: accounts, isLoading: isAccountsLoading } = useAccounts({
    includeInactive: true,
  })
  const { data: portfolios, isLoading: isPortfoliosLoading } = usePortfolios({
    includeInactive: true,
  })

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">组合管理</h1>
          <p className="text-muted-foreground">维护账户下的投资组合主数据</p>
        </div>
        <PortfolioFormDialog accounts={accounts?.data ?? []} mode="create" />
      </div>

      {isAccountsLoading || isPortfoliosLoading ? (
        <p className="text-sm text-muted-foreground">加载中...</p>
      ) : (
        <PortfoliosTable
          accounts={accounts?.data ?? []}
          data={portfolios?.data ?? []}
        />
      )}
    </div>
  )
}
