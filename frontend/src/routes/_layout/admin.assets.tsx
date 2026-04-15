import { createFileRoute, redirect } from "@tanstack/react-router"
import { useState } from "react"

import { UsersService } from "@/client"
import { AddAssetDialog } from "@/components/Admin/Assets/AddAssetDialog"
import { assetColumns } from "@/components/Admin/Assets/AssetColumns"
import { AssetFilters } from "@/components/Admin/Assets/AssetFilters"
import { DataTable } from "@/components/Common/DataTable"
import { useAssets } from "@/hooks/useAssets"

export const Route = createFileRoute("/_layout/admin/assets")({
  component: AssetsAdmin,
  beforeLoad: async () => {
    const user = await UsersService.readUserMe()
    if (!user.is_superuser) {
      throw redirect({ to: "/" })
    }
  },
  head: () => ({
    meta: [{ title: "Asset Instruments - Admin" }],
  }),
})

function AssetsAdmin() {
  const [assetType, setAssetType] = useState("all")
  const [query, setQuery] = useState("")

  const { data, isLoading } = useAssets({
    assetType: assetType === "all" ? undefined : assetType,
    query: query || undefined,
  })

  const assets = data?.data ?? []

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Asset Instruments</h1>
          <p className="text-muted-foreground">
            Manage the global catalog of financial instruments
          </p>
        </div>
        <AddAssetDialog />
      </div>
      <AssetFilters
        assetType={assetType}
        query={query}
        onAssetTypeChange={setAssetType}
        onQueryChange={setQuery}
      />
      {isLoading ? (
        <div className="text-muted-foreground text-sm">Loading assets…</div>
      ) : (
        <DataTable columns={assetColumns} data={assets} />
      )}
    </div>
  )
}
