import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import {
  AssetsService,
  type AssetInstrumentCreate,
  type AssetInstrumentUpdate,
} from "@/client"

export const assetsBaseQueryKey = ["admin", "assets"] as const

export function useAssets(params: {
  assetType?: string
  isActive?: boolean
  status?: string
  query?: string
}) {
  return useQuery({
    queryFn: () =>
      AssetsService.readAssets({
        assetType: params.assetType,
        isActive: params.isActive,
        status: params.status,
        query: params.query,
      }),
    queryKey: [...assetsBaseQueryKey, params],
  })
}

export function useCreateAsset() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (requestBody: AssetInstrumentCreate) =>
      AssetsService.createAsset({ requestBody }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assetsBaseQueryKey })
    },
  })
}

export function useUpdateAsset() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      assetId,
      requestBody,
    }: {
      assetId: string
      requestBody: AssetInstrumentUpdate
    }) => AssetsService.updateAsset({ assetId, requestBody }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assetsBaseQueryKey })
    },
  })
}
