import { createFileRoute } from "@tanstack/react-router"

import { AccountFormDialog } from "@/components/Accounts/AccountFormDialog"
import { AccountsTable } from "@/components/Accounts/AccountsTable"
import { useAccounts } from "@/hooks/useAccounts"

export const Route = createFileRoute("/_layout/accounts")({
  component: AccountsPage,
  head: () => ({
    meta: [
      {
        title: "Accounts - FastAPI Template",
      },
    ],
  }),
})

function AccountsPage() {
  const { data, isLoading } = useAccounts({ includeInactive: true })

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">账户管理</h1>
          <p className="text-muted-foreground">维护证券账户与银行账户主数据</p>
        </div>
        <AccountFormDialog mode="create" />
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">加载中...</p>
      ) : (
        <AccountsTable data={data?.data ?? []} />
      )}
    </div>
  )
}
