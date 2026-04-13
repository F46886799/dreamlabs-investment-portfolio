import { RefreshCw } from "lucide-react"

import { LoadingButton } from "@/components/ui/loading-button"

interface SyncButtonProps {
  loading: boolean
  onSync: () => void
}

export function SyncButton({ loading, onSync }: SyncButtonProps) {
  return (
    <LoadingButton onClick={onSync} loading={loading}>
      <RefreshCw className="h-4 w-4" />
      立即同步
    </LoadingButton>
  )
}
