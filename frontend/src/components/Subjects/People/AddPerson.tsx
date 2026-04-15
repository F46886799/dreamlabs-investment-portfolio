import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Plus } from "lucide-react"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { PeopleService, type PersonCreate, type PersonType } from "@/client"
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
import useCustomToast from "@/hooks/useCustomToast"
import { handleError } from "@/utils"

const personTypeOptions: Array<{ label: string; value: PersonType }> = [
  { label: "内部成员", value: "internal_member" },
  { label: "客户联系人", value: "client_contact" },
  { label: "外部顾问", value: "external_advisor" },
  { label: "其他", value: "other" },
]

const formSchema = z.object({
  person_type: z.enum([
    "internal_member",
    "client_contact",
    "external_advisor",
    "other",
  ]),
  name: z
    .string()
    .trim()
    .min(1, { message: "请输入姓名" })
    .max(255, { message: "姓名不能超过 255 个字符" }),
  alias: z.string().max(255, { message: "别名不能超过 255 个字符" }),
  notes: z.string().max(1000, { message: "备注不能超过 1000 个字符" }),
})

type FormData = z.infer<typeof formSchema>

const normalizeOptionalText = (value: string) => {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

const AddPerson = () => {
  const [isOpen, setIsOpen] = useState(false)
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    mode: "onBlur",
    criteriaMode: "all",
    defaultValues: {
      person_type: "internal_member",
      name: "",
      alias: "",
      notes: "",
    },
  })

  const mutation = useMutation({
    mutationFn: (data: PersonCreate) =>
      PeopleService.createPerson({ requestBody: data }),
    onSuccess: () => {
      showSuccessToast("人员创建成功")
      form.reset()
      setIsOpen(false)
    },
    onError: handleError.bind(showErrorToast),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["people"] })
    },
  })

  const onSubmit = (data: FormData) => {
    mutation.mutate({
      person_type: data.person_type,
      name: data.name.trim(),
      alias: normalizeOptionalText(data.alias),
      notes: normalizeOptionalText(data.notes),
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus />
          新增人员
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>新增人员</DialogTitle>
          <DialogDescription>维护人员主体主数据。</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="grid gap-4 py-4">
              <FormField
                control={form.control}
                name="person_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      人员类型 <span className="text-destructive">*</span>
                    </FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="选择人员类型" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {personTypeOptions.map((option) => (
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
                      姓名 <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="姓名"
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
  )
}

export default AddPerson
