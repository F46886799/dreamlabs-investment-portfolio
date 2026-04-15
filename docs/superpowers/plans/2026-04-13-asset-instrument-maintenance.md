# Asset Instrument Maintenance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build superuser-only asset instrument maintenance for a shared global asset catalog covering stocks, ETFs, cryptocurrencies, bonds, and cash-like instruments.

**Architecture:** Add a new backend asset master-data domain beside the existing portfolio pipeline, expose it through superuser-only `/api/v1/assets` CRUD endpoints, then generate the frontend client and add an Admin asset maintenance page that follows the existing `Users` admin patterns. Keep v1 manually maintained while reserving synchronization metadata fields and a future alias table boundary.

**Tech Stack:** FastAPI, SQLModel, Alembic, Pytest, React, TanStack Query, TanStack Router, shadcn/ui, Bun, Playwright, openapi-ts

---

## File Structure

### Backend

- Modify: `backend/app/models.py` — add `AssetInstrument` SQLModel entities plus request/response schemas and enum-like field constraints.
- Modify: `backend/app/api/main.py` — register the new assets router.
- Create: `backend/app/api/routes/assets.py` — superuser-only asset list/create/read/update endpoints.
- Create: `backend/app/alembic/versions/20260413_add_asset_instruments.py` — schema migration for the asset catalog table.
- Create: `backend/tests/api/routes/test_assets.py` — route-level tests for permission, filtering, duplicate prevention, and lifecycle behavior.
- Modify: `backend/tests/conftest.py` — ensure cleanup includes `AssetInstrument`.

### Frontend

- Create: `frontend/src/routes/_layout/admin.assets.tsx` — nested Admin route for asset maintenance.
- Create: `frontend/src/components/Admin/Assets/AssetColumns.tsx` — table columns for the asset list.
- Create: `frontend/src/components/Admin/Assets/AddAssetDialog.tsx` — create dialog using the existing admin form pattern.
- Create: `frontend/src/components/Admin/Assets/EditAssetDialog.tsx` — edit dialog for asset changes and activate/deactivate actions.
- Create: `frontend/src/components/Admin/Assets/AssetFilters.tsx` — toolbar with query and select filters.
- Create: `frontend/src/hooks/useAssets.ts` — query and mutation hooks backed by the generated API client.
- Modify: `frontend/src/routes/_layout/admin.tsx` — add navigation or tab-style entry to the asset page if needed.
- Modify: `frontend/src/client/types.gen.ts` and `frontend/src/client/sdk.gen.ts` — regenerated after the backend OpenAPI changes.
- Create: `frontend/tests/assets-admin.spec.ts` — Playwright route-mocked UI coverage for the Admin asset page.

### Supporting docs

- Modify: `release-notes.md` — add a short entry after implementation lands.

## Task 1: Add backend asset model and migration

**Files:**
- Modify: `backend/app/models.py`
- Modify: `backend/tests/conftest.py`
- Create: `backend/app/alembic/versions/20260413_add_asset_instruments.py`
- Test: `backend/tests/api/routes/test_assets.py`

- [ ] **Step 1: Write the failing backend model test coverage**

Create `backend/tests/api/routes/test_assets.py` with the first two tests:

```python
from fastapi.testclient import TestClient

from app.core.config import settings


def test_read_assets_requires_superuser(
    client: TestClient, normal_user_token_headers: dict[str, str]
) -> None:
    response = client.get(
        f"{settings.API_V1_STR}/assets",
        headers=normal_user_token_headers,
    )
    assert response.status_code == 403


def test_read_assets_returns_empty_collection_for_superuser(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    response = client.get(
        f"{settings.API_V1_STR}/assets",
        headers=superuser_token_headers,
    )
    assert response.status_code == 200
    assert response.json() == {"data": [], "count": 0}
```

- [ ] **Step 2: Run the new test file to verify it fails**

Run:

```bash
cd backend && uv run pytest tests/api/routes/test_assets.py -v
```

Expected: FAIL with a 404 or missing router/model behavior because `/api/v1/assets` does not exist yet.

- [ ] **Step 3: Add the asset SQLModel definitions**

Append the asset domain to `backend/app/models.py` using the existing pattern:

