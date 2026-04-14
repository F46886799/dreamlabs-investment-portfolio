import { useSuspenseQueries } from "@tanstack/react-query"
import { createFileRoute, redirect } from "@tanstack/react-router"
import { AlertCircle, Building2, Users } from "lucide-react"
import { Suspense } from "react"

import { OrganizationsService, PeopleService, UsersService } from "@/client"
import { DataTable } from "@/components/Common/DataTable"
import PendingSubjects from "@/components/Pending/PendingSubjects"
import AddOrganization from "@/components/Subjects/Organizations/AddOrganization"
import { columns as organizationColumns } from "@/components/Subjects/Organizations/columns"
import AddPerson from "@/components/Subjects/People/AddPerson"
import { columns as peopleColumns } from "@/components/Subjects/People/columns"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

async function readAllPeople() {
  const preview = await PeopleService.readPeople({ skip: 0, limit: 1 })

  if (preview.count <= preview.data.length) {
    return preview
  }

  return PeopleService.readPeople({ skip: 0, limit: preview.count })
}

async function readAllOrganizations() {
  const preview = await OrganizationsService.readOrganizations({
    skip: 0,
    limit: 1,
  })

  if (preview.count <= preview.data.length) {
    return preview
  }

  return OrganizationsService.readOrganizations({
    skip: 0,
    limit: preview.count,
  })
}

function getPeopleQueryOptions() {
  return {
    queryFn: readAllPeople,
    queryKey: ["people"],
  }
}

function getOrganizationsQueryOptions() {
  return {
    queryFn: readAllOrganizations,
    queryKey: ["organizations"],
  }
}

function SubjectEmptyState({
  title,
  description,
  icon: Icon,
}: {
  title: string
  description: string
  icon: typeof Users
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed px-6 py-12 text-center">
      <div className="mb-4 rounded-full bg-muted p-4">
        <Icon className="size-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  )
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

function PeopleTabContent() {
  const [{ data: people }] = useSuspenseQueries({
    queries: [getPeopleQueryOptions()],
  })

  return (
    <TabsContent value="people" className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">人员主数据</h2>
          <p className="text-sm text-muted-foreground">
            维护内部成员、客户联系人与外部顾问等人员信息。
          </p>
        </div>
        <AddPerson />
      </div>

      {people.data.length === 0 ? (
        <SubjectEmptyState
          title="暂无人员主数据"
          description="点击右上角“新增人员”录入内部成员、客户联系人或外部顾问。"
          icon={Users}
        />
      ) : (
        <DataTable columns={peopleColumns} data={people.data} />
      )}
    </TabsContent>
  )
}

function OrganizationsTabContent() {
  const [{ data: organizations }] = useSuspenseQueries({
    queries: [getOrganizationsQueryOptions()],
  })

  return (
    <TabsContent value="organizations" className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">机构主数据</h2>
          <p className="text-sm text-muted-foreground">
            维护机构、载体与服务方等组织主体信息。
          </p>
        </div>
        <AddOrganization />
      </div>

      {organizations.data.length === 0 ? (
        <SubjectEmptyState
          title="暂无机构主数据"
          description="点击右上角“新增机构”录入机构、载体或服务提供方。"
          icon={Building2}
        />
      ) : (
        <DataTable columns={organizationColumns} data={organizations.data} />
      )}
    </TabsContent>
  )
}

function SubjectsShellContent() {
  return (
    <Tabs defaultValue="people" className="gap-6">
      <TabsList className="w-full justify-start sm:w-auto">
        <TabsTrigger value="people">人员</TabsTrigger>
        <TabsTrigger value="organizations">机构</TabsTrigger>
      </TabsList>

      <PeopleTabContent />
      <OrganizationsTabContent />
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
          <p>当前已交付人员与机构 CRUD 流程。</p>
        </div>
      </div>

      <Suspense fallback={<PendingSubjects />}>
        <SubjectsShellContent />
      </Suspense>
    </div>
  )
}
