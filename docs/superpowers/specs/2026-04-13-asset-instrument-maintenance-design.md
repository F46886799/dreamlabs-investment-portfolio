# Asset Instrument Maintenance Design

## Goal

Add first-class asset instrument maintenance to the investment portfolio product so superusers can manage a global, shared asset catalog for stocks, ETFs, cryptocurrencies, bonds, and cash-like instruments. This catalog becomes the future source of truth for position and transaction matching while v1 remains manually maintained.

## Current State

- The backend currently stores imported holdings in `RawPosition` and normalized holdings in `NormalizedPosition`.
- Portfolio APIs and UI are built around user-owned synchronized positions and aggregate views.
- There is no persisted global asset instrument entity.
- The frontend already has an `/admin` area gated by `is_superuser`.
- The product recently added portfolio pipeline routes and dashboard views, but there is no shared master-data layer between imported holdings and business-facing asset definitions.

## Product Decisions

### Confirmed Scope

1. Introduce a global shared asset catalog.
2. Support these v1 asset types: stock, ETF, cryptocurrency, bond, and cash-like.
3. Restrict asset maintenance to superusers.
4. Make v1 manually maintained.
5. Reserve fields for future metadata and market-data synchronization.
6. Add search, filter, create, edit, and activate/deactivate workflows.
7. Avoid hard delete in v1.
8. Design the asset catalog to become the downstream matching target for future holdings and transaction ingestion.

### Deferred Scope

- Automatic synchronization from external market-data providers.
- Bulk import and bulk update flows.
- Ordinary user editing.
- Quote history, candles, or time-series pricing storage.
- Full exchange/listing/reference-data platform with separate listing entities.
- Matching engine changes that immediately rewrite existing portfolio normalization.

## Domain Model

### AssetInstrument

`AssetInstrument` becomes the shared master-data record for a business-recognized tradable or cash-like asset.

**Fields**

- `id: UUID`
- `asset_type: AssetType`
- `symbol: str`
- `display_name: str`
- `canonical_name: str | None`
- `market: str | None`
- `exchange: str | None`
- `currency: str`
- `country: str | None`
- `category_level_1: str`
- `category_level_2: str | None`
- `status: str`
- `is_active: bool`
- `external_source: str | None`
- `external_id: str | None`
- `sync_status: str`
- `last_synced_at: datetime | None`
- `created_at: datetime`
- `updated_at: datetime`

**Rules**

- `asset_type` is restricted in v1 to `stock`, `etf`, `crypto`, `bond`, or `cash`.
- `symbol` is required, normalized for comparisons, and intended for human recognition.
- `display_name` is required and used throughout UI tables and selectors.
- `currency` defaults to `USD`.
- `status` represents business lifecycle state such as `draft`, `active`, or `inactive`.
- `is_active=false` is the primary lifecycle switch used by UI and downstream selection behavior.
- The table is global and does not store `owner_id`.

### AssetAlias

`AssetAlias` stores alternate identifiers that future matching and synchronization flows can use.

**Fields**

- `id: UUID`
- `asset_instrument_id: UUID`
- `alias_type: str`
- `alias_value: str`
- `source: str | None`
- `is_primary: bool`
- `created_at: datetime`

**Rules**

- v1 may only expose minimal CRUD or may keep this structure internal, but the schema should exist now.
- The table supports future mappings such as alternate symbols, names, ISIN, CUSIP, or vendor identifiers.

### Auditability

The asset catalog is global, but every create/update/activation action should remain auditable through actor-aware application logs or audit events. The business entity itself remains ownerless.

## API Design

New router: `/api/v1/assets`

### Endpoints

- `GET /assets`
  - superuser only
  - supports filters: `asset_type`, `is_active`, `status`, `query`
- `POST /assets`
  - superuser only
  - creates one asset instrument
- `GET /assets/{asset_id}`
  - superuser only
  - returns one asset instrument
- `PATCH /assets/{asset_id}`
  - superuser only
  - updates editable fields, including `is_active` and metadata placeholders

### Response Shapes

- `AssetInstrumentPublic`
- `AssetInstrumentsPublic`

### Validation Rules

- Uniqueness should be enforced at least on `asset_type + symbol + exchange/market` using a practical null-safe approach.
- Attempts to create duplicates should return a conflict response instead of silently merging.
- Hard delete is not available in v1.

### Lifecycle Notes

- “Deactivate” is implemented through `PATCH is_active=false`.
- Inactive assets remain queryable in admin screens for history and future references.
- The API reserves synchronization fields but does not trigger background sync jobs in v1.

## Frontend Design

### Navigation

Place asset maintenance under the existing `/admin` superuser experience instead of the standard `/portfolio` navigation.

Recommended structure:

- `/admin`
  - existing user management
  - new asset maintenance section or nested route for asset instruments

### Asset Maintenance Page

Purpose: manage the shared asset catalog.

**Layout**

- top toolbar with search and filters
- primary table for asset instruments
- create/edit form in a dialog or side panel

**Filters**

- asset type
- active/inactive status
- business status
- free-text query for symbol or name

**Table columns**

- Symbol
- Display Name
- Asset Type
- Exchange/Market
- Currency
- Status
- Sync Status
- Last Synced At

**UI Rules**

- Reuse existing admin/table patterns already present in `frontend/src/routes/_layout/admin.tsx`.
- Code-like fields should use `font-mono`.
- Time or numeric columns should use `tabular-nums` where appropriate.
- Lifecycle indicators should follow the existing design system semantics: green for good/active states, amber for pending/manual/stale-like states.

### First Release Behaviors

- create asset
- edit asset
- activate/deactivate asset
- filter and search assets
- visibly show `sync_status` placeholder values such as `manual` or `pending`

### Deferred UI

- bulk import
- bulk edit
- auto-sync action buttons
- downstream matching review screens

## Backend File Structure

### Modify

- `backend/app/models.py`
- `backend/app/api/main.py`
- `backend/app/crud.py` if shared CRUD helpers are reused
- `backend/tests/conftest.py` if reusable fixtures are needed

### Create

- `backend/app/api/routes/assets.py`
- `backend/tests/api/routes/test_assets.py`
- a new Alembic revision adding asset instruments

## Frontend File Structure

### Modify

- `frontend/src/components/Sidebar/AppSidebar.tsx` only if admin navigation wording needs adjustment
- `frontend/src/routeTree.gen.ts` after route generation

### Create

- `frontend/src/routes/_layout/admin.assets.tsx` or equivalent nested admin route
- `frontend/src/components/Admin/Assets/*` for table, columns, and form pieces
- `frontend/src/hooks/useAssets.ts`
- generated client updates after backend schema changes

## Implementation Slices

### Slice 1

Persist the backend asset model, migration, schemas, and superuser-only CRUD APIs.

### Slice 2

Add the admin asset maintenance page with list, filters, create, edit, and activate/deactivate flows.

### Slice 3

Wire portfolio ingestion and matching design follow-ups against the asset catalog in a separate iteration.

## Acceptance Criteria

1. A superuser can create, edit, list, search, and deactivate asset instruments.
2. Asset instruments support stock, ETF, crypto, bond, and cash-like categories.
3. The catalog is shared globally and is not tied to any end user owner record.
4. The UI clearly shows manual/sync placeholder status without implementing auto-sync yet.
5. The design does not require reworking the asset entity when a future matching flow or external metadata sync is added.
