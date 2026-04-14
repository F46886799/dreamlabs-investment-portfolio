# Account and Portfolio Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build account and managed-portfolio foundations so synchronized positions belong to accounts, every portfolio belongs to one account, and the existing dashboard can filter and operate on those entities.

**Architecture:** Add `Account` and `Portfolio` as first-class SQLModel entities, thread `account_id` through the sync and aggregation pipeline, then layer frontend management pages and dashboard filters on top of the generated OpenAPI client. Keep position ownership single-axis in v1 by resolving portfolio filters to the owning account instead of storing `portfolio_id` on positions.

**Tech Stack:** FastAPI, SQLModel, Alembic, Pytest, React, TypeScript, TanStack Query, TanStack Router, shadcn/ui, Playwright

---

## File Structure

### Backend

- Create: `backend/app/api/routes/accounts.py` — account list/create/detail/update endpoints
- Create: `backend/app/api/routes/portfolios.py` — portfolio list/create/detail/update endpoints
- Create: `backend/tests/api/routes/test_accounts.py` — API tests for account lifecycle
- Create: `backend/tests/api/routes/test_portfolios.py` — API tests for portfolio lifecycle
- Create: `backend/app/alembic/versions/8d4f2c3b1a00_add_accounts_and_portfolios.py` — schema changes for accounts, portfolios, and position account ownership
- Modify: `backend/app/models.py` — add account/portfolio models and public schemas
- Modify: `backend/app/api/main.py` — register new routers
- Modify: `backend/app/api/routes/portfolio.py` — require `account_id` for sync, add filters to aggregate endpoints
- Modify: `backend/app/services/portfolio_pipeline.py` — validate scope and aggregate by account
- Modify: `backend/tests/api/routes/test_portfolio.py` — filter and sync behavior coverage
- Modify: `backend/tests/conftest.py` — cleanup order for new tables

### Frontend

- Create: `frontend/src/routes/_layout/accounts.tsx` — account management page
- Create: `frontend/src/routes/_layout/portfolios.tsx` — portfolio management page
- Create: `frontend/src/components/Accounts/AccountFormDialog.tsx` — create/edit account dialog
- Create: `frontend/src/components/Accounts/AccountsTable.tsx` — account data table
- Create: `frontend/src/components/Portfolios/PortfolioFormDialog.tsx` — create/edit portfolio dialog
- Create: `frontend/src/components/Portfolios/PortfoliosTable.tsx` — portfolio data table
- Create: `frontend/src/components/Portfolio/PortfolioFilters.tsx` — dashboard account/portfolio selectors
- Create: `frontend/src/hooks/useAccounts.ts` — account queries and mutations
- Create: `frontend/src/hooks/usePortfolios.ts` — portfolio queries and mutations
- Modify: `frontend/src/components/Sidebar/AppSidebar.tsx` — add account and portfolio navigation
- Modify: `frontend/src/components/Portfolio/PortfolioNavigation.tsx` — keep dashboard nav focused on overview/conflicts/audit
- Modify: `frontend/src/routes/_layout/portfolio.index.tsx` — add filters and sync gating
- Modify: `frontend/src/hooks/usePortfolioData.ts` — pass `account_id` and `portfolio_id`
- Modify: `frontend/src/hooks/usePortfolioHealth.ts` — pass `account_id` and `portfolio_id`
- Modify: `frontend/src/hooks/useSyncConnector.ts` — require account context
- Modify: `frontend/tests/portfolio.spec.ts` — coverage for management pages and filtered overview
- Modify: `frontend/src/client/sdk.gen.ts`, `frontend/src/client/types.gen.ts`, `frontend/src/client/schemas.gen.ts` — regenerated OpenAPI client output
- Modify: `frontend/openapi.json` — refreshed schema snapshot

---

### Task 1: Add backend account model and API

