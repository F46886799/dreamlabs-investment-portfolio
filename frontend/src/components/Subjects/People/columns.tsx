import type { ColumnDef } from "@tanstack/react-table";
import { Check, Copy } from "lucide-react";

import type { PersonPublic, PersonType } from "@/client";
import { Button } from "@/components/ui/button";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import { cn } from "@/lib/utils";

import PersonActionsMenu from "./PersonActionsMenu";

const personTypeLabels: Record<PersonType, string> = {
  internal_member: "内部成员",
  client_contact: "客户联系人",
  external_advisor: "外部顾问",
  other: "其他",
};

function CopyId({ id }: { id: string }) {
  const [copiedText, copy] = useCopyToClipboard();
  const isCopied = copiedText === id;

  return (
    <div className="group flex items-center gap-1.5">
      <span className="font-mono text-xs text-muted-foreground">{id}</span>
      <Button
        variant="ghost"
        size="icon"
        className="size-6 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100"
        onClick={() => copy(id)}
      >
        {isCopied ? (
          <Check className="size-3 text-green-600" />
        ) : (
          <Copy className="size-3" />
        )}
        <span className="sr-only">复制 ID</span>
      </Button>
    </div>
  );
}

export const columns: ColumnDef<PersonPublic>[] = [
  {
    accessorKey: "id",
    header: "ID",
    cell: ({ row }) => <CopyId id={row.original.id} />,
  },
  {
    accessorKey: "name",
    header: "姓名",
    cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
  },
  {
    accessorKey: "alias",
    header: "别名",
    cell: ({ row }) => {
      const alias = row.original.alias;
      return (
        <span
          className={cn(
            "block max-w-48 truncate text-muted-foreground",
            !alias && "italic",
          )}
        >
          {alias || "未设置别名"}
        </span>
      );
    },
  },
  {
    accessorKey: "person_type",
    header: "人员类型",
    cell: ({ row }) => (
      <span className="text-sm text-foreground">
        {personTypeLabels[row.original.person_type]}
      </span>
    ),
  },
  {
    accessorKey: "notes",
    header: "备注",
    cell: ({ row }) => {
      const notes = row.original.notes;
      return (
        <span
          className={cn(
            "block max-w-sm truncate text-muted-foreground",
            !notes && "italic",
          )}
        >
          {notes || "暂无备注"}
        </span>
      );
    },
  },
  {
    id: "actions",
    header: () => <span className="sr-only">操作</span>,
    cell: ({ row }) => (
      <div className="flex justify-end">
        <PersonActionsMenu person={row.original} />
      </div>
    ),
  },
];
