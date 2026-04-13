import { AlertTriangle } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface StaleDataAlertProps {
  stale: boolean
}

export function StaleDataAlert({ stale }: StaleDataAlertProps) {
  if (!stale) {
    return null
  }

  return (
    <Alert className="border-amber-500/50 bg-amber-500/5 text-amber-700 dark:text-amber-400">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>数据可能过期</AlertTitle>
      <AlertDescription>
        当前没有最新标准化持仓，请先执行一次同步后再进行决策。
      </AlertDescription>
    </Alert>
  )
}