**Files:**
- Create: `backend/app/api/routes/accounts.py`
- Create: `backend/tests/api/routes/test_accounts.py`
- Create: `backend/app/alembic/versions/8d4f2c3b1a00_add_accounts_and_portfolios.py`
- Modify: `backend/app/models.py`
- Modify: `backend/app/api/main.py`
- Modify: `backend/tests/conftest.py`

- [ ] **Step 1: Write the failing account API test**

```python
from fastapi.testclient import TestClient

from app.core.config import settings


def test_create_and_list_accounts(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    payload = {
        "name": "盈透证券主账户",
        "account_type": "brokerage",
        "institution_name": "Interactive Brokers",
        "account_mask": "****1234",
        "base_currency": "USD",
        "notes": "主要美股账户",
        "is_active": True,
    }

    create_response = client.post(
        f"{settings.API_V1_STR}/accounts",
        headers=superuser_token_headers,
        json=payload,
    )

    assert create_response.status_code == 200
    created = create_response.json()
    assert created["name"] == payload["name"]
    assert created["account_type"] == payload["account_type"]

    list_response = client.get(
        f"{settings.API_V1_STR}/accounts",
        headers=superuser_token_headers,
    )

    assert list_response.status_code == 200
    listed = list_response.json()
    assert listed["count"] == 1
    assert listed["data"][0]["institution_name"] == "Interactive Brokers"
```

- [ ] **Step 2: Run the test to verify the route does not exist yet**

Run: `cd backend && pytest tests/api/routes/test_accounts.py::test_create_and_list_accounts -v`

Expected: FAIL with `404 Not Found` or import errors because the account models and router do not exist yet.

- [ ] **Step 3: Add account schemas, table, router, and migration**

```python
class AccountType(str, Enum):
    BROKERAGE = "brokerage"
    BANK = "bank"


class AccountBase(SQLModel):
    name: str = Field(min_length=1, max_length=255)
    account_type: AccountType
    institution_name: str = Field(min_length=1, max_length=255)
    account_mask: str | None = Field(default=None, max_length=32)
    base_currency: str = Field(default="USD", max_length=8)
    notes: str | None = Field(default=None, max_length=1000)
    is_active: bool = True


class Account(AccountBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    owner_id: uuid.UUID = Field(foreign_key="user.id", nullable=False, ondelete="CASCADE")
    created_at: datetime = Field(default_factory=get_datetime_utc, sa_type=DateTime(timezone=True))  # type: ignore
    updated_at: datetime = Field(default_factory=get_datetime_utc, sa_type=DateTime(timezone=True))  # type: ignore


@router.post("", response_model=AccountPublic)
def create_account(
    session: SessionDep, current_user: CurrentUser, account_in: AccountCreate
) -> AccountPublic:
    account = Account(owner_id=current_user.id, **account_in.model_dump())
    session.add(account)
    session.commit()
    session.refresh(account)
    return AccountPublic.model_validate(account)


@router.get("", response_model=AccountsPublic)
def read_accounts(
    session: SessionDep,
    current_user: CurrentUser,
    include_inactive: bool = False,
) -> AccountsPublic:
    statement = select(Account).where(Account.owner_id == current_user.id)
    if not include_inactive:
        statement = statement.where(Account.is_active.is_(True))
    rows = session.exec(statement.order_by(Account.updated_at.desc())).all()
    return AccountsPublic(data=[AccountPublic.model_validate(row) for row in rows], count=len(rows))
```

- [ ] **Step 4: Run the focused backend test again**

Run: `cd backend && pytest tests/api/routes/test_accounts.py::test_create_and_list_accounts -v`

Expected: PASS.

- [ ] **Step 5: Commit the backend account slice**

```bash
git add backend/app/models.py backend/app/api/main.py backend/app/api/routes/accounts.py backend/app/alembic/versions backend/tests/api/routes/test_accounts.py backend/tests/conftest.py
git commit -m "feat: add account management api"
```

### Task 2: Add backend portfolio model and API

