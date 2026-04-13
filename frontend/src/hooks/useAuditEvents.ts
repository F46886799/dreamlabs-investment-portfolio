import { useQuery } from "@tanstack/react-query"

import { PortfolioService } from "@/client"

export const portfolioAuditEventsQueryOptions = {
  queryFn: () => PortfolioService.getAuditEvents(),
  queryKey: ["portfolio", "audit-events"],
}

export function useAuditEvents() {
  return useQuery(portfolioAuditEventsQueryOptions)
}
