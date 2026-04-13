import { AlertTriangle } from "lucide-react"

import { Badge } from "@/components/ui/badge"

interface ConflictBadgeProps {
  count: number
}

export function ConflictBadge({ count }: ConflictBadgeProps) {
  if (count <= 0) {
    return <Badge variant="secondary">0 冲突</Badge>
  }

  return (
    <Badge variant="outline" className="border-amber-500 text-amber-600">
      <AlertTriangle className="h-3 w-3" />
      {count} 冲突
    </Badge>
  )
}
