import { EllipsisVertical } from "lucide-react";
import { useState } from "react";

import type { OrganizationPublic } from "@/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import DeleteOrganization from "./DeleteOrganization";
import EditOrganization from "./EditOrganization";

interface OrganizationActionsMenuProps {
  organization: OrganizationPublic;
}

const OrganizationActionsMenu = ({
  organization,
}: OrganizationActionsMenuProps) => {
  const [open, setOpen] = useState(false);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`操作 ${organization.name}`}
        >
          <EllipsisVertical />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <EditOrganization
          organization={organization}
          onSuccess={() => setOpen(false)}
        />
        <DeleteOrganization
          organization={organization}
          onSuccess={() => setOpen(false)}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default OrganizationActionsMenu;
