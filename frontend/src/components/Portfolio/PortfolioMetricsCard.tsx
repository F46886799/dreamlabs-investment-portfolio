import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface PortfolioMetricsCardProps {
  label: string
  value: string
  hint?: string
}

export function PortfolioMetricsCard({
  label,
  value,
  hint,
}: PortfolioMetricsCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        <div className="text-2xl font-semibold font-mono tabular-nums">
          {value}
        </div>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  )
}
