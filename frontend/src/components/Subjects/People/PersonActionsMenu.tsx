import { EllipsisVertical } from "lucide-react";
import { useState } from "react";

import type { PersonPublic } from "@/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import DeletePerson from "./DeletePerson";
import EditPerson from "./EditPerson";

interface PersonActionsMenuProps {
  person: PersonPublic;
}

const PersonActionsMenu = ({ person }: PersonActionsMenuProps) => {
  const [open, setOpen] = useState(false);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`操作 ${person.name}`}>
          <EllipsisVertical />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <EditPerson
          person={person}
          onMenuClose={() => setOpen(false)}
          onSuccess={() => setOpen(false)}
        />
        <DeletePerson
          person={person}
          onMenuClose={() => setOpen(false)}
          onSuccess={() => setOpen(false)}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default PersonActionsMenu;
