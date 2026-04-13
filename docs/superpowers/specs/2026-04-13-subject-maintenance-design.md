# Subject Maintenance Design

## Goal

Add first-class subject maintenance to the investment portfolio product so superusers can manage personnel and organization master data through one shared entry point, while keeping people and institutions as separate business entities.

## Current State

- The frontend already has protected CRUD-style management pages for items and admin users.
- Superuser-only access is enforced on the existing `/admin` route.
- The backend currently has no persisted person or organization master-data entities.
- The project already uses a consistent FastAPI + SQLModel backend pattern and an OpenAPI-generated frontend client.

## Product Decisions

### Confirmed Scope

1. Add a superuser-only subject maintenance feature.
2. Use one navigation entry named `主体维护`.
3. Split the page into two tabs: `人员` and `机构`.
4. Persist people and organizations as two separate entities, not one mixed subject table.
5. Support v1 CRUD only: list, create, edit, and delete.
6. Keep `alias` as a single text field in v1.
7. Do not add search or filter behavior in v1.
8. Keep the feature standalone and do not wire it into downstream portfolio or transaction flows yet.

### Deferred Scope

- Structured multi-alias management.
- Search and type filters.
- Relationship management between people and organizations.
- Business references from accounts, portfolios, transactions, or holdings.
- Duplicate detection across entities.
- Bulk import, export, or bulk edit flows.

## Domain Model

### Person

`Person` represents a managed human subject record.

**Fields**

- `id: UUID`
- `person_type: PersonType`
- `name: str`
- `alias: str | None`
- `notes: str | None`
- `created_at: datetime`
- `updated_at: datetime`

**Rules**

- `name` is required.
- `person_type` is required and restricted to a fixed enum in v1.
- `alias` is optional and stores one free-text alternate name.
- `notes` is optional and supports longer descriptive text than `alias`.

**V1 enum**

- `internal_member`
- `client_contact`
- `external_advisor`
- `other`

### Organization

`Organization` represents a managed institution or company record.

**Fields**

- `id: UUID`
- `organization_type: OrganizationType`
- `name: str`
- `alias: str | None`
- `notes: str | None`
- `created_at: datetime`
- `updated_at: datetime`

**Rules**

- `name` is required.
- `organization_type` is required and restricted to a fixed enum in v1.
- `alias` is optional and stores one free-text alternate name.
- `notes` is optional.

**V1 enum**

- `fund_or_investment_vehicle`
- `broker_or_bank`
- `service_provider`
- `other`

## API Design

### Permissions

All subject-maintenance APIs are superuser-only. Ordinary authenticated users should receive the same style of authorization failure already used by existing protected admin endpoints.

### People API

New router: `/api/v1/people`

**Endpoints**

- `GET /people`
- `POST /people`
- `GET /people/{person_id}`
- `PATCH /people/{person_id}`
- `DELETE /people/{person_id}`

**Response shapes**

- `PersonPublic`
- `PeoplePublic`

### Organizations API

New router: `/api/v1/organizations`

**Endpoints**

- `GET /organizations`
- `POST /organizations`
- `GET /organizations/{organization_id}`
- `PATCH /organizations/{organization_id}`
- `DELETE /organizations/{organization_id}`

**Response shapes**

- `OrganizationPublic`
- `OrganizationsPublic`

### Common API Notes

- List endpoints should follow the existing `skip/limit` pattern even if the first frontend version fetches a simple initial page.
- v1 does not expose search or filter query parameters.
- Validation failures should return explicit API errors; no silent coercion or success-shaped fallback behavior.
- Delete remains a hard delete in v1 because there is no downstream reference graph yet.

## Frontend Design

### Navigation and Route Shape

- Add a new protected route such as `/_layout/subjects`.
- Restrict access to superusers using the same route-guard approach already used by the admin page.
- Add one sidebar entry labeled `主体维护`.

### Page Structure

The page should feel like one maintenance workspace rather than two unrelated modules.

**Layout**

- Page title: `主体维护`
- Supporting copy describing personnel and organization master data management
- Tabs for `人员` and `机构`
- A primary action button aligned with the current tab context:
  - `新增人员`
  - `新增机构`

### Table Design

Each tab renders a separate table using the existing `DataTable` pattern.

**People columns**

- 类型
- 姓名
- 别名
- 备注
- 操作

**Organizations columns**

- 类型
- 机构名称
- 别名
- 备注
- 操作

### Form Design

- Reuse the current dialog-based CRUD pattern from `Items` and `Admin`.
- Reuse React Hook Form + zod validation.
- Use dedicated create/edit dialogs for people and organizations rather than a single polymorphic form.
- Keep labels and empty-state copy in Chinese business language.

### Delete Behavior

- Reuse the project’s confirmation-dialog pattern.
- Show explicit destructive styling for delete actions.
- If deletion fails, surface the backend error through the existing toast/error flow.

### Empty States

Each tab should have its own empty state:

- no people yet → invite user to create the first person
- no organizations yet → invite user to create the first organization

## Error Handling and Validation

### Backend Validation

- Reject blank `name`.
- Reject missing or unsupported enum values.
- Apply practical max-length limits aligned with existing SQLModel field usage.
- Return explicit `404` for missing records and explicit authorization errors for non-superusers.

### Frontend Validation

- Validate required fields before submission.
- Keep optimistic behavior simple: no speculative row insertion before server success.
- On success, close the dialog, reset the form, and invalidate the relevant query key.
- On failure, show the current project-standard toast error feedback.

## Backend File Structure

### Modify

- `backend/app/models.py`
- `backend/app/api/main.py`
- backend-generated OpenAPI output if the current workflow requires regenerating it

### Create

- `backend/app/api/routes/people.py`
- `backend/app/api/routes/organizations.py`
- Alembic revision for new tables
- Backend tests for both route groups

## Frontend File Structure

### Modify

- `frontend/src/components/Sidebar/AppSidebar.tsx`
- `frontend/src/routeTree.gen.ts` after route generation

### Create

- `frontend/src/routes/_layout/subjects.tsx`
- `frontend/src/components/Subjects/` for shared page-level pieces
- `frontend/src/components/Subjects/People/` for people table, columns, and dialogs
- `frontend/src/components/Subjects/Organizations/` for organization table, columns, and dialogs
- Generated client updates after backend OpenAPI changes

## Testing Scope

### Backend

- Superuser can create, list, update, and delete people.
- Superuser can create, list, update, and delete organizations.
- Non-superusers cannot access either route group.
- Validation rejects invalid or incomplete payloads.

### Frontend

- Superuser can open the subject maintenance page.
- Tab switching updates the visible table and primary action.
- Create and edit flows refresh the correct tab data.
- Delete requires confirmation.
- Non-superusers are redirected away from the route.

## Acceptance Criteria

1. A superuser can manage people and organizations from one `主体维护` page.
2. People and organizations are stored in separate tables and exposed through separate APIs.
3. Each entity supports type, name, alias, and notes in v1.
4. The UI uses two tabs and existing project CRUD interaction patterns.
5. The feature does not yet depend on downstream portfolio business references.
