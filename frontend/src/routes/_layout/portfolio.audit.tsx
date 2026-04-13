import type { ColumnDef } from "@tanstack/react-table"
import { createFileRoute } from "@tanstack/react-router"

import type { AuditEventPublic } from "@/client"
import { Badge } from "@/components/ui/badge"
import { DataTable } from "@/components/Common/DataTable"
import { useAuditEvents } from "@/hooks/useAuditEvents"

const auditColumns: ColumnDef<AuditEventPublic>[] = [
  {
    accessorKey: "created_at",
    header: "时间",
    cell: ({ row }) => (
      <span className="font-mono tabular-nums text-sm">
        {new Date(row.original.created_at).toLocaleString()}
      </span>
    ),
  },
  {
    accessorKey: "event_type",
    header: "事件",
    cell: ({ row }) => {
      const isConflict = row.original.event_type === "normalization_conflict"
      return (
        <Badge
          variant={isConflict ? "outline" : "secondary"}
          className={isConflict ? "border-amber-500 text-amber-600" : undefined}
        >
          {row.original.event_type}
        </Badge>
      )
    },
  },
  {
    accessorKey: "entity_type",
    header: "实体类型",
  },
  {
    accessorKey: "transform_version",
    header: "转换版本",
    cell: ({ row }) => row.original.transform_version || "-",
  },
  {
    accessorKey: "changed_fields",
    header: "变更字段",
    cell: ({ row }) => row.original.changed_fields || "-",
  },
]

export const Route = createFileRoute("/_layout/portfolio/audit")({
  component: PortfolioAudit,
  head: () => ({
    meta: [
      {
        title: "Portfolio Audit - FastAPI Template",
      },
    ],
  }),
})

function PortfolioAudit() {
  const { data, isLoading } = useAuditEvents()

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">审计日志</h1>
        <p className="text-muted-foreground">追踪数据标准化与冲突处理的完整链路</p>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">加载中...</p>
      ) : (
        <DataTable columns={auditColumns} data={data?.data ?? []} />
      )}
    </div>
  )
}
