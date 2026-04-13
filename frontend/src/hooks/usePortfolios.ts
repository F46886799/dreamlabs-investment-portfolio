import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { type PortfolioCreate, PortfoliosService } from "@/client"
import useCustomToast from "@/hooks/useCustomToast"
import { handleError } from "@/utils"

export function portfoliosQueryOptions(includeInactive = false) {
  return {
    queryFn: () => PortfoliosService.readPortfolios({ includeInactive }),
    queryKey: ["portfolios", { includeInactive }],
  }
}

export function usePortfolios(options?: { includeInactive?: boolean }) {
  return useQuery(portfoliosQueryOptions(options?.includeInactive ?? false))
}

export function useCreatePortfolio(onSuccess?: () => void) {
  const queryClient = useQueryClient()
  const { showErrorToast, showSuccessToast } = useCustomToast()

  return useMutation({
    mutationFn: (data: PortfolioCreate) =>
      PortfoliosService.createPortfolio({ requestBody: data }),
    onError: handleError.bind(showErrorToast),
    onSuccess: () => {
      showSuccessToast("组合创建成功")
      onSuccess?.()
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["portfolios"] })
    },
  })
}
