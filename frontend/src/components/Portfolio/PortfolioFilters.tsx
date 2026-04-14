import type { AccountPublic, PortfolioPublic } from "@/client"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface PortfolioFiltersProps {
  accountId?: string
  portfolioId?: string
  accounts: AccountPublic[]
  portfolios: PortfolioPublic[]
  isAccountsLoading?: boolean
  isPortfoliosLoading?: boolean
  onAccountChange: (accountId?: string) => void
  onPortfolioChange: (portfolioId?: string) => void
}

export function PortfolioFilters({
  accountId,
  portfolioId,
  accounts,
  portfolios,
  isAccountsLoading = false,
  isPortfoliosLoading = false,
  onAccountChange,
  onPortfolioChange,
}: PortfolioFiltersProps) {
  const isPortfolioSelectBlocked = !accountId

  return (
    <div className="grid gap-4 rounded-lg border bg-card p-4 md:grid-cols-2">
      <div className="grid gap-2">
        <Label htmlFor="portfolio-account-filter">账户</Label>
        <Select
          disabled={isAccountsLoading}
          value={accountId ?? "all"}
          onValueChange={(value) =>
            onAccountChange(value === "all" ? undefined : value)
          }
        >
          <SelectTrigger
            id="portfolio-account-filter"
            aria-label="账户"
            className="w-full"
          >
            <SelectValue placeholder="全部账户" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部账户</SelectItem>
            {accounts.map((account) => (
              <SelectItem key={account.id} value={account.id}>
                {account.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="portfolio-portfolio-filter">组合</Label>
        <Select
          disabled={isPortfoliosLoading || isPortfolioSelectBlocked}
          value={isPortfolioSelectBlocked ? undefined : (portfolioId ?? "all")}
          onValueChange={(value) =>
            onPortfolioChange(value === "all" ? undefined : value)
          }
        >
          <SelectTrigger
            id="portfolio-portfolio-filter"
            aria-label="组合"
            aria-describedby={
              isPortfolioSelectBlocked
                ? "portfolio-filter-blocked-hint"
                : undefined
            }
            className="w-full"
          >
            <SelectValue
              placeholder={accountId ? "全部组合" : "请先选择账户后查看组合"}
            />
          </SelectTrigger>
          <SelectContent>
            {accountId ? <SelectItem value="all">全部组合</SelectItem> : null}
            {portfolios.map((portfolio) => (
              <SelectItem key={portfolio.id} value={portfolio.id}>
                {portfolio.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isPortfolioSelectBlocked ? (
          <p
            id="portfolio-filter-blocked-hint"
            className="text-xs text-muted-foreground"
          >
            请先选择账户后再筛选组合。
          </p>
        ) : null}
      </div>
    </div>
  )
}
