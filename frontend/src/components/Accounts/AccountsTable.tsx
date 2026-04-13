import type { ColumnDef } from "@tanstack/react-table"

import type { AccountPublic } from "@/client"
import { DataTable } from "@/components/Common/DataTable"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const accountTypeLabel: Record<AccountPublic["account_type"], string> = {
  bank: "银行账户",
  brokerage: "证券账户",
}

const columns: ColumnDef<AccountPublic>[] = [
  {
    accessorKey: "name",
    header: "账户名称",
    cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
  },
  {
    accessorKey: "institution_name",
    header: "机构",
  },
  {
    accessorKey: "account_type",
    header: "类型",
    cell: ({ row }) => (
      <Badge
        variant={
          row.original.account_type === "brokerage" ? "default" : "secondary"
        }
      >
        {accountTypeLabel[row.original.account_type]}
      </Badge>
    ),
  },
  {
    accessorKey: "account_mask",
    header: "掩码",
    cell: ({ row }) => (
      <span className="font-mono tabular-nums text-muted-foreground">
        {row.original.account_mask || "—"}
      </span>
    ),
  },
  {
    accessorKey: "base_currency",
    header: "基础币种",
    cell: ({ row }) => (
      <span className="font-mono tabular-nums">
        {row.original.base_currency}
      </span>
    ),
  },
  {
    accessorKey: "is_active",
    header: "状态",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "size-2 rounded-full",
            row.original.is_active ? "bg-green-600" : "bg-muted-foreground",
          )}
        />
        <span className={row.original.is_active ? "" : "text-muted-foreground"}>
          {row.original.is_active ? "启用" : "停用"}
        </span>
      </div>
    ),
  },
]

interface AccountsTableProps {
  data: AccountPublic[]
}

export function AccountsTable({ data }: AccountsTableProps) {
  return <DataTable columns={columns} data={data} />
}
