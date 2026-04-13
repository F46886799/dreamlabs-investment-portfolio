import type { ColumnDef } from "@tanstack/react-table"

import type { UnifiedPosition } from "@/client"
import { DataTable } from "@/components/Common/DataTable"

const columns: ColumnDef<UnifiedPosition>[] = [
  {
    accessorKey: "symbol",
    header: "代码",
    cell: ({ row }) => (
      <span className="font-semibold tracking-wide">{row.original.symbol}</span>
    ),
  },
  {
    accessorKey: "asset_class",
    header: "资产类别",
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.original.asset_class}</span>
    ),
  },
  {
    accessorKey: "quantity",
    header: "数量",
    cell: ({ row }) => (
      <span className="font-mono tabular-nums">{row.original.quantity.toFixed(4)}</span>
    ),
  },
  {
    accessorKey: "market_value_usd",
    header: "市值 (USD)",
    cell: ({ row }) => (
      <span className="font-mono tabular-nums">
        {new Intl.NumberFormat("en-US", {
          currency: "USD",
          minimumFractionDigits: 2,
          style: "currency",
        }).format(row.original.market_value_usd)}
      </span>
    ),
  },
]

interface PortfolioDataTableProps {
  data: UnifiedPosition[]
}

export function PortfolioDataTable({ data }: PortfolioDataTableProps) {
  return <DataTable columns={columns} data={data} />
}