**Files:**
- Create: `backend/app/api/routes/portfolios.py`
- Create: `backend/tests/api/routes/test_portfolios.py`
- Modify: `backend/app/models.py`
- Modify: `backend/app/api/main.py`
- Modify: `backend/app/alembic/versions/8d4f2c3b1a00_add_accounts_and_portfolios.py`
- Modify: `backend/tests/conftest.py`

- [ ] **Step 1: Write the failing portfolio API test**

```python
from fastapi.testclient import TestClient

from app.core.config import settings


def test_create_portfolio_under_account(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    account_response = client.post(
        f"{settings.API_V1_STR}/accounts",
        headers=superuser_token_headers,
        json={
            "name": "招商银行现金账户",
            "account_type": "bank",
            "institution_name": "China Merchants Bank",
            "account_mask": "****5566",
            "base_currency": "CNY",
            "notes": "现金归集",
            "is_active": True,
        },
    )
    account_id = account_response.json()["id"]

    portfolio_response = client.post(
        f"{settings.API_V1_STR}/portfolios",
        headers=superuser_token_headers,
        json={
            "name": "家庭现金组合",
            "account_id": account_id,
            "description": "银行活期与短债现金仓位",
            "is_active": True,
        },
    )

    assert portfolio_response.status_code == 200
    content = portfolio_response.json()
    assert content["name"] == "家庭现金组合"
    assert content["account_id"] == account_id
```

- [ ] **Step 2: Run the test to verify it fails before the router exists**

Run: `cd backend && pytest tests/api/routes/test_portfolios.py::test_create_portfolio_under_account -v`

Expected: FAIL with `404 Not Found`.

- [ ] **Step 3: Add portfolio schemas, table, router, and account ownership checks**

```python
class PortfolioBase(SQLModel):
    name: str = Field(min_length=1, max_length=255)
    account_id: uuid.UUID
    description: str | None = Field(default=None, max_length=1000)
    is_active: bool = True


class Portfolio(PortfolioBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    owner_id: uuid.UUID = Field(foreign_key="user.id", nullable=False, ondelete="CASCADE")
    created_at: datetime = Field(default_factory=get_datetime_utc, sa_type=DateTime(timezone=True))  # type: ignore
    updated_at: datetime = Field(default_factory=get_datetime_utc, sa_type=DateTime(timezone=True))  # type: ignore


def _get_owned_account(session: SessionDep, current_user: CurrentUser, account_id: uuid.UUID) -> Account:
    account = session.get(Account, account_id)
    if not account or account.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Account not found")
    return account


@router.post("", response_model=PortfolioPublic)
def create_portfolio(
    session: SessionDep, current_user: CurrentUser, portfolio_in: PortfolioCreate
) -> PortfolioPublic:
    account = _get_owned_account(session, current_user, portfolio_in.account_id)
    if not account.is_active:
        raise HTTPException(status_code=409, detail="Cannot create portfolio under inactive account")
    portfolio = Portfolio(owner_id=current_user.id, **portfolio_in.model_dump())
    session.add(portfolio)
    session.commit()
    session.refresh(portfolio)
    return PortfolioPublic.model_validate(portfolio)
```

- [ ] **Step 4: Run the focused portfolio backend test**

Run: `cd backend && pytest tests/api/routes/test_portfolios.py::test_create_portfolio_under_account -v`

Expected: PASS.

- [ ] **Step 5: Commit the backend portfolio slice**

```bash
git add backend/app/models.py backend/app/api/main.py backend/app/api/routes/portfolios.py backend/app/alembic/versions backend/tests/api/routes/test_portfolios.py backend/tests/conftest.py
git commit -m "feat: add portfolio management api"
```

### Task 3: Attribute synced positions to accounts

**Files:**
- Modify: `backend/app/models.py`
- Modify: `backend/app/api/routes/portfolio.py`
- Modify: `backend/app/services/portfolio_pipeline.py`
- Modify: `backend/tests/api/routes/test_portfolio.py`
- Modify: `backend/app/alembic/versions/8d4f2c3b1a00_add_accounts_and_portfolios.py`

