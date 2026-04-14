# Account and Portfolio Foundation Design

## Goal

Add first-class account maintenance to the investment portfolio product, support fixed account types (`brokerage`, `bank`), and make every managed portfolio belong to exactly one account while keeping account ownership as the single source of truth for synchronized positions.

## Current State

- The backend currently stores synchronized positions in `RawPosition` and `NormalizedPosition`.
- The portfolio dashboard is a unified, user-level aggregate exposed through `/api/v1/portfolio/unified` and `/api/v1/portfolio/health-report`.
- There is no persisted `Account` entity and no persisted `Portfolio` entity.
- The frontend only exposes portfolio overview, conflicts, and audit pages under `/portfolio`.
- Connector sync is global to the user and cannot attribute imported positions to a specific business container.

## Product Decisions

### Confirmed Scope

1. Introduce account maintenance.
2. Introduce managed portfolios as persisted entities.
3. Support fixed account types in v1: `brokerage` and `bank`.
4. Require every managed portfolio to belong to exactly one account.
5. Allow one account to own multiple managed portfolios.
6. Attribute synchronized positions to accounts, not directly to portfolios.
7. Add frontend management pages for accounts and portfolios.
8. Update the existing portfolio overview so it can operate on account- and portfolio-scoped data.

### Deferred Scope

- User-defined account types.
- Direct position-to-portfolio assignment.
- Multi-account portfolios.
- Connector credential management per account.
- Bank-specific balance ingestion flows distinct from holdings ingestion.
- Hard-delete workflows for accounts or portfolios.

## Domain Model

### Account

`Account` becomes the root business container for imported financial data.

**Fields**

- `id: UUID`
- `owner_id: UUID`
- `name: str`
- `account_type: AccountType`
- `institution_name: str`
- `account_mask: str | None`
- `base_currency: str`
- `notes: str | None`
- `is_active: bool`
- `created_at: datetime`
- `updated_at: datetime`

**Rules**

- `name` is required.
- `account_type` is restricted to `brokerage` or `bank`.
- `base_currency` defaults to `USD`.
- `account_mask` stores only masked display content such as `****1234`; full account numbers are out of scope.
- Inactive accounts remain queryable in management screens but are excluded from default selector options in dashboard flows.

### Managed Portfolio

`Portfolio` becomes a user-managed grouping that always belongs to exactly one account.

**Fields**

- `id: UUID`
- `owner_id: UUID`
- `account_id: UUID`
- `name: str`
- `description: str | None`
- `is_active: bool`
- `created_at: datetime`
- `updated_at: datetime`

**Rules**

- `account_id` is required.
- A portfolio cannot exist without an account.
- Inactive portfolios remain visible in management screens but are excluded from default dashboard selectors.
- Portfolios do not own positions directly in v1.

### Position Ownership

Positions remain owned by the user and are additionally attributed to an account.

**RawPosition additions**

- `account_id: UUID`

**NormalizedPosition additions**

- `account_id: UUID`

**Important design choice**

`NormalizedPosition` does **not** get a `portfolio_id` in v1. Portfolio-scoped views resolve to the owning account, then filter and aggregate on `account_id`.

This keeps synchronization and normalization tied to one ownership axis and avoids duplicating attribution logic across both accounts and portfolios.

## API Design

## Accounts API

New router: `/api/v1/accounts`

### Endpoints

- `GET /accounts`
  - returns all accounts for the current user
  - supports `include_inactive: bool = false`
- `POST /accounts`
  - creates an account
- `GET /accounts/{account_id}`
  - returns one account owned by the current user
- `PATCH /accounts/{account_id}`
  - updates editable fields, including `is_active`

### Response shapes

- `AccountPublic`
- `AccountsPublic`

### Notes

- No hard-delete endpoint in v1.
- “停用账户” is implemented through `PATCH is_active=false`.

## Portfolios API

New router: `/api/v1/portfolios`

### Endpoints

- `GET /portfolios`
  - returns all portfolios for the current user
  - supports `account_id` and `include_inactive`
- `POST /portfolios`
  - creates a portfolio under an account
- `GET /portfolios/{portfolio_id}`
  - returns one portfolio owned by the current user
- `PATCH /portfolios/{portfolio_id}`
  - updates editable fields, including `is_active` and `account_id`

### Response shapes

- `PortfolioPublic`
- `PortfoliosPublic`

### Notes

- Creating a portfolio requires an active account owned by the current user.
- Reassigning a portfolio to another account is allowed in v1 through `PATCH account_id`.

## Connector Sync API

Existing endpoint:

- `POST /api/v1/connectors/{source}/sync`

Change:

- require `account_id` query parameter

### Behavior

- The endpoint validates that the account exists, belongs to the current user, and is active.
- Imported `RawPosition` rows are written with `account_id`.
- Derived `NormalizedPosition` rows carry the same `account_id`.
- Audit and conflict behavior remains unchanged.

### UX implication

The dashboard sync action must be disabled until the user selects a concrete account context.

## Portfolio Aggregate APIs

Existing endpoints remain:

