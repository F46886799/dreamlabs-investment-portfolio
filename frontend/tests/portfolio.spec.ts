import { expect, type Page, test } from "@playwright/test"

test.use({ storageState: { cookies: [], origins: [] } })

type AccountRecord = {
  id: string
  name: string
  account_type: "brokerage" | "bank"
  institution_name: string
  account_mask: string | null
  base_currency: string
  notes: string | null
  is_active: boolean
  owner_id: string
  created_at: string
  updated_at: string
}

type PortfolioRecord = {
  id: string
  name: string
  account_id: string
  description: string | null
  is_active: boolean
  owner_id: string
  created_at: string
  updated_at: string
}

const testUserId = "f335249f-4f95-40db-b986-17f811acc359"
const updatedAt = "2026-04-12T09:00:00.000000+00:00"

function buildAccount(overrides: Partial<AccountRecord> = {}): AccountRecord {
  return {
    id: "7c3b1f78-f5d4-4d65-a15a-3f0a5c348001",
    name: "盈透证券主账户",
    account_type: "brokerage",
    institution_name: "Interactive Brokers",
    account_mask: "****1234",
    base_currency: "USD",
    notes: "主要美股账户",
    is_active: true,
    owner_id: testUserId,
    created_at: "2026-04-11T14:30:22.000000+00:00",
    updated_at: "2026-04-11T14:30:22.000000+00:00",
    ...overrides,
  }
}

function buildPortfolio(
  overrides: Partial<PortfolioRecord> = {},
): PortfolioRecord {
  return {
    id: "967db092-1a4e-4f85-a0d5-1afca5d5e012",
    name: "全球多资产组合",
    account_id: "7c3b1f78-f5d4-4d65-a15a-3f0a5c348001",
    description: "核心权益与现金配置",
    is_active: true,
    owner_id: testUserId,
    created_at: "2026-04-11T14:30:22.000000+00:00",
    updated_at: "2026-04-11T14:30:22.000000+00:00",
    ...overrides,
  }
}

