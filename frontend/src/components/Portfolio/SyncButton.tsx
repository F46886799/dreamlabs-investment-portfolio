import { RefreshCw } from "lucide-react"

import { LoadingButton } from "@/components/ui/loading-button"

interface SyncButtonProps {
  disabled?: boolean
  loading: boolean
  onSync: () => void
}

export function SyncButton({
  disabled = false,
  loading,
  onSync,
}: SyncButtonProps) {
  return (
    <LoadingButton onClick={onSync} loading={loading} disabled={disabled}>
      <RefreshCw className="h-4 w-4" />
      立即同步
    </LoadingButton>
  )
}
