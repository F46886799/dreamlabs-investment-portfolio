import { useQuery } from "@tanstack/react-query"

import { PortfolioService } from "@/client"

export const portfolioHealthQueryOptions = {
  queryFn: () => PortfolioService.getHealthReport(),
  queryKey: ["portfolio", "health-report"],
}

export function usePortfolioHealth() {
  return useQuery(portfolioHealthQueryOptions)
}
