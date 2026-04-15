import { expect, test } from "@playwright/test"

test.describe("Admin asset maintenance", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("access_token", "playwright-test-token")
    })

    await page.route("**/api/v1/users/me", async (route) => {
      await route.fulfill({
        contentType: "application/json",
        status: 200,
        body: JSON.stringify({
          id: "f335249f-4f95-40db-b986-17f811acc359",
          email: "admin-assets@example.com",
          full_name: "Admin User",
          is_active: true,
          is_superuser: true,
        }),
      })
    })

    await page.route("**/api/v1/assets**", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          contentType: "application/json",
          status: 200,
          body: JSON.stringify({
            data: [
              {
                id: "7d4494ec-c2c8-420f-9f6a-6d4f3fd0db42",
                asset_type: "stock",
                symbol: "AAPL",
                display_name: "Apple Inc.",
                canonical_name: "Apple Inc.",
                exchange: "NASDAQ",
                market: "US",
                currency: "USD",
                country: "US",
                category_level_1: "equity",
                category_level_2: "large_cap",
                status: "active",
                sync_status: "manual",
                external_source: null,
                external_id: null,
                is_active: true,
                created_at: "2026-04-13T00:00:00Z",
                updated_at: "2026-04-13T00:00:00Z",
                last_synced_at: null,
              },
            ],
            count: 1,
          }),
        })
        return
      }

      await route.fulfill({
        contentType: "application/json",
        status: 200,
        body: route.request().postData() ?? "{}",
      })
    })
  })

  test("shows the asset management table and create action", async ({
    page,
  }) => {
    await page.goto("/admin/assets")

    await expect(
      page.getByRole("heading", { name: "Asset Instruments" }),
    ).toBeVisible()
    await expect(page.getByRole("button", { name: "Add Asset" })).toBeVisible()
    await expect(page.getByRole("cell", { name: "AAPL" })).toBeVisible()
    await expect(page.getByText("Apple Inc.")).toBeVisible()
    await expect(page.getByText("manual")).toBeVisible()
  })
})
