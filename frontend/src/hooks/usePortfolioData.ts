import { useQuery } from "@tanstack/react-query"

import { PortfolioService } from "@/client"

export function portfolioDataQueryOptions(
  accountId?: string,
  portfolioId?: string,
) {
  return {
    queryFn: () =>
      PortfolioService.getUnifiedPortfolio({
        accountId,
        portfolioId,
      }),
    queryKey: [
      "portfolio",
      "unified",
      accountId ?? "all",
      portfolioId ?? "all",
    ],
  }
}

export function usePortfolioData(accountId?: string, portfolioId?: string) {
  return useQuery(portfolioDataQueryOptions(accountId, portfolioId))
}
