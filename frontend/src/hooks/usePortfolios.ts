import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import {
  type PortfolioCreate,
  PortfoliosService,
  type PortfolioUpdate,
} from "@/client"
import useCustomToast from "@/hooks/useCustomToast"
import { handleError } from "@/utils"

export function portfoliosQueryOptions(options?: {
  accountId?: string
  includeInactive?: boolean
}) {
  const includeInactive = options?.includeInactive ?? false
  const accountId = options?.accountId

  return {
    queryFn: () =>
      PortfoliosService.readPortfolios({ accountId, includeInactive }),
    queryKey: ["portfolios", { accountId, includeInactive }],
  }
}

export function usePortfolios(options?: {
  accountId?: string
  includeInactive?: boolean
}) {
  return useQuery(portfoliosQueryOptions(options))
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

interface UpdatePortfolioVariables {
  portfolioId: string
  requestBody: PortfolioUpdate
}

export function useUpdatePortfolio(options?: {
  onSuccess?: () => void
  successMessage?: string
}) {
  const queryClient = useQueryClient()
  const { showErrorToast, showSuccessToast } = useCustomToast()

  return useMutation({
    mutationFn: ({ portfolioId, requestBody }: UpdatePortfolioVariables) =>
      PortfoliosService.updatePortfolio({ portfolioId, requestBody }),
    onError: handleError.bind(showErrorToast),
    onSuccess: () => {
      showSuccessToast(options?.successMessage ?? "组合更新成功")
      options?.onSuccess?.()
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["portfolios"] })
    },
  })
}