- `GET /api/v1/portfolio/unified`
- `GET /api/v1/portfolio/health-report`

### New query parameters

- `account_id: UUID | None`
- `portfolio_id: UUID | None`

### Resolution rules

1. No filter: aggregate across all active and inactive account-owned positions for the current user in the latest snapshot, matching current behavior as closely as possible.
2. `account_id`: aggregate only positions for that account.
3. `portfolio_id`: load the portfolio, resolve its `account_id`, then aggregate that account’s positions.
4. If both are provided and they disagree, return `409 Conflict`.

### Snapshot behavior

- Snapshot selection still uses the latest available normalized snapshot visible within the chosen scope.
- `stale` stays `true` when no normalized positions exist for the chosen scope.

## Validation and Lifecycle Rules

### Account lifecycle

- An account can be marked inactive at any time.
- An inactive account cannot be used as the target of connector sync.
- Existing positions remain visible historically after deactivation.

### Portfolio lifecycle

- A portfolio can be marked inactive at any time.
- An inactive portfolio is hidden from default dashboard selectors.
- Portfolio deactivation does not change account ownership of existing positions.

### Ownership checks

Every account, portfolio, and position query remains scoped by `owner_id == current_user.id`.

## Backend File Structure

### Modify

- `backend/app/models.py`
- `backend/app/api/main.py`
- `backend/app/api/routes/portfolio.py`
- `backend/app/services/portfolio_pipeline.py`
- `backend/tests/conftest.py`
- `backend/tests/api/routes/test_portfolio.py`

### Create

- `backend/app/api/routes/accounts.py`
- `backend/app/api/routes/portfolios.py`
- `backend/tests/api/routes/test_accounts.py`
- `backend/tests/api/routes/test_portfolios.py`
- `backend/app/alembic/versions/8d4f2c3b1a00_add_accounts_and_portfolios.py`

## Frontend Design

### Navigation

Add two first-level app destinations:

- `/accounts`
- `/portfolios`

Existing `/portfolio` remains the dashboard overview namespace.

### Accounts page

Purpose: maintain account master data.

**Table columns**

- Name
- Type
- Institution
- Mask
- Base currency
- Status
- Updated at

**Actions**

- Create account
- Edit account
- Activate/deactivate account

### Portfolios page

Purpose: maintain portfolio master data.

**Table columns**

- Name
- Account
- Description
- Status
- Updated at

**Actions**

- Create portfolio
- Edit portfolio
- Activate/deactivate portfolio

### Portfolio overview changes

Add top-level filters above metrics and holdings:

- Account selector
- Portfolio selector

**Behavior**

- Account selector drives the available portfolios.
- Portfolio selector is disabled until an account is selected or portfolios are preloaded.
- Sync button requires a specific account selection.
- Overview metrics, conflict badge, and unified table all refetch on filter change.

### Visual guidance

- Keep using the existing shadcn/new-york component set.
- Use table numerics with `font-mono tabular-nums`.
- Use semantic status presentation:
  - active/success: green
  - inactive/warning: amber or muted treatment
- Do not introduce bespoke CSS classes; use Tailwind utilities only.

## OpenAPI and Client Generation

- Backend schema additions require regenerating `frontend/openapi.json` and the generated client in `frontend/src/client/`.
- New frontend hooks and pages should consume generated SDK methods rather than bespoke fetch wrappers.

## Testing Strategy

### Backend

- Add API route tests for accounts CRUD-like lifecycle.
- Add API route tests for portfolio lifecycle and account ownership enforcement.
- Extend portfolio route tests to cover:
  - sync requires `account_id`
  - sync rejects inactive accounts
  - unified aggregation filtered by account
  - unified aggregation filtered by portfolio
  - conflicting filters return `409`

### Frontend

- Extend `frontend/tests/portfolio.spec.ts` to cover:
  - account management page render
  - portfolio management page render
  - filtered overview behavior
  - sync button disabled until account selection

## Migration Strategy

1. Add `Account` and `Portfolio` tables.
2. Add nullable `account_id` columns to `RawPosition` and `NormalizedPosition`.
3. Backfill is unnecessary for local/demo data because current data is disposable in development.
4. After code paths are updated, make `account_id` non-nullable in the same migration for new deployments.

Because the project is still early and the current portfolio pipeline is newly introduced, a single forward migration is acceptable.

## Risks and Mitigations

### Risk: sync UX becomes unclear on all-accounts overview

Mitigation: require explicit account selection before enabling sync and show helper text in the UI.

### Risk: portfolio filter suggests direct ownership that does not exist

Mitigation: clearly label portfolios as account-scoped views in the management and overview pages.

### Risk: query behavior diverges between account and portfolio filters

Mitigation: centralize filter resolution in backend service helpers and reuse the same scope object for unified and health queries.

## Delivery Outcome

After implementation:

- users can maintain accounts and portfolios,
- every portfolio belongs to one account,
- synchronized positions are attributed to accounts,
- the overview can be filtered by account or portfolio,
- and the system remains aligned with the existing portfolio pipeline instead of introducing a parallel ownership model.
