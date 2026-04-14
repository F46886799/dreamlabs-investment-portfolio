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
          disabled={isPortfoliosLoading || !accountId}
          value={portfolioId ?? "all"}
          onValueChange={(value) =>
            onPortfolioChange(value === "all" ? undefined : value)
          }
        >
          <SelectTrigger
            id="portfolio-portfolio-filter"
            aria-label="组合"
            className="w-full"
          >
            <SelectValue
              placeholder={accountId ? "全部组合" : "请先选择账户"}
            />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部组合</SelectItem>
            {portfolios.map((portfolio) => (
              <SelectItem key={portfolio.id} value={portfolio.id}>
                {portfolio.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
