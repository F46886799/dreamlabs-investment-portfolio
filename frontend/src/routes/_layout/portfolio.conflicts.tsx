import { createFileRoute } from "@tanstack/react-router"
import type { ColumnDef } from "@tanstack/react-table"

import type { AuditEventPublic } from "@/client"
import { DataTable } from "@/components/Common/DataTable"
import { ConflictBadge } from "@/components/Portfolio/ConflictBadge"
import { useAuditEvents } from "@/hooks/useAuditEvents"

const conflictColumns: ColumnDef<AuditEventPublic>[] = [
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
    accessorKey: "entity_type",
    header: "实体类型",
  },
  {
    accessorKey: "entity_id",
    header: "实体 ID",
    cell: ({ row }) => (
      <span className="font-mono text-xs text-muted-foreground">
        {row.original.entity_id}
      </span>
    ),
  },
  {
    accessorKey: "changed_fields",
    header: "冲突字段",
    cell: ({ row }) => row.original.changed_fields || "-",
  },
]

export const Route = createFileRoute("/_layout/portfolio/conflicts")({
  component: PortfolioConflicts,
  head: () => ({
    meta: [
      {
        title: "Portfolio Conflicts - FastAPI Template",
      },
    ],
  }),
})

function PortfolioConflicts() {
  const { data, isLoading } = useAuditEvents()
  const conflicts =
    data?.data.filter(
      (event) => event.event_type === "normalization_conflict",
    ) ?? []

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">标准化冲突</h1>
        <p className="text-muted-foreground">查看待处理的资产映射冲突记录</p>
      </div>

      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">冲突事件列表</h2>
        <ConflictBadge count={conflicts.length} />
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">加载中...</p>
      ) : (
        <DataTable columns={conflictColumns} data={conflicts} />
      )}
    </div>
  )
}