```python
class AssetInstrumentBase(SQLModel):
    asset_type: str = Field(max_length=32, index=True)
    symbol: str = Field(min_length=1, max_length=32, index=True)
    display_name: str = Field(min_length=1, max_length=255)
    canonical_name: str | None = Field(default=None, max_length=255)
    market: str | None = Field(default=None, max_length=64)
    exchange: str | None = Field(default=None, max_length=64)
    currency: str = Field(default="USD", max_length=8)
    country: str | None = Field(default=None, max_length=64)
    category_level_1: str = Field(default="other", max_length=64)
    category_level_2: str | None = Field(default=None, max_length=64)
    status: str = Field(default="active", max_length=32)
    sync_status: str = Field(default="manual", max_length=32)
    external_source: str | None = Field(default=None, max_length=64)
    external_id: str | None = Field(default=None, max_length=128)
    is_active: bool = True


class AssetInstrumentCreate(AssetInstrumentBase):
    pass


class AssetInstrumentUpdate(SQLModel):
    asset_type: str | None = Field(default=None, max_length=32)
    symbol: str | None = Field(default=None, min_length=1, max_length=32)
    display_name: str | None = Field(default=None, min_length=1, max_length=255)
    canonical_name: str | None = Field(default=None, max_length=255)
    market: str | None = Field(default=None, max_length=64)
    exchange: str | None = Field(default=None, max_length=64)
    currency: str | None = Field(default=None, max_length=8)
    country: str | None = Field(default=None, max_length=64)
    category_level_1: str | None = Field(default=None, max_length=64)
    category_level_2: str | None = Field(default=None, max_length=64)
    status: str | None = Field(default=None, max_length=32)
    sync_status: str | None = Field(default=None, max_length=32)
    external_source: str | None = Field(default=None, max_length=64)
    external_id: str | None = Field(default=None, max_length=128)
    is_active: bool | None = None


class AssetInstrument(AssetInstrumentBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime = Field(default_factory=get_datetime_utc, sa_type=DateTime(timezone=True))  # type: ignore
    updated_at: datetime = Field(default_factory=get_datetime_utc, sa_type=DateTime(timezone=True))  # type: ignore
    last_synced_at: datetime | None = Field(default=None, sa_type=DateTime(timezone=True))  # type: ignore


class AssetInstrumentPublic(AssetInstrumentBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    last_synced_at: datetime | None = None


class AssetInstrumentsPublic(SQLModel):
    data: list[AssetInstrumentPublic]
    count: int
```

- [ ] **Step 4: Update test cleanup for the new table**

Modify `backend/tests/conftest.py` so teardown deletes asset rows before dropping users:

```python
from app.models import AssetInstrument, AuditEvent, Item, NormalizationConflict, NormalizedPosition, RawPosition, User

# ...

statement = delete(AssetInstrument)
session.execute(statement)
statement = delete(AuditEvent)
session.execute(statement)
```

- [ ] **Step 5: Create the Alembic migration**

Create `backend/app/alembic/versions/20260413_add_asset_instruments.py` with:

```python
revision = "20260413_add_asset_instruments"
down_revision = "7c2f1d4e9a10"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "assetinstrument",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("asset_type", sa.String(length=32), nullable=False),
        sa.Column("symbol", sa.String(length=32), nullable=False),
        sa.Column("display_name", sa.String(length=255), nullable=False),
        sa.Column("canonical_name", sa.String(length=255), nullable=True),
        sa.Column("market", sa.String(length=64), nullable=True),
        sa.Column("exchange", sa.String(length=64), nullable=True),
        sa.Column("currency", sa.String(length=8), nullable=False),
        sa.Column("country", sa.String(length=64), nullable=True),
        sa.Column("category_level_1", sa.String(length=64), nullable=False),
        sa.Column("category_level_2", sa.String(length=64), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("sync_status", sa.String(length=32), nullable=False),
        sa.Column("external_source", sa.String(length=64), nullable=True),
        sa.Column("external_id", sa.String(length=128), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("last_synced_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_assetinstrument_asset_type"), "assetinstrument", ["asset_type"], unique=False)
    op.create_index(op.f("ix_assetinstrument_symbol"), "assetinstrument", ["symbol"], unique=False)
    op.create_unique_constraint(
        "uq_assetinstrument_type_symbol_exchange",
        "assetinstrument",
        ["asset_type", "symbol", "exchange"],
    )


def downgrade() -> None:
    op.drop_constraint("uq_assetinstrument_type_symbol_exchange", "assetinstrument", type_="unique")
    op.drop_index(op.f("ix_assetinstrument_symbol"), table_name="assetinstrument")
    op.drop_index(op.f("ix_assetinstrument_asset_type"), table_name="assetinstrument")
    op.drop_table("assetinstrument")
```