- [ ] **Step 1: Write the failing sync requirement test**

```python
def test_sync_demo_connector_requires_account_id(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    response = client.post(
        f"{settings.API_V1_STR}/connectors/demo-broker/sync",
        headers=superuser_token_headers,
    )
    assert response.status_code == 422


def test_sync_demo_connector_persists_account_id(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    account_response = client.post(
        f"{settings.API_V1_STR}/accounts",
        headers=superuser_token_headers,
        json={
            "name": "盈透同步账户",
            "account_type": "brokerage",
            "institution_name": "Interactive Brokers",
            "account_mask": "****7788",
            "base_currency": "USD",
            "notes": "同步目标",
            "is_active": True,
        },
    )
    account_id = account_response.json()["id"]

    response = client.post(
        f"{settings.API_V1_STR}/connectors/demo-broker/sync",
        headers=superuser_token_headers,
        params={"account_id": account_id},
    )

    assert response.status_code == 200
    content = response.json()
    assert content["synced_records"] == 3
```

- [ ] **Step 2: Run the sync tests to capture the old behavior**

Run: `cd backend && pytest tests/api/routes/test_portfolio.py -k "requires_account_id or persists_account_id" -v`

Expected: FAIL because the endpoint currently allows sync without account context and positions have no `account_id`.

- [ ] **Step 3: Thread `account_id` through models, route, and ingestion**

```python
class RawPosition(RawPositionBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    owner_id: uuid.UUID = Field(foreign_key="user.id", nullable=False, ondelete="CASCADE")
    account_id: uuid.UUID = Field(foreign_key="account.id", nullable=False, ondelete="RESTRICT")
    fetched_at: datetime = Field(default_factory=get_datetime_utc, sa_type=DateTime(timezone=True))  # type: ignore


@connectors_router.post("/{source}/sync", response_model=ConnectorSyncResponse)
def sync_connector_positions(
    session: SessionDep,
    current_user: CurrentUser,
    source: str,
    account_id: UUID,
) -> ConnectorSyncResponse:
    snapshot_version, synced, normalized, conflicts = ingest_positions(
        session=session,
        owner_id=current_user.id,
        source=source,
        account_id=account_id,
    )
    return ConnectorSyncResponse(
        source=source,
        status="ok",
        snapshot_version=snapshot_version,
        synced_records=synced,
        normalized_records=normalized,
        conflict_records=conflicts,
    )


def ingest_positions(
    session: Session,
    owner_id: UUID,
    source: str,
    account_id: UUID,
) -> tuple[str, int, int, int]:
    raw_position = RawPosition(
        source=source,
        external_id=str(row["external_id"]),
        symbol=str(row["symbol"]),
        asset_type=str(row["asset_type"]),
        quantity=float(row["quantity"]),
        market_value=float(row["market_value"]),
        currency=str(row["currency"]),
        owner_id=owner_id,
        account_id=account_id,
    )
```

- [ ] **Step 4: Run the sync-focused backend tests again**

Run: `cd backend && pytest tests/api/routes/test_portfolio.py -k "requires_account_id or persists_account_id" -v`

Expected: PASS.

- [ ] **Step 5: Commit the sync ownership slice**

```bash
git add backend/app/models.py backend/app/api/routes/portfolio.py backend/app/services/portfolio_pipeline.py backend/tests/api/routes/test_portfolio.py backend/app/alembic/versions
git commit -m "feat: scope synced positions to accounts"
```

### Task 4: Add account- and portfolio-scoped aggregation

**Files:**
- Modify: `backend/app/api/routes/portfolio.py`
- Modify: `backend/app/services/portfolio_pipeline.py`
- Modify: `backend/tests/api/routes/test_portfolio.py`
- Modify: `backend/app/models.py`

- [ ] **Step 1: Write the failing filtered aggregation tests**