async function mockPortfolioApis(
  page: Page,
  options?: {
    accounts?: AccountRecord[]
    portfolios?: PortfolioRecord[]
  },
) {
  const accounts = options?.accounts ?? [buildAccount()]
  const portfolios = options?.portfolios ?? [buildPortfolio()]

  await page.route("**/api/v1/users/me", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      status: 200,
      body: JSON.stringify({
        id: testUserId,
        email: "portfolio-test@example.com",
        full_name: "Portfolio Tester",
        is_active: true,
        is_superuser: true,
      }),
    })
  })

  await page.route("**/api/v1/accounts**", async (route) => {
    const request = route.request()

    if (request.method() === "GET") {
      const url = new URL(request.url())
      const includeInactive =
        url.searchParams.get("include_inactive") === "true" ||
        url.searchParams.get("includeInactive") === "true"
      const data = includeInactive
        ? accounts
        : accounts.filter((account) => account.is_active)

      await route.fulfill({
        contentType: "application/json",
        status: 200,
        body: JSON.stringify({
          data,
          count: data.length,
        }),
      })
      return
    }

    if (request.method() === "PUT") {
      const id = request.url().split("/").pop() ?? ""
      const payload = request.postDataJSON() as Partial<AccountRecord>
      const index = accounts.findIndex((account) => account.id === id)
      accounts[index] = {
        ...accounts[index],
        ...payload,
        updated_at: updatedAt,
      }

      await route.fulfill({
        contentType: "application/json",
        status: 200,
        body: JSON.stringify(accounts[index]),
      })
      return
    }

    await route.fallback()
  })

  await page.route("**/api/v1/portfolios**", async (route) => {
    const request = route.request()

    if (request.method() === "GET") {
      const url = new URL(request.url())
      const includeInactive =
        url.searchParams.get("include_inactive") === "true" ||
        url.searchParams.get("includeInactive") === "true"
      const accountId =
        url.searchParams.get("account_id") ?? url.searchParams.get("accountId")

      let data = includeInactive
        ? [...portfolios]
        : portfolios.filter((portfolio) => portfolio.is_active)

      if (accountId) {
        data = data.filter((portfolio) => portfolio.account_id === accountId)
      }

      await route.fulfill({
        contentType: "application/json",
        status: 200,
        body: JSON.stringify({
          data,
          count: data.length,
        }),
      })
      return
    }

    if (request.method() === "PUT") {
      const id = request.url().split("/").pop() ?? ""
      const payload = request.postDataJSON() as Partial<PortfolioRecord>
      const index = portfolios.findIndex((portfolio) => portfolio.id === id)
      portfolios[index] = {
        ...portfolios[index],
        ...payload,
        updated_at: updatedAt,
      }

      await route.fulfill({
        contentType: "application/json",
        status: 200,
        body: JSON.stringify(portfolios[index]),
      })
      return
    }

    await route.fallback()
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
  })

  test("Accounts page supports edit and activate/deactivate actions", async ({
    page,
  }) => {
    await mockPortfolioApis(page, {
      accounts: [buildAccount()],
      portfolios: [],
    })

    await page.goto("/accounts")

    await expect(page.getByRole("heading", { name: "账户管理" })).toBeVisible()
    await expect(page.getByRole("button", { name: "新增账户" })).toBeVisible()
    await expect(
      page.getByRole("columnheader", { name: "Updated at" }),
    ).toBeVisible()
    await expect(page.getByText("盈透证券主账户")).toBeVisible()

    await page.getByRole("button", { name: "编辑" }).click()
    const editAccountDialog = page.getByRole("dialog", { name: "编辑账户" })
    await expect(editAccountDialog).toBeVisible()
    await editAccountDialog
      .getByPlaceholder("例如：盈透证券主账户")
      .fill("盈透证券备用账户")
    await editAccountDialog
      .getByRole("button", {
        name: "保存",
      })
      .click()

    await expect(page.getByText("盈透证券备用账户")).toBeVisible()

    await page.getByRole("button", { name: "停用" }).click()
    await expect(page.getByRole("button", { name: "启用" })).toBeVisible()
  })

  test("Portfolios page supports edit and activate/deactivate actions", async ({
    page,
  }) => {
    await mockPortfolioApis(page, {
      accounts: [buildAccount()],
      portfolios: [buildPortfolio()],
    })

    await page.goto("/portfolios")

    await expect(page.getByRole("heading", { name: "组合管理" })).toBeVisible()
    await expect(page.getByRole("button", { name: "新增组合" })).toBeVisible()
    await expect(page.getByText("全球多资产组合")).toBeVisible()

    await page.getByRole("button", { name: "编辑" }).click()
    const editPortfolioDialog = page.getByRole("dialog", { name: "编辑组合" })
    await expect(editPortfolioDialog).toBeVisible()
    await editPortfolioDialog
      .getByPlaceholder("例如：全球多资产组合")
      .fill("全球收益增强组合")
    await editPortfolioDialog
      .getByRole("button", {
        name: "保存",
      })
      .click()

    await expect(page.getByText("全球收益增强组合")).toBeVisible()

    await page.getByRole("button", { name: "停用" }).click()
    await expect(page.getByRole("button", { name: "启用" })).toBeVisible()
  })

  test("Overview page shows core portfolio widgets", async ({ page }) => {
    await mockPortfolioApis(page)
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
    await mockPortfolioApis(page)
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
    await mockPortfolioApis(page)
    await page.goto("/portfolio/audit")

    await expect(page.getByRole("heading", { name: "审计日志" })).toBeVisible()
    await expect(page.getByText("normalization_conflict")).toBeVisible()
    await expect(page.getByRole("cell", { name: "v1" })).toBeVisible()
    await expect(page.getByText("asset_type")).toBeVisible()
    await expect(page.getByRole("link", { name: "总览" })).toBeVisible()
  })
})
