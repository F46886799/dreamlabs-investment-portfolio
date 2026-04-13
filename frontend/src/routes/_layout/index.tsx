import { createFileRoute, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/_layout/")({
  beforeLoad: async () => {
    throw redirect({ to: "/portfolio" })
  },
  component: RedirectToPortfolio,
  head: () => ({
    meta: [
      {
        title: "Portfolio - FastAPI Template",
      },
    ],
  }),
})

function RedirectToPortfolio() {
  return null
}
