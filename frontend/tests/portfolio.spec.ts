import { expect, type Page, test } from "@playwright/test"

test.use({ storageState: { cookies: [], origins: [] } })

const mockPortfolioApis = async (page: Page) => {
  await page.route("**/api/v1/users/me", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      status: 200,
      body: JSON.stringify({
        id: "f335249f-4f95-40db-b986-17f811acc359",
        email: "portfolio-test@example.com",
        full_name: "Portfolio Tester",
        is_active: true,
        is_superuser: true,
      }),
    })
  })

  await page.route("**/api/v1/accounts**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      status: 200,
      body: JSON.stringify({
        data: [
          {
            id: "7c3b1f78-f5d4-4d65-a15a-3f0a5c348001",
            name: "盈透证券主账户",
            account_type: "brokerage",
            institution_name: "Interactive Brokers",
            account_mask: "****1234",
            base_currency: "USD",
            notes: "主要美股账户",
            is_active: true,
            owner_id: "f335249f-4f95-40db-b986-17f811acc359",
            created_at: "2026-04-11T14:30:22.000000+00:00",
            updated_at: "2026-04-11T14:30:22.000000+00:00",
          },
        ],
        count: 1,
      }),
    })
  })

  await page.route("**/api/v1/portfolio/unified", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      status: 200,
      body: JSON.stringify({
        snapshot_version: "20260411T143022Z",
        stale: false,
        data: [
          {
            symbol: "AAPL",
            asset_class: "equity",
            quantity: 10,
            market_value_usd: 1890,
          },
          {
            symbol: "BTC",
            asset_class: "digital_asset",
            quantity: 0.1,
            market_value_usd: 6200,
          },
        ],
      }),
    })
  })

  await page.route("**/api/v1/portfolio/health-report", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      status: 200,
      body: JSON.stringify({
        week: "2026-W15",
        generated_at: "2026-04-11T14:30:22.000000+00:00",
        positions_count: 2,
        total_market_value_usd: 8090,
        asset_class_count: 2,
        anomaly_count: 1,
        stale: false,
      }),
    })
  })

  await page.route("**/api/v1/audit/events", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      status: 200,
      body: JSON.stringify({
        data: [
          {
            id: "550e8400-e29b-41d4-a716-446655440003",
            entity_type: "raw_position",
            entity_id: "770e8400-e29b-41d4-a716-446655440002",
            event_type: "normalization_conflict",
            source_record_id: "770e8400-e29b-41d4-a716-446655440004",
            transform_version: "v1",
            changed_fields: "asset_type",
            created_at: "2026-04-11T14:30:05.000000+00:00",
          },
        ],
        count: 1,
      }),
    })
  })
}

test.describe("Portfolio pages", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("access_token", "playwright-test-token")
    })
    await mockPortfolioApis(page)
  })

  test("Accounts page shows account table and create action", async ({
    page,
  }) => {
    await page.route("**/api/v1/accounts**", async (route) => {
      await route.fulfill({
        contentType: "application/json",
        status: 200,
        body: JSON.stringify({
          data: [
            {
              id: "7c3b1f78-f5d4-4d65-a15a-3f0a5c348001",
              name: "盈透证券主账户",
              account_type: "brokerage",
              institution_name: "Interactive Brokers",
              account_mask: "****1234",
              base_currency: "USD",
              notes: "主要美股账户",
              is_active: true,
              owner_id: "f335249f-4f95-40db-b986-17f811acc359",
              created_at: "2026-04-11T14:30:22.000000+00:00",
              updated_at: "2026-04-11T14:30:22.000000+00:00",
            },
          ],
          count: 1,
        }),
      })
    })

    await page.goto("/accounts")

    await expect(page.getByRole("heading", { name: "账户管理" })).toBeVisible()
    await expect(page.getByRole("button", { name: "新增账户" })).toBeVisible()
    await expect(page.getByText("盈透证券主账户")).toBeVisible()
  })

  test("Portfolios page shows portfolio table and create action", async ({
    page,
  }) => {
    await page.route("**/api/v1/accounts**", async (route) => {
      await route.fulfill({
        contentType: "application/json",
        status: 200,
        body: JSON.stringify({
          data: [
            {
              id: "7c3b1f78-f5d4-4d65-a15a-3f0a5c348001",
              name: "盈透证券主账户",
              account_type: "brokerage",
              institution_name: "Interactive Brokers",
              account_mask: "****1234",
              base_currency: "USD",
              notes: "主要美股账户",
              is_active: true,
              owner_id: "f335249f-4f95-40db-b986-17f811acc359",
              created_at: "2026-04-11T14:30:22.000000+00:00",
              updated_at: "2026-04-11T14:30:22.000000+00:00",
            },
          ],
          count: 1,
        }),
      })
    })

    await page.route("**/api/v1/portfolios**", async (route) => {
      await route.fulfill({
        contentType: "application/json",
        status: 200,
        body: JSON.stringify({
          data: [
            {
              id: "967db092-1a4e-4f85-a0d5-1afca5d5e012",
              name: "全球多资产组合",
              account_id: "7c3b1f78-f5d4-4d65-a15a-3f0a5c348001",
              description: "核心权益与现金配置",
              is_active: true,
              owner_id: "f335249f-4f95-40db-b986-17f811acc359",
              created_at: "2026-04-11T14:30:22.000000+00:00",
              updated_at: "2026-04-11T14:30:22.000000+00:00",
            },
          ],
          count: 1,
        }),
      })
    })

    await page.goto("/portfolios")

    await expect(page.getByRole("heading", { name: "组合管理" })).toBeVisible()
    await expect(page.getByRole("button", { name: "新增组合" })).toBeVisible()
    await expect(page.getByText("全球多资产组合")).toBeVisible()
  })

  test("Overview page shows core portfolio widgets", async ({ page }) => {
    await page.goto("/portfolio")

    await expect(page.getByRole("heading", { name: "投资组合" })).toBeVisible()
    await expect(page.getByRole("button", { name: "立即同步" })).toBeVisible()
    await expect(page.getByRole("heading", { name: "统一持仓" })).toBeVisible()
    await expect(page.getByText("AAPL")).toBeVisible()
    await expect(page.getByText("$1,890.00")).toBeVisible()
    await expect(page.getByRole("link", { name: "冲突" })).toBeVisible()
    await expect(page.getByRole("link", { name: "审计日志" })).toBeVisible()

    await page.getByRole("button", { name: "立即同步" }).click()
    await expect(
      page.getByText("请先在账户管理中创建或选择账户，再执行同步。"),
    ).toBeVisible()
  })

  test("Conflicts page shows normalization conflict records", async ({
    page,
  }) => {
    await page.goto("/portfolio/conflicts")

    await expect(
      page.getByRole("heading", { name: "标准化冲突" }),
    ).toBeVisible()
    await expect(page.getByText("冲突事件列表")).toBeVisible()
    await expect(
      page.getByText("770e8400-e29b-41d4-a716-446655440002"),
    ).toBeVisible()
    await expect(page.getByText("asset_type")).toBeVisible()
  })

  test("Audit page shows audit trail table", async ({ page }) => {
    await page.goto("/portfolio/audit")

    await expect(page.getByRole("heading", { name: "审计日志" })).toBeVisible()
    await expect(page.getByText("normalization_conflict")).toBeVisible()
    await expect(page.getByRole("cell", { name: "v1" })).toBeVisible()
    await expect(page.getByText("asset_type")).toBeVisible()
    await expect(page.getByRole("link", { name: "总览" })).toBeVisible()
  })
})
