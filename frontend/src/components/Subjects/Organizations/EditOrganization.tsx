import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import {
  type OrganizationPublic,
  type OrganizationType,
  OrganizationsService,
} from "@/client";
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import useCustomToast from "@/hooks/useCustomToast";
import { handleError } from "@/utils";

const organizationTypeOptions: Array<{
  label: string;
  value: OrganizationType;
}> = [
  { label: "基金/投资载体", value: "fund_or_investment_vehicle" },
  { label: "券商/银行", value: "broker_or_bank" },
  { label: "服务提供方", value: "service_provider" },
  { label: "其他", value: "other" },
];

const formSchema = z.object({
  organization_type: z.enum([
    "fund_or_investment_vehicle",
    "broker_or_bank",
    "service_provider",
    "other",
  ]),
  name: z
    .string()
    .trim()
    .min(1, { message: "请输入机构名称" })
    .max(255, { message: "机构名称不能超过 255 个字符" }),
  alias: z.string().max(255, { message: "别名不能超过 255 个字符" }),
  notes: z.string().max(1000, { message: "备注不能超过 1000 个字符" }),
});

type FormData = z.infer<typeof formSchema>;

interface EditOrganizationProps {
  onSuccess: () => void;
  organization: OrganizationPublic;
}

const normalizeOptionalText = (value: string) => {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const EditOrganization = ({
  onSuccess,
  organization,
}: EditOrganizationProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();
  const { showSuccessToast, showErrorToast } = useCustomToast();

  const formValues = {
    organization_type: organization.organization_type,
    name: organization.name,
    alias: organization.alias ?? "",
    notes: organization.notes ?? "",
  } satisfies FormData;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    mode: "onBlur",
    criteriaMode: "all",
    defaultValues: formValues,
  });

  useEffect(() => {
    if (!isOpen) {
      form.reset(formValues);
    }
  }, [form, formValues, isOpen]);

  const mutation = useMutation({
    mutationFn: (data: FormData) =>
      OrganizationsService.updateOrganization({
        organizationId: organization.id,
        requestBody: {
          organization_type: data.organization_type,
          name: data.name.trim(),
          alias: normalizeOptionalText(data.alias),
          notes: normalizeOptionalText(data.notes),
        },
      }),
    onSuccess: () => {
      showSuccessToast("机构更新成功");
      setIsOpen(false);
      onSuccess();
    },
    onError: handleError.bind(showErrorToast),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
    },
  });

  const onSubmit = (data: FormData) => {
    mutation.mutate(data);
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);

    if (!open) {
      form.reset(formValues);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DropdownMenuItem
        onSelect={(event) => event.preventDefault()}
        onClick={() => {
          form.reset(formValues);
          setIsOpen(true);
        }}
      >
        <Pencil />
        编辑机构
      </DropdownMenuItem>
      <DialogContent className="sm:max-w-md">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle>编辑机构</DialogTitle>
              <DialogDescription>更新机构主体主数据。</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <FormField
                control={form.control}
                name="organization_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      机构类型 <span className="text-destructive">*</span>
                    </FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="选择机构类型" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {organizationTypeOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      机构名称 <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="机构名称"
                        type="text"
                        {...field}
                        required
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="alias"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>别名</FormLabel>
                    <FormControl>
                      <Input placeholder="别名" type="text" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>备注</FormLabel>
                    <FormControl>
                      <Input placeholder="备注" type="text" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <DialogClose asChild>
                <Button
                  type="button"
                  variant="outline"
                  disabled={mutation.isPending}
                >
                  取消
                </Button>
              </DialogClose>
              <LoadingButton type="submit" loading={mutation.isPending}>
                保存
              </LoadingButton>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default EditOrganization;
