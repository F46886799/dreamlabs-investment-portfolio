import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, redirect } from "@tanstack/react-router"
import type { LucideIcon } from "lucide-react"
import { AlertCircle, Building2, Users } from "lucide-react"
import { Suspense } from "react"

import { OrganizationsService, PeopleService, UsersService } from "@/client"
import PendingSubjects from "@/components/Pending/PendingSubjects"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const SUBJECT_PREVIEW_LIMIT = 5

function getPeopleQueryOptions() {
  return {
    queryFn: () =>
      PeopleService.readPeople({ skip: 0, limit: SUBJECT_PREVIEW_LIMIT }),
    queryKey: ["subjects", "people"],
  }
}

function getOrganizationsQueryOptions() {
  return {
    queryFn: () =>
      OrganizationsService.readOrganizations({
        skip: 0,
        limit: SUBJECT_PREVIEW_LIMIT,
      }),
    queryKey: ["subjects", "organizations"],
  }
}

export const Route = createFileRoute("/_layout/subjects")({
  component: Subjects,
  beforeLoad: async () => {
    const user = await UsersService.readUserMe()
    if (!user.is_superuser) {
      throw redirect({
        to: "/",
      })
    }
  },
  head: () => ({
    meta: [
      {
        title: "主体维护 - FastAPI Template",
      },
    ],
  }),
})

type SubjectCardProps = {
  count: number
  description: string
  emptyCopy: string
  icon: LucideIcon
  items: Array<{
    alias?: string | null
    id: string
    name: string
  }>
  title: string
}

function SubjectCard({
  count,
  description,
  emptyCopy,
  icon: Icon,
  items,
  title,
}: SubjectCardProps) {
  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="flex items-center gap-2">
          <Icon className="size-4 text-muted-foreground" />
          <span>{title}</span>
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border bg-muted/30 p-4">
            <p className="text-sm text-muted-foreground">已载入记录</p>
            <p className="font-mono text-3xl font-semibold tabular-nums">
              {count}
            </p>
          </div>
          <div className="rounded-xl border bg-muted/30 p-4">
            <p className="text-sm text-muted-foreground">当前预览</p>
            <p className="font-mono text-3xl font-semibold tabular-nums">
              {items.length}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="text-sm font-medium">最近载入</h2>
          {items.length === 0 ? (
            <div className="rounded-xl border border-dashed px-4 py-6 text-sm text-muted-foreground">
              {emptyCopy}
            </div>
          ) : (
            <div className="rounded-xl border">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-4 border-b px-4 py-3 last:border-b-0"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{item.name}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {item.alias || "未设置别名"}
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground">已同步</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function SubjectsShellContent() {
  const { data: people } = useSuspenseQuery(getPeopleQueryOptions())
  const { data: organizations } = useSuspenseQuery(getOrganizationsQueryOptions())

  return (
    <Tabs defaultValue="people" className="gap-6">
      <TabsList className="w-full justify-start sm:w-auto">
        <TabsTrigger value="people">人员</TabsTrigger>
        <TabsTrigger value="organizations">机构</TabsTrigger>
      </TabsList>

      <TabsContent value="people">
        <SubjectCard
          count={people.count}
          description="用于维护内部成员、客户联系人与外部顾问等人员主数据。"
          emptyCopy="暂无人员主数据。后续任务会在此补充完整维护表格与编辑流程。"
          icon={Users}
          items={people.data}
          title="人员主数据"
        />
      </TabsContent>

      <TabsContent value="organizations">
        <SubjectCard
          count={organizations.count}
          description="用于维护机构、载体与服务方等组织主数据。"
          emptyCopy="暂无机构主数据。后续任务会在此补充完整维护表格与编辑流程。"
          icon={Building2}
          items={organizations.data}
          title="机构主数据"
        />
      </TabsContent>
    </Tabs>
  )
}

function Subjects() {
  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">主体维护</h1>
        <p className="text-muted-foreground">
          维护人员与机构主数据，为投资组合、对账和审计流程提供统一基础信息。
        </p>
      </div>

      <div className="rounded-lg border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <p>
            当前交付为受保护的工作区外壳，已接入人员与机构服务用于预加载概览数据。
          </p>
        </div>
      </div>

      <Suspense fallback={<PendingSubjects />}>
        <SubjectsShellContent />
      </Suspense>
    </div>
  )
}
