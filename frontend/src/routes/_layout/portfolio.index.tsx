import { createFileRoute } from "@tanstack/react-router"

import { ConflictBadge } from "@/components/Portfolio/ConflictBadge"
import { PortfolioDataTable } from "@/components/Portfolio/PortfolioDataTable"
import { PortfolioMetricsCard } from "@/components/Portfolio/PortfolioMetricsCard"
import { StaleDataAlert } from "@/components/Portfolio/StaleDataAlert"
import { SyncButton } from "@/components/Portfolio/SyncButton"
import { usePortfolioData } from "@/hooks/usePortfolioData"
import { usePortfolioHealth } from "@/hooks/usePortfolioHealth"
import { useSyncConnector } from "@/hooks/useSyncConnector"

export const Route = createFileRoute("/_layout/portfolio/")({
  component: PortfolioOverview,
})

function PortfolioOverview() {
  const { data: portfolio, isLoading: isPortfolioLoading } = usePortfolioData()
  const { data: health, isLoading: isHealthLoading } = usePortfolioHealth()
  const syncMutation = useSyncConnector()

  const totalMarketValue = health?.total_market_value_usd ?? 0
  const positionsCount = health?.positions_count ?? 0
  const assetClassCount = health?.asset_class_count ?? 0
  const anomalyCount = health?.anomaly_count ?? 0

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-end">
        <SyncButton
          loading={syncMutation.isPending}
          onSync={() => syncMutation.mutate(undefined)}
        />
      </div>

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
