import { zodResolver } from "@hookform/resolvers/zod"
import { Plus } from "lucide-react"
import { type ReactNode, useEffect, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"

import type { AccountCreate, AccountPublic, AccountUpdate } from "@/client"
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
import { useCreateAccount, useUpdateAccount } from "@/hooks/useAccounts"

const formSchema = z.object({
  account_mask: z.string().optional(),
  account_type: z.enum(["brokerage", "bank"]),
  base_currency: z.string().min(1, { message: "请输入基础币种" }),
  institution_name: z.string().min(1, { message: "请输入机构名称" }),
  is_active: z.boolean(),
  name: z.string().min(1, { message: "请输入账户名称" }),
  notes: z.string().optional(),
})

type FormData = z.infer<typeof formSchema>

interface AccountFormDialogProps {
  mode: "create" | "edit"
  account?: AccountPublic
  trigger?: ReactNode
}

const createDefaultValues: FormData = {
  account_mask: "",
  account_type: "brokerage",
  base_currency: "USD",
  institution_name: "",
  is_active: true,
  name: "",
  notes: "",
}

function getDefaultValues(account?: AccountPublic): FormData {
  if (!account) {
    return createDefaultValues
  }

  return {
    account_mask: account.account_mask ?? "",
    account_type: account.account_type,
    base_currency: account.base_currency ?? "USD",
    institution_name: account.institution_name,
    is_active: account.is_active ?? true,
    name: account.name,
    notes: account.notes ?? "",
  }
}

export function AccountFormDialog({
  mode,
  account,
  trigger,
}: AccountFormDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const defaultValues = useMemo(() => getDefaultValues(account), [account])
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    mode: "onBlur",
    criteriaMode: "all",
    defaultValues,
  })
  const createMutation = useCreateAccount(() => {
    form.reset(createDefaultValues)
    setIsOpen(false)
  })
  const updateMutation = useUpdateAccount({
    onSuccess: () => {
      setIsOpen(false)
    },
    successMessage: "账户更新成功",
  })
  const mutation = mode === "create" ? createMutation : updateMutation

  useEffect(() => {
    if (isOpen) {
      form.reset(defaultValues)
    }
  }, [defaultValues, form, isOpen])

  const onSubmit = (data: FormData) => {
    const payload: AccountCreate | AccountUpdate = {
      ...data,
      account_mask: data.account_mask || undefined,
      base_currency: data.base_currency.toUpperCase(),
      notes: data.notes || undefined,
    }

    if (mode === "create") {
      createMutation.mutate(payload as AccountCreate)
      return
    }

    if (!account) {
      return
    }

    const dirtyFields = form.formState.dirtyFields
    const updatePayload: AccountUpdate = {}

    if (dirtyFields.name) {
      updatePayload.name = data.name
    }
    if (dirtyFields.institution_name) {
      updatePayload.institution_name = data.institution_name
    }
    if (dirtyFields.account_type) {
      updatePayload.account_type = data.account_type
    }
    if (dirtyFields.base_currency) {
      updatePayload.base_currency = data.base_currency.toUpperCase()
    }
    if (dirtyFields.account_mask) {
      updatePayload.account_mask = data.account_mask || undefined
    }
    if (dirtyFields.notes) {
      updatePayload.notes = data.notes || undefined
    }
    if (dirtyFields.is_active) {
      updatePayload.is_active = data.is_active
    }

    updateMutation.mutate({
      accountId: account.id,
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
            {mode === "create" ? "新增账户" : "编辑账户"}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "新增账户" : "编辑账户"}
          </DialogTitle>
          <DialogDescription>
            维护证券账户与银行账户主数据，用于后续组合归集。
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
                    <FormLabel>账户名称</FormLabel>
                    <FormControl>
                      <Input placeholder="例如：盈透证券主账户" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="institution_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>机构名称</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="例如：Interactive Brokers"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="account_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>账户类型</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="选择账户类型" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="brokerage">证券账户</SelectItem>
                          <SelectItem value="bank">银行账户</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="base_currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>基础币种</FormLabel>
                      <FormControl>
                        <Input placeholder="USD" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="account_mask"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>账户掩码</FormLabel>
                    <FormControl>
                      <Input placeholder="****1234" {...field} />
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
                      <Input placeholder="主要美股账户" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" disabled={mutation.isPending}>
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
  )
}
