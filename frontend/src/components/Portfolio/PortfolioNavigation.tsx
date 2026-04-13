import { Link as RouterLink, useRouterState } from "@tanstack/react-router"

import { Button } from "@/components/ui/button"

const portfolioNavItems = [
  { path: "/portfolio", title: "总览" },
  { path: "/portfolio/conflicts", title: "冲突" },
  { path: "/portfolio/audit", title: "审计日志" },
]

export function PortfolioNavigation() {
  const router = useRouterState()
  const currentPath = router.location.pathname

  return (
    <div className="flex flex-wrap items-center gap-2">
      {portfolioNavItems.map((item) => {
        const isActive = currentPath === item.path

        return (
          <Button
            key={item.path}
            variant={isActive ? "default" : "outline"}
            size="sm"
            asChild
          >
            <RouterLink to={item.path}>{item.title}</RouterLink>
          </Button>
        )
      })}
    </div>
  )
}
