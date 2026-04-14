import type { ColumnDef } from "@tanstack/react-table"
import { useMemo } from "react"

import type { AccountPublic } from "@/client"
import { AccountFormDialog } from "@/components/Accounts/AccountFormDialog"
import { DataTable } from "@/components/Common/DataTable"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { LoadingButton } from "@/components/ui/loading-button"
import { useUpdateAccount } from "@/hooks/useAccounts"
import { cn } from "@/lib/utils"

const accountTypeLabel: Record<AccountPublic["account_type"], string> = {
  bank: "银行账户",
  brokerage: "证券账户",
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}

function AccountActions({ account }: { account: AccountPublic }) {
  const toggleMutation = useUpdateAccount({
    successMessage: account.is_active ? "账户已停用" : "账户已启用",
  })

  return (
    <div className="flex items-center justify-end gap-2">
      <AccountFormDialog
        mode="edit"
        account={account}
        trigger={
          <Button variant="outline" size="sm">
            编辑
          </Button>
        }
      />
      <LoadingButton
        type="button"
        size="sm"
        variant={account.is_active ? "outline" : "secondary"}
        loading={toggleMutation.isPending}
        onClick={() =>
          toggleMutation.mutate({
            accountId: account.id,
            requestBody: { is_active: !account.is_active },
          })
        }
      >
        {account.is_active ? "停用" : "启用"}
      </LoadingButton>
    </div>
  )
}

interface AccountsTableProps {
  data: AccountPublic[]
}

export function AccountsTable({ data }: AccountsTableProps) {
  const columns = useMemo<ColumnDef<AccountPublic>[]>(
    () => [
      {
        accessorKey: "name",
        header: "账户名称",
        cell: ({ row }) => (
          <span className="font-medium">{row.original.name}</span>
        ),
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
              row.original.account_type === "brokerage"
                ? "default"
                : "secondary"
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
            <span
              className={row.original.is_active ? "" : "text-muted-foreground"}
            >
              {row.original.is_active ? "启用" : "停用"}
            </span>
          </div>
        ),
      },
      {
        accessorKey: "updated_at",
        header: "Updated at",
        cell: ({ row }) => (
          <span className="font-mono tabular-nums text-muted-foreground">
            {formatDate(row.original.updated_at)}
          </span>
        ),
      },
      {
        id: "actions",
        header: () => <span className="sr-only">操作</span>,
        cell: ({ row }) => <AccountActions account={row.original} />,
      },
    ],
    [],
  )

  return <DataTable columns={columns} data={data} />
}
