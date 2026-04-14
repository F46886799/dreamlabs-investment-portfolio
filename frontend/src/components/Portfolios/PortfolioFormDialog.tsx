import { zodResolver } from "@hookform/resolvers/zod"
import { Plus } from "lucide-react"
import { type ReactNode, useEffect, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"

import type {
  AccountPublic,
  PortfolioCreate,
  PortfolioPublic,
  PortfolioUpdate,
} from "@/client"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { LoadingButton } from "@/components/ui/loading-button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useCreatePortfolio, useUpdatePortfolio } from "@/hooks/usePortfolios"

const formSchema = z.object({
  account_id: z.string().min(1, { message: "请选择所属账户" }),
  description: z.string().optional(),
  is_active: z.boolean(),
  name: z.string().min(1, { message: "请输入组合名称" }),
})

type FormData = z.infer<typeof formSchema>

interface PortfolioFormDialogProps {
  accounts: AccountPublic[]
  mode: "create" | "edit"
  portfolio?: PortfolioPublic
  trigger?: ReactNode
}

export function PortfolioFormDialog({
  accounts,
  mode,
  portfolio,
  trigger,
}: PortfolioFormDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const activeAccounts = useMemo(
    () => accounts.filter((account) => account.is_active),
    [accounts],
  )
  const selectableAccounts = useMemo(() => {
    if (mode === "create") {
      return activeAccounts
    }

    return accounts.filter(
      (account) => account.is_active || account.id === portfolio?.account_id,
    )
  }, [accounts, activeAccounts, mode, portfolio?.account_id])
  const defaultValues = useMemo<FormData>(
    () => ({
      account_id:
        portfolio?.account_id ??
        activeAccounts[0]?.id ??
        selectableAccounts[0]?.id ??
        "",
      description: portfolio?.description ?? "",
      is_active: portfolio?.is_active ?? true,
      name: portfolio?.name ?? "",
    }),
    [activeAccounts, portfolio, selectableAccounts],
  )
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    mode: "onBlur",
    criteriaMode: "all",
    defaultValues,
  })
  const createMutation = useCreatePortfolio(() => {
    form.reset(defaultValues)
    setIsOpen(false)
  })
  const updateMutation = useUpdatePortfolio({
    onSuccess: () => {
      setIsOpen(false)
    },
    successMessage: "组合更新成功",
  })
  const mutation = mode === "create" ? createMutation : updateMutation

  useEffect(() => {
    if (!form.getValues("account_id") && selectableAccounts.length > 0) {
      form.setValue("account_id", selectableAccounts[0].id)
    }
  }, [form, selectableAccounts])

  useEffect(() => {
    if (isOpen) {
      form.reset(defaultValues)
    }
  }, [defaultValues, form, isOpen])

  const onSubmit = (data: FormData) => {
    const payload: PortfolioCreate = {
      ...data,
      description: data.description || undefined,
    }

    if (mode === "create") {
      createMutation.mutate(payload)
      return
    }

    if (!portfolio) {
      return
    }

    const dirtyFields = form.formState.dirtyFields
    const updatePayload: PortfolioUpdate = {}

    if (dirtyFields.name) {
      updatePayload.name = data.name
    }
    if (dirtyFields.account_id) {
      updatePayload.account_id = data.account_id
    }
    if (dirtyFields.description) {
      updatePayload.description = data.description || undefined
    }
    if (dirtyFields.is_active) {
      updatePayload.is_active = data.is_active
    }

    updateMutation.mutate({
      portfolioId: portfolio.id,
      requestBody: updatePayload,
    })
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open)
        if (!open) {
          form.reset(defaultValues)
        }
      }}
    >
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <Plus className="size-4" />
            {mode === "create" ? "新增组合" : "编辑组合"}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "新增组合" : "编辑组合"}
          </DialogTitle>
          <DialogDescription>
            将投资组合绑定到已存在账户，便于后续归集与对账。
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="grid gap-4 py-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>组合名称</FormLabel>
                    <FormControl>
                      <Input placeholder="例如：全球多资产组合" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="account_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>所属账户</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="选择账户" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {selectableAccounts.map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.name}
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
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>描述</FormLabel>
                    <FormControl>
                      <Input placeholder="描述组合用途或范围" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {mode === "create" && activeAccounts.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  请先创建启用中的账户，再新增投资组合。
                </p>
              )}
            </div>

            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" disabled={mutation.isPending}>
                  取消
                </Button>
              </DialogClose>
              <LoadingButton
                type="submit"
                loading={mutation.isPending}
                disabled={mode === "create" && selectableAccounts.length === 0}
              >
                保存
              </LoadingButton>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
