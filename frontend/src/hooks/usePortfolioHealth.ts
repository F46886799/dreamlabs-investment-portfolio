import { useQuery } from "@tanstack/react-query"

import { PortfolioService } from "@/client"

export function portfolioHealthQueryOptions(
  accountId?: string,
  portfolioId?: string,
) {
  return {
    queryFn: () =>
      PortfolioService.getHealthReport({
        accountId,
        portfolioId,
      }),
    queryKey: [
      "portfolio",
      "health-report",
      accountId ?? "all",
      portfolioId ?? "all",
    ],
  }
}

export function usePortfolioHealth(accountId?: string, portfolioId?: string) {
  return useQuery(portfolioHealthQueryOptions(accountId, portfolioId))
}
