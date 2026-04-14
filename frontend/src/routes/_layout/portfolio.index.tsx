import { createFileRoute } from "@tanstack/react-router"
import { useEffect, useState } from "react"

import { ConflictBadge } from "@/components/Portfolio/ConflictBadge"
import { PortfolioDataTable } from "@/components/Portfolio/PortfolioDataTable"
import { PortfolioFilters } from "@/components/Portfolio/PortfolioFilters"
import { PortfolioMetricsCard } from "@/components/Portfolio/PortfolioMetricsCard"
import { StaleDataAlert } from "@/components/Portfolio/StaleDataAlert"
import { SyncButton } from "@/components/Portfolio/SyncButton"
import { useAccounts } from "@/hooks/useAccounts"
import useCustomToast from "@/hooks/useCustomToast"
import { usePortfolioData } from "@/hooks/usePortfolioData"
import { usePortfolioHealth } from "@/hooks/usePortfolioHealth"
import { usePortfolios } from "@/hooks/usePortfolios"
import { useSyncConnector } from "@/hooks/useSyncConnector"

export const Route = createFileRoute("/_layout/portfolio/")({
  component: PortfolioOverview,
})

function PortfolioOverview() {
  const [accountId, setAccountId] = useState<string>()
  const [portfolioId, setPortfolioId] = useState<string>()
  const { data: accounts, isLoading: isAccountsLoading } = useAccounts()
  const { data: portfolios, isLoading: isPortfoliosLoading } = usePortfolios({
    accountId,
  })
  const { data: portfolio, isLoading: isPortfolioLoading } = usePortfolioData(
    accountId,
    portfolioId,
  )
  const { data: health, isLoading: isHealthLoading } = usePortfolioHealth(
    accountId,
    portfolioId,
  )
  const { showErrorToast } = useCustomToast()
  const syncMutation = useSyncConnector()

  useEffect(() => {
    if (
      portfolioId &&
      !(portfolios?.data ?? []).some(
        (portfolioRecord) => portfolioRecord.id === portfolioId,
      )
    ) {
      setPortfolioId(undefined)
    }
  }, [portfolioId, portfolios?.data])

  const totalMarketValue = health?.total_market_value_usd ?? 0
  const positionsCount = health?.positions_count ?? 0
  const assetClassCount = health?.asset_class_count ?? 0
  const anomalyCount = health?.anomaly_count ?? 0

  const handleAccountChange = (nextAccountId?: string) => {
    setAccountId(nextAccountId)
    setPortfolioId(undefined)
  }

  const handleSync = () => {
    if (!accountId) {
      showErrorToast("请先选择账户后再同步。")
      return
    }

    syncMutation.mutate(accountId)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-end">
        <SyncButton
          disabled={isAccountsLoading || !accountId}
          loading={syncMutation.isPending}
          onSync={handleSync}
        />
      </div>

      <PortfolioFilters
        accountId={accountId}
        portfolioId={portfolioId}
        accounts={accounts?.data ?? []}
        portfolios={portfolios?.data ?? []}
        isAccountsLoading={isAccountsLoading}
        isPortfoliosLoading={isPortfoliosLoading}
        onAccountChange={handleAccountChange}
        onPortfolioChange={setPortfolioId}
      />

      <StaleDataAlert stale={portfolio?.stale ?? false} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <PortfolioMetricsCard
          label="总市值"
          value={new Intl.NumberFormat("en-US", {
            currency: "USD",
            minimumFractionDigits: 2,
            style: "currency",
          }).format(totalMarketValue)}
          hint={health?.week ? `报告周：${health.week}` : undefined}
        />
        <PortfolioMetricsCard
          label="持仓数"
          value={positionsCount.toString()}
          hint="按 symbol + asset_class 聚合"
        />
        <PortfolioMetricsCard
          label="资产类别"
          value={assetClassCount.toString()}
          hint="用于监控配置分散度"
        />
        <PortfolioMetricsCard
          label="待处理冲突"
          value={anomalyCount.toString()}
          hint="仅统计 pending 冲突"
        />
      </div>

      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">统一持仓</h2>
        <ConflictBadge count={anomalyCount} />
      </div>

      {isPortfolioLoading || isHealthLoading ? (
        <p className="text-sm text-muted-foreground">加载中...</p>
      ) : (
        <PortfolioDataTable data={portfolio?.data ?? []} />
      )}
    </div>
  )
}
