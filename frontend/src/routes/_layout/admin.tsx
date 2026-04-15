import { createFileRoute, Link, Outlet, redirect, useRouterState } from "@tanstack/react-router"

import { UsersService } from "@/client"
import { Button } from "@/components/ui/button"

const adminNavItems = [
  { path: "/admin", title: "Users" },
  { path: "/admin/assets", title: "Assets" },
] as const

export const Route = createFileRoute("/_layout/admin")({
  component: AdminLayout,
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
        title: "Admin - FastAPI Template",
      },
    ],
  }),
})

function AdminLayout() {
  const router = useRouterState()
  const currentPath = router.location.pathname

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-2">
        {adminNavItems.map((item) => (
          <Button
            key={item.path}
            variant={currentPath === item.path || (item.path === "/admin" && currentPath === "/admin/") ? "default" : "outline"}
            size="sm"
            asChild
          >
            <Link to={item.path}>{item.title}</Link>
          </Button>
        ))}
      </div>
      <Outlet />
    </div>
  )
}