- [ ] **Step 6: Run the model test file again**

Run:

```bash
cd backend && uv run pytest tests/api/routes/test_assets.py -v
```

Expected: still FAIL, but now because the router and CRUD handlers are missing instead of the model/table.

- [ ] **Step 7: Commit the schema-only slice**

```bash
git add backend/app/models.py backend/tests/conftest.py backend/app/alembic/versions/*.py backend/tests/api/routes/test_assets.py
git commit -m "feat: add asset instrument schema"
```

## Task 2: Add superuser-only asset CRUD API

**Files:**
- Create: `backend/app/api/routes/assets.py`
- Modify: `backend/app/api/main.py`
- Modify: `backend/tests/api/routes/test_assets.py`

- [ ] **Step 1: Extend the failing API tests**

Add route behavior tests to `backend/tests/api/routes/test_assets.py`:

```python
def test_create_asset_for_superuser(client: TestClient, superuser_token_headers: dict[str, str]) -> None:
    response = client.post(
        f"{settings.API_V1_STR}/assets",
        headers=superuser_token_headers,
        json={
            "asset_type": "stock",
            "symbol": "AAPL",
            "display_name": "Apple Inc.",
            "canonical_name": "Apple Inc.",
            "exchange": "NASDAQ",
            "market": "US",
            "currency": "USD",
            "country": "US",
            "category_level_1": "equity",
            "category_level_2": "large_cap",
            "status": "active",
            "sync_status": "manual",
            "is_active": True,
        },
    )
    assert response.status_code == 200
    content = response.json()
    assert content["symbol"] == "AAPL"
    assert content["asset_type"] == "stock"
    assert content["sync_status"] == "manual"


def test_duplicate_asset_returns_conflict(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    payload = {
        "asset_type": "stock",
        "symbol": "AAPL",
        "display_name": "Apple Inc.",
        "exchange": "NASDAQ",
        "market": "US",
        "currency": "USD",
        "country": "US",
        "category_level_1": "equity",
        "status": "active",
        "sync_status": "manual",
        "is_active": True,
    }
    first = client.post(f"{settings.API_V1_STR}/assets", headers=superuser_token_headers, json=payload)
    second = client.post(f"{settings.API_V1_STR}/assets", headers=superuser_token_headers, json=payload)
    assert first.status_code == 200
    assert second.status_code == 409


def test_patch_asset_can_deactivate(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    created = client.post(
        f"{settings.API_V1_STR}/assets",
        headers=superuser_token_headers,
        json={
            "asset_type": "etf",
            "symbol": "QQQ",
            "display_name": "Invesco QQQ",
            "exchange": "NASDAQ",
            "market": "US",
            "currency": "USD",
            "country": "US",
            "category_level_1": "fund",
            "status": "active",
            "sync_status": "manual",
            "is_active": True,
        },
    )
    asset_id = created.json()["id"]
    response = client.patch(
        f"{settings.API_V1_STR}/assets/{asset_id}",
        headers=superuser_token_headers,
        json={"is_active": False, "status": "inactive"},
    )
    assert response.status_code == 200
    assert response.json()["is_active"] is False
    assert response.json()["status"] == "inactive"
```

- [ ] **Step 2: Run the asset API tests to verify route failures**

Run:

```bash
cd backend && uv run pytest tests/api/routes/test_assets.py -v
```

Expected: FAIL because `/api/v1/assets` is still not registered.

- [ ] **Step 3: Implement the assets router**

Create `backend/app/api/routes/assets.py`:

