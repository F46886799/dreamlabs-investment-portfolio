import { useMutation, useQueryClient } from "@tanstack/react-query"

import {
  PortfolioService,
  type PortfolioSyncConnectorPositionsData,
} from "@/client"
import useCustomToast from "@/hooks/useCustomToast"

export function useSyncConnector(defaultSource = "demo-broker") {
  const queryClient = useQueryClient()
  const { showErrorToast, showSuccessToast } = useCustomToast()

  return useMutation({
    mutationFn: ({
      accountId,
      source = defaultSource,
    }: PortfolioSyncConnectorPositionsData) =>
      PortfolioService.syncConnectorPositions({
        accountId,
        source,
      }),
    onError: () => {
      showErrorToast("同步失败，请稍后重试")
    },
    onSuccess: (response) => {
      showSuccessToast(
        `同步完成：${response.synced_records} 条原始记录，${response.normalized_records} 条标准化，${response.conflict_records} 条冲突`,
      )
      queryClient.invalidateQueries({ queryKey: ["portfolio"] })
    },
  })
}
