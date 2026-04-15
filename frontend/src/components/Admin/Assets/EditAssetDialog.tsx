import { useState } from "react"

import type { AssetInstrumentPublic } from "@/client"
import type { ApiError } from "@/client"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { LoadingButton } from "@/components/ui/loading-button"
import { useUpdateAsset } from "@/hooks/useAssets"
import useCustomToast from "@/hooks/useCustomToast"
import { handleError } from "@/utils"

type EditAssetDialogProps = {
  asset: AssetInstrumentPublic
}

export function EditAssetDialog({ asset }: EditAssetDialogProps) {
  const [open, setOpen] = useState(false)
  const updateAsset = useUpdateAsset()
  const { showSuccessToast, showErrorToast } = useCustomToast()

  const handleToggleActive = () => {
    updateAsset.mutate(
      {
        assetId: asset.id,
        requestBody: { is_active: !asset.is_active },
      },
      {
        onSuccess: () => {
          showSuccessToast(
            asset.is_active
              ? `${asset.symbol} deactivated`
              : `${asset.symbol} activated`,
          )
          setOpen(false)
        },
        onError: (error) => handleError.call(showErrorToast, error as ApiError),
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {asset.symbol.toUpperCase()} — {asset.display_name}
          </DialogTitle>
          <DialogDescription>
            Update asset metadata or change its active state.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">Type</span>
            <span className="font-medium capitalize">{asset.asset_type}</span>
          </div>
          <div className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">Exchange</span>
            <span className="font-medium">{asset.exchange ?? "—"}</span>
          </div>
          <div className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">Currency</span>
            <span className="font-mono tabular-nums">{asset.currency ?? "—"}</span>
          </div>
          <div className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">Status</span>
            <span className="font-medium">{asset.status}</span>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={updateAsset.isPending}
          >
            Cancel
          </Button>
          <LoadingButton
            variant={asset.is_active ? "destructive" : "default"}
            loading={updateAsset.isPending}
            onClick={handleToggleActive}
          >
            {asset.is_active ? "Deactivate" : "Activate"}
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