```python
import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import col, func, or_, select

from app.api.deps import SessionDep, get_current_active_superuser
from app.models import (
    AssetInstrument,
    AssetInstrumentCreate,
    AssetInstrumentPublic,
    AssetInstrumentsPublic,
    AssetInstrumentUpdate,
)

router = APIRouter(prefix="/assets", tags=["assets"], dependencies=[Depends(get_current_active_superuser)])


@router.get("/", response_model=AssetInstrumentsPublic)
def read_assets(
    session: SessionDep,
    skip: int = 0,
    limit: int = 100,
    asset_type: str | None = None,
    is_active: bool | None = None,
    status: str | None = None,
    query: str | None = None,
) -> Any:
    statement = select(AssetInstrument)
    count_statement = select(func.count()).select_from(AssetInstrument)

    filters = []
    if asset_type:
        filters.append(AssetInstrument.asset_type == asset_type)
    if is_active is not None:
        filters.append(AssetInstrument.is_active == is_active)
    if status:
        filters.append(AssetInstrument.status == status)
    if query:
        like_value = f"%{query}%"
        filters.append(
            or_(
                col(AssetInstrument.symbol).ilike(like_value),
                col(AssetInstrument.display_name).ilike(like_value),
            )
        )

    for condition in filters:
        statement = statement.where(condition)
        count_statement = count_statement.where(condition)

    count = session.exec(count_statement).one()
    rows = session.exec(
        statement.order_by(col(AssetInstrument.updated_at).desc()).offset(skip).limit(limit)
    ).all()
    return AssetInstrumentsPublic(
        data=[AssetInstrumentPublic.model_validate(row) for row in rows],
        count=count,
    )


@router.post("/", response_model=AssetInstrumentPublic)
def create_asset(*, session: SessionDep, asset_in: AssetInstrumentCreate) -> Any:
    existing = session.exec(
        select(AssetInstrument).where(
            AssetInstrument.asset_type == asset_in.asset_type,
            AssetInstrument.symbol == asset_in.symbol,
            AssetInstrument.exchange == asset_in.exchange,
        )
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="Asset instrument already exists")
    asset = AssetInstrument.model_validate(asset_in)
    session.add(asset)
    session.commit()
    session.refresh(asset)
    return asset


@router.get("/{asset_id}", response_model=AssetInstrumentPublic)
def read_asset(asset_id: uuid.UUID, session: SessionDep) -> Any:
    asset = session.get(AssetInstrument, asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset instrument not found")
    return asset


@router.patch("/{asset_id}", response_model=AssetInstrumentPublic)
def update_asset(*, asset_id: uuid.UUID, session: SessionDep, asset_in: AssetInstrumentUpdate) -> Any:
    asset = session.get(AssetInstrument, asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset instrument not found")
    asset.sqlmodel_update(asset_in.model_dump(exclude_unset=True))
    asset.updated_at = asset.get_datetime_utc()  # replace with imported helper usage in final edit
    session.add(asset)
    session.commit()
    session.refresh(asset)
    return asset
```

- [ ] **Step 4: Register the router**

Modify `backend/app/api/main.py`:

```python
from app.api.routes import assets, items, login, portfolio, private, users, utils

# ...
api_router.include_router(assets.router)
api_router.include_router(login.router)
```

- [ ] **Step 5: Fix the timestamp helper call in the final implementation**

Replace the temporary inline reference in `assets.py` with the existing shared helper import:

```python
from app.models import get_datetime_utc

# ...
asset.updated_at = get_datetime_utc()
```

- [ ] **Step 6: Run the backend asset tests until they pass**

Run:

```bash
cd backend && uv run pytest tests/api/routes/test_assets.py -v
```

Expected: PASS for read/create/duplicate/deactivate coverage.

- [ ] **Step 7: Run the broader backend route suite**

Run:

```bash
cd backend && uv run pytest tests/api/routes/test_portfolio.py tests/api/routes/test_users.py tests/api/routes/test_assets.py -v
```

Expected: PASS, confirming the new router did not break portfolio or users behavior.

- [ ] **Step 8: Commit the backend API slice**

```bash
git add backend/app/api/main.py backend/app/api/routes/assets.py backend/tests/api/routes/test_assets.py
git commit -m "feat: add asset instrument admin api"
```

## Task 3: Generate the frontend client and asset hooks

**Files:**
- Modify: `frontend/src/client/types.gen.ts`
- Modify: `frontend/src/client/sdk.gen.ts`
- Create: `frontend/src/hooks/useAssets.ts`

- [ ] **Step 1: Add a failing hook consumer sketch**

Create `frontend/src/hooks/useAssets.ts` with the intended API shape before generation is complete:

```ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { AssetsService } from "@/client"

export const assetsQueryKey = ["admin", "assets"] as const

export function useAssets(params: {
  assetType?: string
  isActive?: boolean
  query?: string
}) {
  return useQuery({
    queryFn: () =>
      AssetsService.readAssets({
        asset_type: params.assetType,
        is_active: params.isActive,
        query: params.query,
      }),
    queryKey: [...assetsQueryKey, params],
  })
}
```