```python
def test_get_unified_portfolio_filtered_by_account(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    primary = client.post(
        f"{settings.API_V1_STR}/accounts",
        headers=superuser_token_headers,
        json={
            "name": "主券商账户",
            "account_type": "brokerage",
            "institution_name": "IBKR",
            "account_mask": "****1111",
            "base_currency": "USD",
            "notes": "主账户",
            "is_active": True,
        },
    ).json()
    secondary = client.post(
        f"{settings.API_V1_STR}/accounts",
        headers=superuser_token_headers,
        json={
            "name": "备用券商账户",
            "account_type": "brokerage",
            "institution_name": "Futu",
            "account_mask": "****2222",
            "base_currency": "USD",
            "notes": "备用账户",
            "is_active": True,
        },
    ).json()

    client.post(
        f"{settings.API_V1_STR}/connectors/demo-broker/sync",
        headers=superuser_token_headers,
        params={"account_id": primary["id"]},
    )
    client.post(
        f"{settings.API_V1_STR}/connectors/demo-broker/sync",
        headers=superuser_token_headers,
        params={"account_id": secondary["id"]},
    )

    response = client.get(
        f"{settings.API_V1_STR}/portfolio/unified",
        headers=superuser_token_headers,
        params={"account_id": primary["id"]},
    )

    assert response.status_code == 200
    assert len(response.json()["data"]) == 2


def test_get_unified_portfolio_rejects_conflicting_filters(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    response = client.get(
        f"{settings.API_V1_STR}/portfolio/unified",
        headers=superuser_token_headers,
        params={
            "account_id": "00000000-0000-0000-0000-000000000001",
            "portfolio_id": "00000000-0000-0000-0000-000000000002",
        },
    )
    assert response.status_code == 409
```

- [ ] **Step 2: Run the filtered portfolio tests before changing the service**

Run: `cd backend && pytest tests/api/routes/test_portfolio.py -k "filtered_by_account or conflicting_filters" -v`

Expected: FAIL because `/portfolio/unified` ignores filters today.

- [ ] **Step 3: Add scope resolution helper and reuse it in unified and health queries**

```python
def resolve_portfolio_scope(
    session: Session,
    owner_id: UUID,
    account_id: UUID | None = None,
    portfolio_id: UUID | None = None,
) -> UUID | None:
    if portfolio_id is None:
        return account_id

    portfolio = session.get(Portfolio, portfolio_id)
    if not portfolio or portfolio.owner_id != owner_id:
        raise HTTPException(status_code=404, detail="Portfolio not found")

    if account_id is not None and portfolio.account_id != account_id:
        raise HTTPException(status_code=409, detail="Portfolio does not belong to account")

    return portfolio.account_id


def get_unified_positions(
    session: Session,
    owner_id: UUID,
    account_id: UUID | None = None,
    portfolio_id: UUID | None = None,
) -> tuple[str, bool, list[UnifiedPosition]]:
    scoped_account_id = resolve_portfolio_scope(
        session=session,
        owner_id=owner_id,
        account_id=account_id,
        portfolio_id=portfolio_id,
    )

    statement = select(NormalizedPosition).where(
        NormalizedPosition.owner_id == owner_id,
        NormalizedPosition.normalization_status == "normalized",
    )
    if scoped_account_id is not None:
        statement = statement.where(NormalizedPosition.account_id == scoped_account_id)
```

- [ ] **Step 4: Run the portfolio route tests for filtered queries**

Run: `cd backend && pytest tests/api/routes/test_portfolio.py -v`

Expected: PASS.

- [ ] **Step 5: Commit the filtered aggregation slice**

```bash
git add backend/app/api/routes/portfolio.py backend/app/services/portfolio_pipeline.py backend/tests/api/routes/test_portfolio.py backend/app/models.py
git commit -m "feat: add account and portfolio portfolio filters"
```

### Task 5: Generate client and build account/portfolio management pages

