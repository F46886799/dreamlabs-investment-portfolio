import { useQuery } from "@tanstack/react-query"

import { PortfolioService } from "@/client"

export const portfolioDataQueryOptions = {
  queryFn: () => PortfolioService.getUnifiedPortfolio(),
  queryKey: ["portfolio", "unified"],
}

export function usePortfolioData() {
  return useQuery(portfolioDataQueryOptions)
}
