import type { ColumnDef } from "@tanstack/react-table"
import { useMemo } from "react"

import type { AccountPublic, PortfolioPublic } from "@/client"
import { DataTable } from "@/components/Common/DataTable"
import { PortfolioFormDialog } from "@/components/Portfolios/PortfolioFormDialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { LoadingButton } from "@/components/ui/loading-button"
import { useUpdatePortfolio } from "@/hooks/usePortfolios"

interface PortfoliosTableProps {
  accounts: AccountPublic[]
  data: PortfolioPublic[]
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}

function PortfolioActions({
  accounts,
  portfolio,
}: {
  accounts: AccountPublic[]
  portfolio: PortfolioPublic
}) {
  const toggleMutation = useUpdatePortfolio({
    successMessage: portfolio.is_active ? "组合已停用" : "组合已启用",
  })

  return (
    <div className="flex items-center justify-end gap-2">
      <PortfolioFormDialog
        mode="edit"
        accounts={accounts}
        portfolio={portfolio}
        trigger={
          <Button variant="outline" size="sm">
            编辑
          </Button>
        }
      />
      <LoadingButton
        type="button"
        size="sm"
        variant={portfolio.is_active ? "outline" : "secondary"}
        loading={toggleMutation.isPending}
        onClick={() =>
          toggleMutation.mutate({
            portfolioId: portfolio.id,
            requestBody: { is_active: !portfolio.is_active },
          })
        }
      >
        {portfolio.is_active ? "停用" : "启用"}
      </LoadingButton>
    </div>
  )
}

export function PortfoliosTable({ accounts, data }: PortfoliosTableProps) {
  const accountNames = useMemo(
    () =>
      Object.fromEntries(accounts.map((account) => [account.id, account.name])),
    [accounts],
  )

  const columns = useMemo<ColumnDef<PortfolioPublic>[]>(
    () => [
      {
        accessorKey: "name",
        header: "组合名称",
        cell: ({ row }) => (
          <span className="font-medium">{row.original.name}</span>
        ),
      },
      {
        accessorKey: "account_id",
        header: "所属账户",
        cell: ({ row }) => (
          <div className="flex flex-col gap-1">
            <span>{accountNames[row.original.account_id] || "未知账户"}</span>
            <span className="font-mono tabular-nums text-xs text-muted-foreground">
              {row.original.account_id}
            </span>
          </div>
        ),
      },
      {
        accessorKey: "description",
        header: "描述",
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {row.original.description || "—"}
          </span>
        ),
      },
      {
        accessorKey: "is_active",
        header: "状态",
        cell: ({ row }) => (
          <Badge variant={row.original.is_active ? "secondary" : "outline"}>
            {row.original.is_active ? "启用" : "停用"}
          </Badge>
        ),
      },
      {
        accessorKey: "updated_at",
        header: "更新时间",
        cell: ({ row }) => (
          <span className="font-mono tabular-nums text-muted-foreground">
            {formatDate(row.original.updated_at)}
          </span>
        ),
      },
      {
        id: "actions",
        header: () => <span className="sr-only">操作</span>,
        cell: ({ row }) => (
          <PortfolioActions accounts={accounts} portfolio={row.original} />
        ),
      },
    ],
    [accountNames, accounts],
  )

  return <DataTable columns={columns} data={data} />
}