**Files:**
- Create: `frontend/src/routes/_layout/accounts.tsx`
- Create: `frontend/src/routes/_layout/portfolios.tsx`
- Create: `frontend/src/components/Accounts/AccountFormDialog.tsx`
- Create: `frontend/src/components/Accounts/AccountsTable.tsx`
- Create: `frontend/src/components/Portfolios/PortfolioFormDialog.tsx`
- Create: `frontend/src/components/Portfolios/PortfoliosTable.tsx`
- Create: `frontend/src/hooks/useAccounts.ts`
- Create: `frontend/src/hooks/usePortfolios.ts`
- Modify: `frontend/src/components/Sidebar/AppSidebar.tsx`
- Modify: `frontend/tests/portfolio.spec.ts`
- Modify: `frontend/openapi.json`
- Modify: `frontend/src/client/sdk.gen.ts`
- Modify: `frontend/src/client/types.gen.ts`
- Modify: `frontend/src/client/schemas.gen.ts`

- [ ] **Step 1: Write the failing Playwright coverage for management pages**

```ts
test("Accounts page shows account table and create action", async ({ page }) => {
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
```

- [ ] **Step 2: Run the Playwright spec to confirm `/accounts` and `/portfolios` are missing**

Run: `cd frontend && bunx playwright test tests/portfolio.spec.ts --grep "Accounts page|Portfolios page" `

Expected: FAIL because the routes and mocks are not wired into the app yet.

- [ ] **Step 3: Regenerate the client and add management routes, hooks, and dialog forms**

```ts
export function useAccounts() {
  return useQuery({
    queryKey: ["accounts"],
    queryFn: () => AccountsService.readAccounts(),
  })
}

export const Route = createFileRoute("/_layout/accounts")({
  component: AccountsPage,
  head: () => ({
    meta: [{ title: "Accounts - FastAPI Template" }],
  }),
})

function AccountsPage() {
  const { data } = useAccounts()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">账户管理</h1>
          <p className="text-muted-foreground">维护证券账户与银行账户主数据</p>
        </div>
        <AccountFormDialog mode="create" />
      </div>
      <AccountsTable data={data?.data ?? []} />
    </div>
  )
}
```

- [ ] **Step 4: Run the targeted frontend spec after the routes and forms exist**

Run: `cd frontend && bunx playwright test tests/portfolio.spec.ts --grep "Accounts page|Portfolios page" `

Expected: PASS.

- [ ] **Step 5: Commit the management UI slice**

```bash
git add frontend/src/routes/_layout/accounts.tsx frontend/src/routes/_layout/portfolios.tsx frontend/src/components/Accounts frontend/src/components/Portfolios frontend/src/hooks/useAccounts.ts frontend/src/hooks/usePortfolios.ts frontend/src/components/Sidebar/AppSidebar.tsx frontend/openapi.json frontend/src/client frontend/tests/portfolio.spec.ts
git commit -m "feat: add account and portfolio management ui"
```

### Task 6: Add dashboard filters and account-aware sync behavior

**Files:**
- Create: `frontend/src/components/Portfolio/PortfolioFilters.tsx`
- Modify: `frontend/src/routes/_layout/portfolio.index.tsx`
- Modify: `frontend/src/hooks/usePortfolioData.ts`
- Modify: `frontend/src/hooks/usePortfolioHealth.ts`
- Modify: `frontend/src/hooks/useSyncConnector.ts`
- Modify: `frontend/tests/portfolio.spec.ts`

- [ ] **Step 1: Write the failing overview filter and sync gating tests**

```ts
test("Overview requires account selection before sync", async ({ page }) => {
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
          },
        ],
        count: 1,
      }),
    })
  })

  await page.goto("/portfolio")

  await expect(page.getByRole("button", { name: "立即同步" })).toBeDisabled()

  await page.getByRole("combobox", { name: "账户" }).click()
  await page.getByRole("option", { name: "盈透证券主账户" }).click()

  await expect(page.getByRole("button", { name: "立即同步" })).toBeEnabled()
})
```

