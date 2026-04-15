import type { ColumnDef } from "@tanstack/react-table"

import type { AssetInstrumentPublic } from "@/client"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { EditAssetDialog } from "./EditAssetDialog"

export const assetColumns: ColumnDef<AssetInstrumentPublic>[] = [
  {
    accessorKey: "symbol",
    header: "Symbol",
    cell: ({ row }) => (
      <span className="font-mono font-semibold text-primary">
        {row.original.symbol.toUpperCase()}
      </span>
    ),
  },
  {
    accessorKey: "display_name",
    header: "Name",
  },
  {
    accessorKey: "asset_type",
    header: "Type",
    cell: ({ row }) => (
      <Badge variant="secondary">{row.original.asset_type}</Badge>
    ),
  },
  {
    accessorKey: "exchange",
    header: "Exchange",
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.original.exchange ?? "—"}</span>
    ),
  },
  {
    accessorKey: "currency",
    header: "Currency",
    cell: ({ row }) => (
      <span className="font-mono tabular-nums">{row.original.currency ?? "—"}</span>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "size-2 rounded-full",
            row.original.is_active ? "bg-green-500" : "bg-gray-400",
          )}
        />
        <span className={row.original.is_active ? "" : "text-muted-foreground"}>
          {row.original.status}
        </span>
      </div>
    ),
  },
  {
    accessorKey: "sync_status",
    header: "Sync",
    cell: ({ row }) => (
      <Badge
        variant="outline"
        className={
          row.original.sync_status === "manual"
            ? "border-amber-600 text-amber-700"
            : "border-green-600 text-green-700"
        }
      >
        {row.original.sync_status}
      </Badge>
    ),
  },
  {
    id: "actions",
    header: () => <span className="sr-only">Actions</span>,
    cell: ({ row }) => (
      <div className="flex justify-end">
        <EditAssetDialog asset={row.original} />
      </div>
    ),
  },
]
