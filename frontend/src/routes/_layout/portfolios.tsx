import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"

import { PortfolioFormDialog } from "@/components/Portfolios/PortfolioFormDialog"
import { PortfoliosTable } from "@/components/Portfolios/PortfoliosTable"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
  const [accountId, setAccountId] = useState("all")
  const [includeInactive, setIncludeInactive] = useState(true)
  const { data: accounts, isLoading: isAccountsLoading } = useAccounts({
    includeInactive: true,
  })
  const { data: portfolios, isLoading: isPortfoliosLoading } = usePortfolios({
    accountId: accountId === "all" ? undefined : accountId,
    includeInactive,
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

      <div className="flex flex-col gap-4 rounded-lg border bg-card p-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="grid gap-2">
          <Label htmlFor="portfolio-account-filter">账户筛选</Label>
          <Select
            disabled={isAccountsLoading}
            value={accountId}
            onValueChange={setAccountId}
          >
            <SelectTrigger
              id="portfolio-account-filter"
              aria-label="账户筛选"
              className="w-full sm:w-64"
            >
              <SelectValue placeholder="全部账户" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部账户</SelectItem>
              {(accounts?.data ?? []).map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  {account.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-3">
          <Checkbox
            id="portfolio-include-inactive-filter"
            aria-label="显示停用组合"
            checked={includeInactive}
            onCheckedChange={(checked) => setIncludeInactive(checked === true)}
          />
          <Label
            htmlFor="portfolio-include-inactive-filter"
            className="font-normal"
          >
            显示停用组合
          </Label>
        </div>
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
