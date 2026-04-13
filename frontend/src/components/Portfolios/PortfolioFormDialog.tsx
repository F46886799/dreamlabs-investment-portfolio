import { zodResolver } from "@hookform/resolvers/zod"
import { Plus } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"

import type { AccountPublic, PortfolioCreate } from "@/client"
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
import { useCreatePortfolio } from "@/hooks/usePortfolios"

const formSchema = z.object({
  account_id: z.string().min(1, { message: "请选择所属账户" }),
  description: z.string().optional(),
  is_active: z.boolean(),
  name: z.string().min(1, { message: "请输入组合名称" }),
})

type FormData = z.infer<typeof formSchema>

interface PortfolioFormDialogProps {
  accounts: AccountPublic[]
  mode: "create"
}

export function PortfolioFormDialog({
  accounts,
  mode,
}: PortfolioFormDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const activeAccounts = useMemo(
    () => accounts.filter((account) => account.is_active),
    [accounts],
  )
  const defaultValues = useMemo<FormData>(
    () => ({
      account_id: activeAccounts[0]?.id ?? "",
      description: "",
      is_active: true,
      name: "",
    }),
    [activeAccounts],
  )
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    mode: "onBlur",
    criteriaMode: "all",
    defaultValues,
  })
  const mutation = useCreatePortfolio(() => {
    form.reset(defaultValues)
    setIsOpen(false)
  })

  useEffect(() => {
    if (!form.getValues("account_id") && activeAccounts.length > 0) {
      form.setValue("account_id", activeAccounts[0].id)
    }
  }, [activeAccounts, form])

  const onSubmit = (data: FormData) => {
    const payload: PortfolioCreate = {
      ...data,
      description: data.description || undefined,
    }

    mutation.mutate(payload)
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
        <Button>
          <Plus className="size-4" />
          {mode === "create" ? "新增组合" : "编辑组合"}
        </Button>
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
                        {activeAccounts.map((account) => (
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

              {activeAccounts.length === 0 && (
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
                disabled={activeAccounts.length === 0}
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
