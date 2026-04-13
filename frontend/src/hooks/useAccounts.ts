import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { type AccountCreate, AccountsService } from "@/client"
import useCustomToast from "@/hooks/useCustomToast"
import { handleError } from "@/utils"

export function accountsQueryOptions(includeInactive = false) {
  return {
    queryFn: () => AccountsService.readAccounts({ includeInactive }),
    queryKey: ["accounts", { includeInactive }],
  }
}

export function useAccounts(options?: { includeInactive?: boolean }) {
  return useQuery(accountsQueryOptions(options?.includeInactive ?? false))
}

export function useCreateAccount(onSuccess?: () => void) {
  const queryClient = useQueryClient()
  const { showErrorToast, showSuccessToast } = useCustomToast()

  return useMutation({
    mutationFn: (data: AccountCreate) =>
      AccountsService.createAccount({ requestBody: data }),
    onError: handleError.bind(showErrorToast),
    onSuccess: () => {
      showSuccessToast("账户创建成功")
      onSuccess?.()
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] })
    },
  })
}