- [ ] **Step 2: Run TypeScript checking to verify the generated client is missing**

Run:

```bash
cd frontend && bun run build
```

Expected: FAIL because `AssetsService` and related asset types do not yet exist in the generated client.

- [ ] **Step 3: Generate the updated API client**

Run from the repository root while the local backend is running:

```bash
bash ./scripts/generate-client.sh
```

Expected: `frontend/src/client/sdk.gen.ts` and `frontend/src/client/types.gen.ts` gain `AssetsService`, `AssetInstrumentPublic`, `AssetInstrumentsPublic`, and related request types.

- [ ] **Step 4: Finish the asset hooks with list/create/update support**

Replace `frontend/src/hooks/useAssets.ts` with:

```ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { AssetsService, type AssetInstrumentCreate, type AssetInstrumentUpdate } from "@/client"

export const assetsBaseQueryKey = ["admin", "assets"] as const

export function useAssets(params: {
  assetType?: string
  isActive?: boolean
  status?: string
  query?: string
}) {
  return useQuery({
    queryFn: () =>
      AssetsService.readAssets({
        asset_type: params.assetType,
        is_active: params.isActive,
        status: params.status,
        query: params.query,
      }),
    queryKey: [...assetsBaseQueryKey, params],
  })
}

export function useCreateAsset() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (requestBody: AssetInstrumentCreate) =>
      AssetsService.createAsset({ requestBody }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assetsBaseQueryKey })
    },
  })
}

export function useUpdateAsset() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ assetId, requestBody }: { assetId: string; requestBody: AssetInstrumentUpdate }) =>
      AssetsService.updateAsset({ assetId, requestBody }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assetsBaseQueryKey })
    },
  })
}
```

- [ ] **Step 5: Run the frontend build again**

Run:

```bash
cd frontend && bun run build
```

Expected: PASS for the generated client and hook layer, even before the route UI is added.

- [ ] **Step 6: Commit the client/hook slice**

```bash
git add frontend/src/client/sdk.gen.ts frontend/src/client/types.gen.ts frontend/src/hooks/useAssets.ts
git commit -m "feat: add asset maintenance frontend client hooks"
```

## Task 4: Build the Admin asset maintenance UI

**Files:**
- Create: `frontend/src/routes/_layout/admin.assets.tsx`
- Create: `frontend/src/components/Admin/Assets/AssetColumns.tsx`
- Create: `frontend/src/components/Admin/Assets/AddAssetDialog.tsx`
- Create: `frontend/src/components/Admin/Assets/EditAssetDialog.tsx`
- Create: `frontend/src/components/Admin/Assets/AssetFilters.tsx`
- Modify: `frontend/src/routes/_layout/admin.tsx`
- Test: `frontend/tests/assets-admin.spec.ts`

- [ ] **Step 1: Write the failing Playwright UI test**

Create `frontend/tests/assets-admin.spec.ts`:

```ts
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

  test("shows the asset management table and create action", async ({ page }) => {
    await page.goto("/admin/assets")

    await expect(page.getByRole("heading", { name: "Asset Instruments" })).toBeVisible()
    await expect(page.getByRole("button", { name: "Add Asset" })).toBeVisible()
    await expect(page.getByRole("cell", { name: "AAPL" })).toBeVisible()
    await expect(page.getByText("Apple Inc.")).toBeVisible()
    await expect(page.getByText("manual")).toBeVisible()
  })
})
```

- [ ] **Step 2: Run the Playwright test to verify the route is missing**

Run:

```bash
cd frontend && bunx playwright test tests/assets-admin.spec.ts
```

Expected: FAIL because `/admin/assets` and the asset components do not exist yet.

- [ ] **Step 3: Add the asset table column definition**

Create `frontend/src/components/Admin/Assets/AssetColumns.tsx`:

```tsx
import type { ColumnDef } from "@tanstack/react-table"

import type { AssetInstrumentPublic } from "@/client"
import { Badge } from "@/components/ui/badge"
import { EditAssetDialog } from "./EditAssetDialog"

export const assetColumns: ColumnDef<AssetInstrumentPublic>[] = [
  {
    accessorKey: "symbol",
    header: "Symbol",
    cell: ({ row }) => (
      <span className="font-mono font-semibold text-primary">
        {row.original.symbol}
      </span>
    ),
  },
  {
    accessorKey: "display_name",
    header: "Name",
  },
  {
    accessorKey: "asset_type",
    header: "Type",
    cell: ({ row }) => <Badge variant="secondary">{row.original.asset_type}</Badge>,
  },
  {
    accessorKey: "exchange",
    header: "Exchange",
  },
  {
    accessorKey: "currency",
    header: "Currency",
    cell: ({ row }) => <span className="font-mono">{row.original.currency}</span>,
  },
  {
    accessorKey: "status",
    header: "Status",
  },
  {
    accessorKey: "sync_status",
    header: "Sync",
    cell: ({ row }) => (
      <Badge variant="outline" className="border-amber-600 text-amber-700">
        {row.original.sync_status}
      </Badge>
    ),
  },
  {
    id: "actions",
    header: () => <span className="sr-only">Actions</span>,
    cell: ({ row }) => <EditAssetDialog asset={row.original} />,
  },
]
```

- [ ] **Step 4: Add the create dialog**

Create `frontend/src/components/Admin/Assets/AddAssetDialog.tsx` using the current `AddUser` dialog pattern:

```tsx
const formSchema = z.object({
  asset_type: z.enum(["stock", "etf", "crypto", "bond", "cash"]),
  symbol: z.string().min(1),
  display_name: z.string().min(1),
  exchange: z.string().optional(),
  market: z.string().optional(),
  currency: z.string().min(1).default("USD"),
  country: z.string().optional(),
  category_level_1: z.string().min(1),
  category_level_2: z.string().optional(),
  status: z.string().default("active"),
  sync_status: z.string().default("manual"),
  is_active: z.boolean(),
})

// Inside submit:
createAssetMutation.mutate({
  ...data,
  canonical_name: data.display_name,
})
```

- [ ] **Step 5: Add the filters toolbar**

Create `frontend/src/components/Admin/Assets/AssetFilters.tsx`:

```tsx
type AssetFiltersProps = {
  assetType: string
  query: string
  status: string
  onAssetTypeChange: (value: string) => void
  onQueryChange: (value: string) => void
  onStatusChange: (value: string) => void
}

export function AssetFilters(props: AssetFiltersProps) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <Input
        value={props.query}
        onChange={(event) => props.onQueryChange(event.target.value)}
        placeholder="Search by symbol or name"
        className="md:max-w-sm"
      />
      <div className="flex gap-3">
        <Select value={props.assetType} onValueChange={props.onAssetTypeChange}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Asset Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="stock">Stock</SelectItem>
            <SelectItem value="etf">ETF</SelectItem>
            <SelectItem value="crypto">Crypto</SelectItem>
            <SelectItem value="bond">Bond</SelectItem>
            <SelectItem value="cash">Cash</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Add the edit dialog**

Create `frontend/src/components/Admin/Assets/EditAssetDialog.tsx`:

```tsx
import { useState } from "react"

import type { AssetInstrumentPublic } from "@/client"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useUpdateAsset } from "@/hooks/useAssets"

type EditAssetDialogProps = {
  asset: AssetInstrumentPublic
}

