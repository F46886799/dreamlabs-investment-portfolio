import type { ColumnDef } from "@tanstack/react-table"
import type { OrganizationPublic, OrganizationType } from "@/client"
import { cn } from "@/lib/utils"

import OrganizationActionsMenu from "./OrganizationActionsMenu"

const organizationTypeLabels: Record<OrganizationType, string> = {
  fund_or_investment_vehicle: "基金/投资载体",
  broker_or_bank: "券商/银行",
  service_provider: "服务提供方",
  other: "其他",
}

export const columns: ColumnDef<OrganizationPublic>[] = [
  {
    accessorKey: "organization_type",
    header: "类型",
    cell: ({ row }) => (
      <span className="text-sm text-foreground">
        {organizationTypeLabels[row.original.organization_type]}
      </span>
    ),
  },
  {
    accessorKey: "name",
    header: "机构名称",
    cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
  },
  {
    accessorKey: "alias",
    header: "别名",
    cell: ({ row }) => {
      const alias = row.original.alias
      return (
        <span
          className={cn(
            "block max-w-48 truncate text-muted-foreground",
            !alias && "italic",
          )}
        >
          {alias || "未设置别名"}
        </span>
      )
    },
  },
  {
    accessorKey: "notes",
    header: "备注",
    cell: ({ row }) => {
      const notes = row.original.notes
      return (
        <span
          className={cn(
            "block max-w-sm truncate text-muted-foreground",
            !notes && "italic",
          )}
        >
          {notes || "暂无备注"}
        </span>
      )
    },
  },
  {
    id: "actions",
    header: () => <span className="sr-only">操作</span>,
    cell: ({ row }) => (
      <div className="flex justify-end">
        <OrganizationActionsMenu organization={row.original} />
      </div>
    ),
  },
]