- [ ] **Step 2: Run the dashboard-focused frontend spec before adding filter state**

Run: `cd frontend && bunx playwright test tests/portfolio.spec.ts --grep "requires account selection before sync|filtered overview" `

Expected: FAIL because the overview has no selectors and the sync hook does not take `account_id`.

- [ ] **Step 3: Add account/portfolio filter state and thread it through queries and sync**

```ts
export const portfolioDataQueryOptions = (
  accountId?: string,
  portfolioId?: string,
) => ({
  queryKey: ["portfolio", "unified", accountId ?? "all", portfolioId ?? "all"],
  queryFn: () =>
    PortfolioService.getUnifiedPortfolio({
      accountId,
      portfolioId,
    }),
})

export function useSyncConnector(defaultSource = "demo-broker") {
  return useMutation({
    mutationFn: (accountId: string) =>
      PortfolioService.syncConnectorPositions({
        source: defaultSource,
        accountId,
      }),
  })
}

<PortfolioFilters
  accountId={accountId}
  portfolioId={portfolioId}
  accounts={accounts?.data ?? []}
  portfolios={portfolios?.data ?? []}
  onAccountChange={setAccountId}
  onPortfolioChange={setPortfolioId}
/>
```

- [ ] **Step 4: Run the full portfolio Playwright suite**

Run: `cd frontend && bunx playwright test tests/portfolio.spec.ts`

Expected: PASS.

- [ ] **Step 5: Commit the filtered dashboard slice**

```bash
git add frontend/src/components/Portfolio/PortfolioFilters.tsx frontend/src/routes/_layout/portfolio.index.tsx frontend/src/hooks/usePortfolioData.ts frontend/src/hooks/usePortfolioHealth.ts frontend/src/hooks/useSyncConnector.ts frontend/tests/portfolio.spec.ts
git commit -m "feat: add account-aware portfolio dashboard filters"
```

### Task 7: Run the repository checks and document generated artifacts

**Files:**
- Modify: `frontend/openapi.json`
- Modify: `frontend/src/client/sdk.gen.ts`
- Modify: `frontend/src/client/types.gen.ts`
- Modify: `frontend/src/client/schemas.gen.ts`

- [ ] **Step 1: Regenerate the frontend client from the updated backend schema**

```bash
bash ./scripts/generate-client.sh
```

- [ ] **Step 2: Run the backend test suite**

Run: `cd backend && bash ./scripts/test.sh`

Expected: PASS.

- [ ] **Step 3: Run the frontend lint and Playwright coverage**

Run: `bun run lint && cd frontend && bunx playwright test`

Expected: PASS.

- [ ] **Step 4: Inspect generated client diffs before finalizing**

```bash
git --no-pager diff -- frontend/openapi.json frontend/src/client
```

Expected: only schema and generated SDK changes for accounts, portfolios, and filtered portfolio endpoints.

- [ ] **Step 5: Commit the integration pass**

```bash
git add frontend/openapi.json frontend/src/client backend frontend
git commit -m "feat: ship account and portfolio foundation"
```

---

## Self-Review

### Spec coverage

- Account entity, fixed types, and maintenance APIs are covered by Task 1 and Task 5.
- Portfolio entity with one-account ownership is covered by Task 2 and Task 5.
- Account attribution for synchronized positions is covered by Task 3.
- Account and portfolio scoped overview behavior is covered by Task 4 and Task 6.
- OpenAPI regeneration and repository-level verification are covered by Task 7.

### Placeholder scan

- No `TODO`, `TBD`, “implement later”, or “similar to previous task” placeholders remain.
- Every task includes exact file paths, concrete commands, and named tests.

### Type consistency

- The plan consistently uses `Account`, `Portfolio`, `account_id`, `portfolio_id`, `AccountPublic`, and `PortfolioPublic`.
- Sync scoping always flows through `account_id`, with portfolio filters resolving to the owning account rather than introducing a `portfolio_id` on positions.