export function EditAssetDialog({ asset }: EditAssetDialogProps) {
  const [open, setOpen] = useState(false)
  const updateAsset = useUpdateAsset()

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Asset</DialogTitle>
          <DialogDescription>
            Update asset metadata or deactivate the instrument.
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() =>
              updateAsset.mutate({
                assetId: asset.id,
                requestBody: { is_active: !asset.is_active },
              })
            }
          >
            {asset.is_active ? "Deactivate" : "Activate"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 7: Add the Admin route**

Create `frontend/src/routes/_layout/admin.assets.tsx`:

```tsx
import { createFileRoute } from "@tanstack/react-router"
import { useMemo, useState } from "react"

import { AddAssetDialog } from "@/components/Admin/Assets/AddAssetDialog"
import { assetColumns } from "@/components/Admin/Assets/AssetColumns"
import { AssetFilters } from "@/components/Admin/Assets/AssetFilters"
import { DataTable } from "@/components/Common/DataTable"
import { useAssets } from "@/hooks/useAssets"

export const Route = createFileRoute("/_layout/admin/assets")({
  component: AdminAssetsPage,
})

function AdminAssetsPage() {
  const [assetType, setAssetType] = useState("all")
  const [status, setStatus] = useState("all")
  const [query, setQuery] = useState("")

  const params = useMemo(
    () => ({
      assetType: assetType === "all" ? undefined : assetType,
      status: status === "all" ? undefined : status,
      query: query || undefined,
    }),
    [assetType, query, status],
  )

  const { data, isLoading } = useAssets(params)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Asset Instruments</h1>
          <p className="text-muted-foreground">
            Maintain the shared asset catalog used for future holdings matching.
          </p>
        </div>
        <AddAssetDialog />
      </div>

      <AssetFilters
        assetType={assetType}
        status={status}
        query={query}
        onAssetTypeChange={setAssetType}
        onStatusChange={setStatus}
        onQueryChange={setQuery}
      />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading assets...</p>
      ) : (
        <DataTable columns={assetColumns} data={data?.data ?? []} />
      )}
    </div>
  )
}
```

- [ ] **Step 8: Add a route entry from the existing Admin page**

Modify `frontend/src/routes/_layout/admin.tsx` to add a visible entry point:

```tsx
import { Link } from "@tanstack/react-router"

// Inside the header area:
<div className="flex items-center gap-2">
  <AddUser />
  <Button asChild variant="outline">
    <Link to="/admin/assets">Manage Assets</Link>
  </Button>
</div>
```

- [ ] **Step 9: Expand the Playwright test for edit visibility**

Update `frontend/tests/assets-admin.spec.ts`:

```ts
await expect(page.getByRole("button", { name: "Edit" })).toBeVisible()
```

- [ ] **Step 10: Run lint and the targeted Playwright test**

Run:

```bash
cd frontend && bun run lint && bunx playwright test tests/assets-admin.spec.ts
```

Expected: PASS, confirming the route, mocked list rendering, and create action visibility.

- [ ] **Step 11: Commit the UI slice**

```bash
git add frontend/src/routes/_layout/admin.tsx frontend/src/routes/_layout/admin.assets.tsx frontend/src/components/Admin/Assets frontend/tests/assets-admin.spec.ts
git commit -m "feat: add admin asset maintenance ui"
```

## Task 5: Finish integration checks and release notes

**Files:**
- Modify: `release-notes.md`

- [ ] **Step 1: Add a short release note entry**

Add a concise note near the top of `release-notes.md`:

```md
## Asset instrument maintenance

- Added superuser-only asset catalog management for stocks, ETFs, crypto, bonds, and cash-like instruments
- Added Admin UI for asset search, filtering, create, edit, and deactivate workflows
- Reserved synchronization metadata fields for a future external market-data integration
```

- [ ] **Step 2: Run the focused backend and frontend validations**

Run:

```bash
cd backend && uv run pytest tests/api/routes/test_assets.py tests/api/routes/test_portfolio.py -v
cd ../frontend && bun run build && bunx playwright test tests/assets-admin.spec.ts
```

Expected: PASS for the new backend route coverage and the admin asset UI flow.

- [ ] **Step 3: Commit the finishing pass**

```bash
git add release-notes.md
git commit -m "docs: record asset maintenance release notes"
```

## Self-Review

### Spec coverage

- Global shared catalog: covered in Task 1 model and Task 2 API.
- Supported asset classes: covered in Task 1 schema and Task 4 create dialog.
- Superuser-only maintenance: covered in Task 2 router and Task 4 Admin route placement.
- Manual maintenance with sync placeholders: covered in Task 1 fields, Task 2 API, and Task 4 UI columns/forms.
- Search, filter, create, edit, activate/deactivate: covered in Task 2 API and Task 4 UI.
- No hard delete in v1: covered in Task 2 lifecycle rules by omitting delete endpoints and using `PATCH`.
- Future matching target: preserved by the standalone asset domain and release-note/docs flow.

### Placeholder scan

- No task says “TODO”, “implement later”, or “write tests” without concrete code or commands.

### Type consistency

- Backend naming is consistently `AssetInstrument`, `AssetInstrumentCreate`, `AssetInstrumentUpdate`, `AssetInstrumentPublic`, and `AssetInstrumentsPublic`.
- Frontend naming consistently expects generated `AssetsService` methods and `AssetInstrumentPublic` types.
- The route path is consistently `/api/v1/assets` on the backend and `/admin/assets` on the frontend.
