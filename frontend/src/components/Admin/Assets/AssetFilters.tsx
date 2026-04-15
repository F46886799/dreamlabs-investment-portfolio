import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type AssetFiltersProps = {
  assetType: string
  query: string
  onAssetTypeChange: (value: string) => void
  onQueryChange: (value: string) => void
}

export function AssetFilters({
  assetType,
  query,
  onAssetTypeChange,
  onQueryChange,
}: AssetFiltersProps) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center">
      <Input
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        placeholder="Search by symbol or name"
        className="md:max-w-sm"
      />
      <Select value={assetType} onValueChange={onAssetTypeChange}>
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Asset Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Types</SelectItem>
          <SelectItem value="stock">Stock</SelectItem>
          <SelectItem value="etf">ETF</SelectItem>
          <SelectItem value="crypto">Crypto</SelectItem>
          <SelectItem value="bond">Bond</SelectItem>
          <SelectItem value="cash">Cash</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
