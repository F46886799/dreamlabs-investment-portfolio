import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";

import type { PersonPublic } from "@/client";
import { PeopleService } from "@/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { LoadingButton } from "@/components/ui/loading-button";
import useCustomToast from "@/hooks/useCustomToast";
import { handleError } from "@/utils";

interface DeletePersonProps {
  onSuccess: () => void;
  person: PersonPublic;
}

const DeletePerson = ({
  onSuccess,
  person,
}: DeletePersonProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();
  const { showSuccessToast, showErrorToast } = useCustomToast();
  const { handleSubmit } = useForm();

  const mutation = useMutation({
    mutationFn: (personId: string) => PeopleService.deletePerson({ personId }),
    onSuccess: () => {
      showSuccessToast("人员已成功删除");
      setIsOpen(false);
      onSuccess();
    },
    onError: handleError.bind(showErrorToast),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["people"] });
    },
  });

  const onSubmit = async () => {
    mutation.mutate(person.id);
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
      }}
    >
      <DropdownMenuItem
        variant="destructive"
        onSelect={(event) => event.preventDefault()}
        onClick={() => setIsOpen(true)}
      >
        <Trash2 />
        删除人员
      </DropdownMenuItem>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>删除人员</DialogTitle>
            <DialogDescription>
              将永久删除“{person.name}”的人员主数据，且无法撤销。确认继续吗？
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="mt-4">
            <DialogClose asChild>
              <Button
                type="button"
                variant="outline"
                disabled={mutation.isPending}
              >
                取消
              </Button>
            </DialogClose>
            <LoadingButton
              variant="destructive"
              type="submit"
              loading={mutation.isPending}
            >
              删除
            </LoadingButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default DeletePerson;
