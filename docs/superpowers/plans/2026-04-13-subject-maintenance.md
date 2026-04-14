# Subject Maintenance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a superuser-only `主体维护` workspace with separate People and Organizations CRUD flows backed by new FastAPI + SQLModel entities and surfaced through the generated frontend client.

**Architecture:** Keep the backend domain split into `Person` and `Organization` so each record type has a clean schema, router, and test surface. On the frontend, add one protected `/subjects` route with tabs for `人员` and `机构`, reusing the existing dialog-based CRUD, table, toast, and permissions patterns already used by `Items` and `Admin`.

**Tech Stack:** FastAPI, SQLModel, Alembic, Pytest, React 19, TanStack Router, TanStack Query, React Hook Form, zod, shadcn/ui, Playwright, Bun, uv

---

## File Structure Map

### Backend

- Modify: `backend/app/models.py` — add `PersonType`, `OrganizationType`, entity tables, create/update/public/list schemas.
- Modify: `backend/app/api/main.py` — register new routers.
- Create: `backend/app/api/routes/people.py` — superuser-only CRUD for people.
- Create: `backend/app/api/routes/organizations.py` — superuser-only CRUD for organizations.
- Create: `backend/app/alembic/versions/20260413_subjects_add_subject_maintenance_tables.py` — create `person` and `organization` tables plus enum-compatible columns and timestamps.
- Modify: `backend/tests/conftest.py` — clean new tables between tests.
- Create: `backend/tests/api/routes/test_people.py` — people API coverage.
- Create: `backend/tests/api/routes/test_organizations.py` — organization API coverage.
- Create: `backend/tests/utils/person.py` — helper to create people in tests.
- Create: `backend/tests/utils/organization.py` — helper to create organizations in tests.

### Frontend

- Modify: `frontend/src/components/Sidebar/AppSidebar.tsx` — add superuser-only `主体维护` nav item.
- Create: `frontend/src/routes/_layout/subjects.tsx` — protected route with tab workspace and query wiring.
- Create: `frontend/src/components/Subjects/People/AddPerson.tsx` — create dialog.
- Create: `frontend/src/components/Subjects/People/EditPerson.tsx` — edit dialog.
- Create: `frontend/src/components/Subjects/People/DeletePerson.tsx` — delete confirmation dialog.
- Create: `frontend/src/components/Subjects/People/PersonActionsMenu.tsx` — row actions menu.
- Create: `frontend/src/components/Subjects/People/columns.tsx` — people table columns.
- Create: `frontend/src/components/Subjects/Organizations/AddOrganization.tsx` — create dialog.
- Create: `frontend/src/components/Subjects/Organizations/EditOrganization.tsx` — edit dialog.
- Create: `frontend/src/components/Subjects/Organizations/DeleteOrganization.tsx` — delete confirmation dialog.
- Create: `frontend/src/components/Subjects/Organizations/OrganizationActionsMenu.tsx` — row actions menu.
- Create: `frontend/src/components/Subjects/Organizations/columns.tsx` — organization table columns.
- Create: `frontend/src/components/Pending/PendingSubjects.tsx` — loading skeleton matching project patterns.
- Modify: `frontend/src/routeTree.gen.ts` — regenerated file after route creation.
- Modify: `frontend/src/client/index.ts` — generated client barrel export updates after backend schema changes.
- Modify: `frontend/src/client/sdk.gen.ts` — generated services for people and organizations.
- Modify: `frontend/src/client/types.gen.ts` — generated public/create/update types and enums.
- Modify: `frontend/src/client/schemas.gen.ts` — generated schema metadata for the new endpoints.
- Create: `frontend/tests/subjects.spec.ts` — subject workspace and CRUD E2E coverage.

## Task 1: Add people backend tests and implementation

**Files:**
- Create: `backend/tests/utils/person.py`
- Create: `backend/tests/api/routes/test_people.py`
- Modify: `backend/app/models.py`
- Create: `backend/app/api/routes/people.py`

- [ ] **Step 1: Write the failing test helper**

```python
# backend/tests/utils/person.py
from sqlmodel import Session

from app.models import Person, PersonType


def create_random_person(db: Session) -> Person:
    person = Person(
        person_type=PersonType.internal_member,
        name="Alice Analyst",
        alias="AA",
        notes="Initial test person",
    )
    db.add(person)
    db.commit()
    db.refresh(person)
    return person
```

- [ ] **Step 2: Write the failing route tests**

```python
# backend/tests/api/routes/test_people.py
import uuid

from fastapi.testclient import TestClient
from sqlmodel import Session

from app.core.config import settings
from tests.utils.person import create_random_person


def test_create_person(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    response = client.post(
        f"{settings.API_V1_STR}/people/",
        headers=superuser_token_headers,
        json={
            "person_type": "internal_member",
            "name": "Grace Hopper",
            "alias": "Grace",
            "notes": "Core stakeholder",
        },
    )
    assert response.status_code == 200
    content = response.json()
    assert content["person_type"] == "internal_member"
    assert content["name"] == "Grace Hopper"


def test_read_people(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    create_random_person(db)
    response = client.get(
        f"{settings.API_V1_STR}/people/",
        headers=superuser_token_headers,
    )
    assert response.status_code == 200
    assert response.json()["count"] >= 1


def test_read_person_not_found(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    response = client.get(
        f"{settings.API_V1_STR}/people/{uuid.uuid4()}",
        headers=superuser_token_headers,
    )
    assert response.status_code == 404
    assert response.json()["detail"] == "Person not found"


def test_people_routes_require_superuser(
    client: TestClient, normal_user_token_headers: dict[str, str]
) -> None:
    response = client.get(
        f"{settings.API_V1_STR}/people/",
        headers=normal_user_token_headers,
    )
    assert response.status_code == 403
    assert response.json()["detail"] == "The user doesn't have enough privileges"
```

- [ ] **Step 3: Run the people tests to verify they fail**

Run:

```bash
cd backend && uv run pytest tests/api/routes/test_people.py -v
```

Expected: FAIL with import errors because `Person`, `PersonType`, and `/people` routes do not exist yet.

- [ ] **Step 4: Add the people models**

```python
# backend/app/models.py
import enum


class PersonType(str, enum.Enum):
    internal_member = "internal_member"
    client_contact = "client_contact"
    external_advisor = "external_advisor"
    other = "other"


class PersonBase(SQLModel):
    person_type: PersonType
    name: str = Field(min_length=1, max_length=255)
    alias: str | None = Field(default=None, max_length=255)
    notes: str | None = Field(default=None, max_length=1000)


class PersonCreate(PersonBase):
    pass


class PersonUpdate(SQLModel):
    person_type: PersonType | None = None
    name: str | None = Field(default=None, min_length=1, max_length=255)  # type: ignore[assignment]
    alias: str | None = Field(default=None, max_length=255)
    notes: str | None = Field(default=None, max_length=1000)


class Person(PersonBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime = Field(default_factory=get_datetime_utc, sa_type=DateTime(timezone=True))  # type: ignore
    updated_at: datetime = Field(default_factory=get_datetime_utc, sa_type=DateTime(timezone=True))  # type: ignore


class PersonPublic(PersonBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime


class PeoplePublic(SQLModel):
    data: list[PersonPublic]
    count: int
```

- [ ] **Step 5: Add the people router**

```python
# backend/app/api/routes/people.py
import uuid
from typing import Any

from fastapi import APIRouter, HTTPException
from sqlmodel import col, func, select

from app.api.deps import CurrentUser, SessionDep
from app.models import Message, PeoplePublic, Person, PersonCreate, PersonPublic, PersonUpdate

router = APIRouter(prefix="/people", tags=["people"])


def require_superuser(current_user: CurrentUser) -> None:
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="The user doesn't have enough privileges")


@router.get("/", response_model=PeoplePublic)
def read_people(
    session: SessionDep, current_user: CurrentUser, skip: int = 0, limit: int = 100
) -> Any:
    require_superuser(current_user)
    count = session.exec(select(func.count()).select_from(Person)).one()
    people = session.exec(
        select(Person).order_by(col(Person.created_at).desc()).offset(skip).limit(limit)
    ).all()
    return PeoplePublic(data=[PersonPublic.model_validate(person) for person in people], count=count)


@router.get("/{person_id}", response_model=PersonPublic)
def read_person(
    session: SessionDep, current_user: CurrentUser, person_id: uuid.UUID
) -> Person:
    require_superuser(current_user)
    person = session.get(Person, person_id)
    if not person:
        raise HTTPException(status_code=404, detail="Person not found")
    return person


@router.post("/", response_model=PersonPublic)
def create_person(
    *, session: SessionDep, current_user: CurrentUser, person_in: PersonCreate
) -> Person:
    require_superuser(current_user)
    person = Person.model_validate(person_in)
    session.add(person)
    session.commit()
    session.refresh(person)
    return person


@router.patch("/{person_id}", response_model=PersonPublic)
def update_person(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    person_id: uuid.UUID,
    person_in: PersonUpdate,
) -> Person:
    require_superuser(current_user)
    person = session.get(Person, person_id)
    if not person:
        raise HTTPException(status_code=404, detail="Person not found")
    person.sqlmodel_update(person_in.model_dump(exclude_unset=True))
    person.updated_at = get_datetime_utc()
    session.add(person)
    session.commit()
    session.refresh(person)
    return person


@router.delete("/{person_id}")
def delete_person(
    session: SessionDep, current_user: CurrentUser, person_id: uuid.UUID
) -> Message:
    require_superuser(current_user)
    person = session.get(Person, person_id)
    if not person:
        raise HTTPException(status_code=404, detail="Person not found")
    session.delete(person)
    session.commit()
    return Message(message="Person deleted successfully")
```

- [ ] **Step 6: Expand the tests for update and delete**

```python
# append to backend/tests/api/routes/test_people.py
def test_update_person(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    person = create_random_person(db)
    response = client.patch(
        f"{settings.API_V1_STR}/people/{person.id}",
        headers=superuser_token_headers,
        json={"alias": "Updated Alias", "notes": "Updated note"},
    )
    assert response.status_code == 200
    content = response.json()
    assert content["alias"] == "Updated Alias"
    assert content["notes"] == "Updated note"


def test_delete_person(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    person = create_random_person(db)
    response = client.delete(
        f"{settings.API_V1_STR}/people/{person.id}",
        headers=superuser_token_headers,
    )
    assert response.status_code == 200
    assert response.json()["message"] == "Person deleted successfully"
```

- [ ] **Step 7: Run the people tests to verify they pass**

Run:

```bash
cd backend && uv run pytest tests/api/routes/test_people.py -v
```

Expected: PASS for create/list/read/update/delete/permissions coverage.

- [ ] **Step 8: Commit the people backend slice**

```bash
git add backend/app/models.py backend/app/api/routes/people.py backend/tests/utils/person.py backend/tests/api/routes/test_people.py
git commit -m "feat: add people subject api"
```

## Task 2: Add organizations backend tests and implementation

**Files:**
- Create: `backend/tests/utils/organization.py`
- Create: `backend/tests/api/routes/test_organizations.py`
- Modify: `backend/app/models.py`
- Create: `backend/app/api/routes/organizations.py`

- [ ] **Step 1: Write the failing organization test helper**

```python
# backend/tests/utils/organization.py
from sqlmodel import Session

from app.models import Organization, OrganizationType


def create_random_organization(db: Session) -> Organization:
    organization = Organization(
        organization_type=OrganizationType.fund_or_investment_vehicle,
        name="DreamLabs Capital",
        alias="DLC",
        notes="Initial test organization",
    )
    db.add(organization)
    db.commit()
    db.refresh(organization)
    return organization
```

- [ ] **Step 2: Write the failing organization route tests**

```python
# backend/tests/api/routes/test_organizations.py
import uuid

from fastapi.testclient import TestClient
from sqlmodel import Session

from app.core.config import settings
from tests.utils.organization import create_random_organization


def test_create_organization(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    response = client.post(
        f"{settings.API_V1_STR}/organizations/",
        headers=superuser_token_headers,
        json={
            "organization_type": "broker_or_bank",
            "name": "Morgan Stanley",
            "alias": "MS",
            "notes": "Prime broker",
        },
    )
    assert response.status_code == 200
    content = response.json()
    assert content["organization_type"] == "broker_or_bank"
    assert content["name"] == "Morgan Stanley"


def test_read_organizations(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    create_random_organization(db)
    response = client.get(
        f"{settings.API_V1_STR}/organizations/",
        headers=superuser_token_headers,
    )
    assert response.status_code == 200
    assert response.json()["count"] >= 1


def test_read_organization_not_found(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    response = client.get(
        f"{settings.API_V1_STR}/organizations/{uuid.uuid4()}",
        headers=superuser_token_headers,
    )
    assert response.status_code == 404
    assert response.json()["detail"] == "Organization not found"


def test_organization_routes_require_superuser(
    client: TestClient, normal_user_token_headers: dict[str, str]
) -> None:
    response = client.get(
        f"{settings.API_V1_STR}/organizations/",
        headers=normal_user_token_headers,
    )
    assert response.status_code == 403
    assert response.json()["detail"] == "The user doesn't have enough privileges"
```

- [ ] **Step 3: Run the organization tests to verify they fail**

Run:

```bash
cd backend && uv run pytest tests/api/routes/test_organizations.py -v
```

Expected: FAIL because `Organization`, `OrganizationType`, and `/organizations` do not exist yet.

- [ ] **Step 4: Add the organization models**

```python
# backend/app/models.py
class OrganizationType(str, enum.Enum):
    fund_or_investment_vehicle = "fund_or_investment_vehicle"
    broker_or_bank = "broker_or_bank"
    service_provider = "service_provider"
    other = "other"


class OrganizationBase(SQLModel):
    organization_type: OrganizationType
    name: str = Field(min_length=1, max_length=255)
    alias: str | None = Field(default=None, max_length=255)
    notes: str | None = Field(default=None, max_length=1000)


class OrganizationCreate(OrganizationBase):
    pass


class OrganizationUpdate(SQLModel):
    organization_type: OrganizationType | None = None
    name: str | None = Field(default=None, min_length=1, max_length=255)  # type: ignore[assignment]
    alias: str | None = Field(default=None, max_length=255)
    notes: str | None = Field(default=None, max_length=1000)


class Organization(OrganizationBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime = Field(default_factory=get_datetime_utc, sa_type=DateTime(timezone=True))  # type: ignore
    updated_at: datetime = Field(default_factory=get_datetime_utc, sa_type=DateTime(timezone=True))  # type: ignore


class OrganizationPublic(OrganizationBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime


class OrganizationsPublic(SQLModel):
    data: list[OrganizationPublic]
    count: int
```

- [ ] **Step 5: Add the organization router**

```python
# backend/app/api/routes/organizations.py
import uuid
from typing import Any

from fastapi import APIRouter, HTTPException
from sqlmodel import col, func, select

from app.api.deps import CurrentUser, SessionDep
from app.models import Message, Organization, OrganizationCreate, OrganizationPublic, OrganizationsPublic, OrganizationUpdate

router = APIRouter(prefix="/organizations", tags=["organizations"])


def require_superuser(current_user: CurrentUser) -> None:
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="The user doesn't have enough privileges")


@router.get("/", response_model=OrganizationsPublic)
def read_organizations(
    session: SessionDep, current_user: CurrentUser, skip: int = 0, limit: int = 100
) -> Any:
    require_superuser(current_user)
    count = session.exec(select(func.count()).select_from(Organization)).one()
    organizations = session.exec(
        select(Organization).order_by(col(Organization.created_at).desc()).offset(skip).limit(limit)
    ).all()
    return OrganizationsPublic(
        data=[OrganizationPublic.model_validate(organization) for organization in organizations],
        count=count,
    )


@router.get("/{organization_id}", response_model=OrganizationPublic)
def read_organization(
    session: SessionDep, current_user: CurrentUser, organization_id: uuid.UUID
) -> Organization:
    require_superuser(current_user)
    organization = session.get(Organization, organization_id)
    if not organization:
        raise HTTPException(status_code=404, detail="Organization not found")
    return organization


@router.post("/", response_model=OrganizationPublic)
def create_organization(
    *, session: SessionDep, current_user: CurrentUser, organization_in: OrganizationCreate
) -> Organization:
    require_superuser(current_user)
    organization = Organization.model_validate(organization_in)
    session.add(organization)
    session.commit()
    session.refresh(organization)
    return organization


@router.patch("/{organization_id}", response_model=OrganizationPublic)
def update_organization(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    organization_id: uuid.UUID,
    organization_in: OrganizationUpdate,
) -> Organization:
    require_superuser(current_user)
    organization = session.get(Organization, organization_id)
    if not organization:
        raise HTTPException(status_code=404, detail="Organization not found")
    organization.sqlmodel_update(organization_in.model_dump(exclude_unset=True))
    organization.updated_at = get_datetime_utc()
    session.add(organization)
    session.commit()
    session.refresh(organization)
    return organization


@router.delete("/{organization_id}")
def delete_organization(
    session: SessionDep, current_user: CurrentUser, organization_id: uuid.UUID
) -> Message:
    require_superuser(current_user)
    organization = session.get(Organization, organization_id)
    if not organization:
        raise HTTPException(status_code=404, detail="Organization not found")
    session.delete(organization)
    session.commit()
    return Message(message="Organization deleted successfully")
```

- [ ] **Step 6: Expand the organization tests for update and delete**

```python
# append to backend/tests/api/routes/test_organizations.py
def test_update_organization(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    organization = create_random_organization(db)
    response = client.patch(
        f"{settings.API_V1_STR}/organizations/{organization.id}",
        headers=superuser_token_headers,
        json={"alias": "Updated Org", "notes": "Updated org notes"},
    )
    assert response.status_code == 200
    content = response.json()
    assert content["alias"] == "Updated Org"
    assert content["notes"] == "Updated org notes"


def test_delete_organization(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    organization = create_random_organization(db)
    response = client.delete(
        f"{settings.API_V1_STR}/organizations/{organization.id}",
        headers=superuser_token_headers,
    )
    assert response.status_code == 200
    assert response.json()["message"] == "Organization deleted successfully"
```

- [ ] **Step 7: Run the organization tests to verify they pass**

Run:

```bash
cd backend && uv run pytest tests/api/routes/test_organizations.py -v
```

Expected: PASS for create/list/read/update/delete/permissions coverage.

- [ ] **Step 8: Commit the organization backend slice**

```bash
git add backend/app/models.py backend/app/api/routes/organizations.py backend/tests/utils/organization.py backend/tests/api/routes/test_organizations.py
git commit -m "feat: add organization subject api"
```

## Task 3: Wire routers, test cleanup, migration, and generated client

**Files:**
- Modify: `backend/app/api/main.py`
- Modify: `backend/tests/conftest.py`
- Create: `backend/app/alembic/versions/20260413_subjects_add_subject_maintenance_tables.py`
- Modify: `frontend/src/client/**`

- [ ] **Step 1: Write a failing integration check for router registration**

```python
# append to backend/tests/api/routes/test_people.py
def test_people_route_is_registered(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    response = client.get(
        f"{settings.API_V1_STR}/people/",
        headers=superuser_token_headers,
    )
    assert response.status_code != 404
```

- [ ] **Step 2: Run the targeted tests to verify registration/cleanup gaps**

Run:

```bash
cd backend && uv run pytest tests/api/routes/test_people.py tests/api/routes/test_organizations.py -v
```

Expected: FAIL or behave inconsistently until routers are included and test cleanup handles the new tables.

- [ ] **Step 3: Register routers and clean new tables in fixtures**

```python
# backend/app/api/main.py
from app.api.routes import items, login, organizations, people, portfolio, private, users, utils

api_router.include_router(people.router)
api_router.include_router(organizations.router)
```

```python
# backend/tests/conftest.py
from app.models import (
    AuditEvent,
    Item,
    NormalizationConflict,
    NormalizedPosition,
    Organization,
    Person,
    RawPosition,
    User,
)

# cleanup section
statement = delete(Organization)
session.execute(statement)
statement = delete(Person)
session.execute(statement)
```

- [ ] **Step 4: Create the Alembic revision**

```python
# backend/app/alembic/versions/20260413_subjects_add_subject_maintenance_tables.py
def upgrade() -> None:
    op.create_table(
        "person",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("person_type", sa.String(length=64), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("alias", sa.String(length=255), nullable=True),
        sa.Column("notes", sa.String(length=1000), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "organization",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("organization_type", sa.String(length=64), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("alias", sa.String(length=255), nullable=True),
        sa.Column("notes", sa.String(length=1000), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("organization")
    op.drop_table("person")
```

- [ ] **Step 5: Regenerate the frontend client**

Run:

```bash
bash ./scripts/generate-client.sh
```

Expected: `frontend/src/client/sdk.gen.ts`, `types.gen.ts`, and related generated files include `PeopleService` and `OrganizationsService`.

- [ ] **Step 6: Run backend tests and inspect generated client types**

Run:

```bash
cd backend && uv run pytest tests/api/routes/test_people.py tests/api/routes/test_organizations.py -v
```

Expected: PASS with stable cleanup and registered routes.

Check generated client includes shapes like:

```ts
export class PeopleService {
  public static readPeople(...)
  public static createPerson(...)
  public static updatePerson(...)
  public static deletePerson(...)
}

export type PersonPublic = {
  id: string
  person_type: "internal_member" | "client_contact" | "external_advisor" | "other"
  name: string
  alias?: string | null
  notes?: string | null
}
```

- [ ] **Step 7: Commit the plumbing slice**

```bash
git add backend/app/api/main.py backend/tests/conftest.py backend/app/alembic/versions/20260413_subjects_add_subject_maintenance_tables.py frontend/src/client/index.ts frontend/src/client/sdk.gen.ts frontend/src/client/types.gen.ts frontend/src/client/schemas.gen.ts
git commit -m "feat: wire subject api and generated client"
```

## Task 4: Add the protected subject workspace route and navigation

**Files:**
- Modify: `frontend/src/components/Sidebar/AppSidebar.tsx`
- Create: `frontend/src/components/Pending/PendingSubjects.tsx`
- Create: `frontend/src/routes/_layout/subjects.tsx`
- Create: `frontend/tests/subjects.spec.ts`
- Modify: `frontend/src/routeTree.gen.ts`

- [ ] **Step 1: Write the failing access and shell tests**

```ts
// frontend/tests/subjects.spec.ts
import { expect, test } from "@playwright/test"
import { createUser } from "./utils/privateApi"
import { randomEmail, randomPassword } from "./utils/random"
import { logInUser } from "./utils/user"
import { firstSuperuser, firstSuperuserPassword } from "./config"

test("Superuser can open subjects page shell", async ({ page }) => {
  await logInUser(page, firstSuperuser, firstSuperuserPassword)
  await page.goto("/subjects")
  await expect(page.getByRole("heading", { name: "主体维护" })).toBeVisible()
  await expect(page.getByRole("tab", { name: "人员" })).toBeVisible()
  await expect(page.getByRole("tab", { name: "机构" })).toBeVisible()
})

test("Non-superuser cannot access subjects page", async ({ page }) => {
  const email = randomEmail()
  const password = randomPassword()
  await createUser({ email, password })
  await logInUser(page, email, password)
  await page.goto("/subjects")
  await expect(page.getByRole("heading", { name: "主体维护" })).not.toBeVisible()
  await expect(page).not.toHaveURL(/\/subjects/)
})
```

- [ ] **Step 2: Run the Playwright test to verify it fails**

Run:

```bash
cd frontend && bunx playwright test tests/subjects.spec.ts
```

Expected: FAIL because `/subjects` route and sidebar entry do not exist yet.

- [ ] **Step 3: Add the sidebar item and pending skeleton**

```tsx
// frontend/src/components/Sidebar/AppSidebar.tsx
import { Briefcase, Building2, ChartPie, Home, Users } from "lucide-react"

const items = currentUser?.is_superuser
  ? [
      ...baseItems,
      { icon: Building2, title: "主体维护", path: "/subjects" },
      { icon: Users, title: "Admin", path: "/admin" },
    ]
  : baseItems
```

```tsx
// frontend/src/components/Pending/PendingSubjects.tsx
import { Skeleton } from "@/components/ui/skeleton"

export default function PendingSubjects() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-10 w-full max-w-md" />
      <Skeleton className="h-72 w-full" />
    </div>
  )
}
```

- [ ] **Step 4: Add the protected route shell**

```tsx
// frontend/src/routes/_layout/subjects.tsx
import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, redirect } from "@tanstack/react-router"
import { Suspense, useState } from "react"

import { OrganizationsService, PeopleService, UsersService } from "@/client"
import PendingSubjects from "@/components/Pending/PendingSubjects"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

function getPeopleQueryOptions() {
  return {
    queryFn: () => PeopleService.readPeople({ skip: 0, limit: 100 }),
    queryKey: ["people"],
  }
}

function getOrganizationsQueryOptions() {
  return {
    queryFn: () => OrganizationsService.readOrganizations({ skip: 0, limit: 100 }),
    queryKey: ["organizations"],
  }
}

export const Route = createFileRoute("/_layout/subjects")({
  component: SubjectsPage,
  beforeLoad: async () => {
    const user = await UsersService.readUserMe()
    if (!user.is_superuser) {
      throw redirect({ to: "/" })
    }
  },
  head: () => ({
    meta: [{ title: "主体维护 - FastAPI Template" }],
  }),
})

function SubjectsContent() {
  useSuspenseQuery(getPeopleQueryOptions())
  useSuspenseQuery(getOrganizationsQueryOptions())
  const [tab, setTab] = useState("people")

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">主体维护</h1>
          <p className="text-muted-foreground">维护人员和机构主数据</p>
        </div>
      </div>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="people">人员</TabsTrigger>
          <TabsTrigger value="organizations">机构</TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  )
}

function SubjectsPage() {
  return (
    <Suspense fallback={<PendingSubjects />}>
      <SubjectsContent />
    </Suspense>
  )
}
```

- [ ] **Step 5: Regenerate the route tree and rerun the shell tests**

Run:

```bash
cd frontend && bun run build && bunx playwright test tests/subjects.spec.ts
```

Expected: route compiles, `routeTree.gen.ts` updates, and the shell/access tests pass.

- [ ] **Step 6: Commit the route shell slice**

```bash
git add frontend/src/components/Sidebar/AppSidebar.tsx frontend/src/components/Pending/PendingSubjects.tsx frontend/src/routes/_layout/subjects.tsx frontend/src/routeTree.gen.ts frontend/tests/subjects.spec.ts
git commit -m "feat: add subject maintenance workspace shell"
```

## Task 5: Implement people tab CRUD UI

**Files:**
- Create: `frontend/src/components/Subjects/People/columns.tsx`
- Create: `frontend/src/components/Subjects/People/AddPerson.tsx`
- Create: `frontend/src/components/Subjects/People/EditPerson.tsx`
- Create: `frontend/src/components/Subjects/People/DeletePerson.tsx`
- Create: `frontend/src/components/Subjects/People/PersonActionsMenu.tsx`
- Modify: `frontend/src/routes/_layout/subjects.tsx`
- Modify: `frontend/tests/subjects.spec.ts`

- [ ] **Step 1: Extend the E2E test with people CRUD expectations**

```ts
// append to frontend/tests/subjects.spec.ts
test("Superuser can create, edit, and delete a person", async ({ page }) => {
  await logInUser(page, firstSuperuser, firstSuperuserPassword)
  await page.goto("/subjects")

  await page.getByRole("button", { name: "新增人员" }).click()
  await page.getByLabel("类型").click()
  await page.getByRole("option", { name: "内部成员" }).click()
  await page.getByLabel("姓名").fill("张三")
  await page.getByLabel("别名").fill("老张")
  await page.getByLabel("备注").fill("投后对接")
  await page.getByRole("button", { name: "保存" }).click()

  await expect(page.getByText("人员创建成功")).toBeVisible()
  await expect(page.getByText("张三")).toBeVisible()

  const row = page.getByRole("row").filter({ hasText: "张三" })
  await row.getByRole("button").click()
  await page.getByRole("menuitem", { name: "编辑人员" }).click()
  await page.getByLabel("备注").fill("核心维护对象")
  await page.getByRole("button", { name: "保存" }).click()
  await expect(page.getByText("人员更新成功")).toBeVisible()

  await row.getByRole("button").click()
  await page.getByRole("menuitem", { name: "删除人员" }).click()
  await page.getByRole("button", { name: "删除" }).click()
  await expect(page.getByText("人员删除成功")).toBeVisible()
})
```

- [ ] **Step 2: Run the people UI test to verify it fails**

Run:

```bash
cd frontend && bunx playwright test tests/subjects.spec.ts --grep "person"
```

Expected: FAIL because the people table, dialogs, and action menu do not exist yet.

- [ ] **Step 3: Add people columns and row actions**

```tsx
// frontend/src/components/Subjects/People/columns.tsx
import type { ColumnDef } from "@tanstack/react-table"

import type { PersonPublic } from "@/client"
import { PersonActionsMenu } from "./PersonActionsMenu"

export const columns: ColumnDef<PersonPublic>[] = [
  { accessorKey: "person_type", header: "类型" },
  { accessorKey: "name", header: "姓名" },
  { accessorKey: "alias", header: "别名" },
  { accessorKey: "notes", header: "备注" },
  {
    id: "actions",
    header: () => <span className="sr-only">操作</span>,
    cell: ({ row }) => <PersonActionsMenu person={row.original} />,
  },
]
```

```tsx
// frontend/src/components/Subjects/People/PersonActionsMenu.tsx
import type { PersonPublic } from "@/client"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { MoreHorizontal } from "lucide-react"
import EditPerson from "./EditPerson"
import DeletePerson from "./DeletePerson"

export function PersonActionsMenu({ person }: { person: PersonPublic }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <EditPerson person={person} />
        <DeletePerson person={person} />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

- [ ] **Step 4: Add the create and edit dialogs**

```tsx
// shared shape used in AddPerson.tsx and EditPerson.tsx
const formSchema = z.object({
  person_type: z.enum([
    "internal_member",
    "client_contact",
    "external_advisor",
    "other",
  ]),
  name: z.string().min(1, { message: "姓名不能为空" }),
  alias: z.string().optional(),
  notes: z.string().optional(),
})

PeopleService.createPerson({ requestBody: data })
PeopleService.updatePerson({ personId: person.id, requestBody: data })
queryClient.invalidateQueries({ queryKey: ["people"] })
showSuccessToast("人员创建成功")
showSuccessToast("人员更新成功")
```

- [ ] **Step 5: Add the delete dialog**

```tsx
// frontend/src/components/Subjects/People/DeletePerson.tsx
PeopleService.deletePerson({ personId: person.id })
showSuccessToast("人员删除成功")
queryClient.invalidateQueries({ queryKey: ["people"] })
```

- [ ] **Step 6: Render the people tab in the route**

```tsx
// inside frontend/src/routes/_layout/subjects.tsx
import AddPerson from "@/components/Subjects/People/AddPerson"
import { columns as personColumns } from "@/components/Subjects/People/columns"
import { DataTable } from "@/components/Common/DataTable"

const { data: people } = useSuspenseQuery(getPeopleQueryOptions())

{tab === "people" ? (
  <>
    <div className="flex justify-end">
      <AddPerson />
    </div>
    <DataTable columns={personColumns} data={people.data} />
  </>
) : null}
```

- [ ] **Step 7: Run the people UI test to verify it passes**

Run:

```bash
cd frontend && bunx playwright test tests/subjects.spec.ts --grep "person"
```

Expected: PASS for create, edit, and delete person flow.

- [ ] **Step 8: Commit the people UI slice**

```bash
git add frontend/src/components/Subjects/People frontend/src/routes/_layout/subjects.tsx frontend/tests/subjects.spec.ts
git commit -m "feat: add people subject management ui"
```

## Task 6: Implement organizations tab CRUD UI

**Files:**
- Create: `frontend/src/components/Subjects/Organizations/columns.tsx`
- Create: `frontend/src/components/Subjects/Organizations/AddOrganization.tsx`
- Create: `frontend/src/components/Subjects/Organizations/EditOrganization.tsx`
- Create: `frontend/src/components/Subjects/Organizations/DeleteOrganization.tsx`
- Create: `frontend/src/components/Subjects/Organizations/OrganizationActionsMenu.tsx`
- Modify: `frontend/src/routes/_layout/subjects.tsx`
- Modify: `frontend/tests/subjects.spec.ts`

- [ ] **Step 1: Extend the E2E test with organization CRUD expectations**

```ts
// append to frontend/tests/subjects.spec.ts
test("Superuser can create, edit, and delete an organization", async ({ page }) => {
  await logInUser(page, firstSuperuser, firstSuperuserPassword)
  await page.goto("/subjects")
  await page.getByRole("tab", { name: "机构" }).click()

  await page.getByRole("button", { name: "新增机构" }).click()
  await page.getByLabel("类型").click()
  await page.getByRole("option", { name: "券商/银行" }).click()
  await page.getByLabel("机构名称").fill("高盛")
  await page.getByLabel("别名").fill("Goldman")
  await page.getByLabel("备注").fill("主要交易对手")
  await page.getByRole("button", { name: "保存" }).click()

  await expect(page.getByText("机构创建成功")).toBeVisible()
  await expect(page.getByText("高盛")).toBeVisible()

  const row = page.getByRole("row").filter({ hasText: "高盛" })
  await row.getByRole("button").click()
  await page.getByRole("menuitem", { name: "编辑机构" }).click()
  await page.getByLabel("备注").fill("更新后的机构备注")
  await page.getByRole("button", { name: "保存" }).click()
  await expect(page.getByText("机构更新成功")).toBeVisible()

  await row.getByRole("button").click()
  await page.getByRole("menuitem", { name: "删除机构" }).click()
  await page.getByRole("button", { name: "删除" }).click()
  await expect(page.getByText("机构删除成功")).toBeVisible()
})
```

- [ ] **Step 2: Run the organization UI test to verify it fails**

Run:

```bash
cd frontend && bunx playwright test tests/subjects.spec.ts --grep "organization"
```

Expected: FAIL because the organization tab content and dialogs do not exist yet.

- [ ] **Step 3: Add organization columns and row actions**

```tsx
// frontend/src/components/Subjects/Organizations/columns.tsx
import type { ColumnDef } from "@tanstack/react-table"

import type { OrganizationPublic } from "@/client"
import { OrganizationActionsMenu } from "./OrganizationActionsMenu"

export const columns: ColumnDef<OrganizationPublic>[] = [
  { accessorKey: "organization_type", header: "类型" },
  { accessorKey: "name", header: "机构名称" },
  { accessorKey: "alias", header: "别名" },
  { accessorKey: "notes", header: "备注" },
  {
    id: "actions",
    header: () => <span className="sr-only">操作</span>,
    cell: ({ row }) => <OrganizationActionsMenu organization={row.original} />,
  },
]
```

```tsx
// frontend/src/components/Subjects/Organizations/OrganizationActionsMenu.tsx
import type { OrganizationPublic } from "@/client"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal } from "lucide-react"
import DeleteOrganization from "./DeleteOrganization"
import EditOrganization from "./EditOrganization"

export function OrganizationActionsMenu({
  organization,
}: {
  organization: OrganizationPublic
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <EditOrganization organization={organization} />
        <DeleteOrganization organization={organization} />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

- [ ] **Step 4: Add the organization dialogs**

```tsx
// shared shape used in AddOrganization.tsx and EditOrganization.tsx
const formSchema = z.object({
  organization_type: z.enum([
    "fund_or_investment_vehicle",
    "broker_or_bank",
    "service_provider",
    "other",
  ]),
  name: z.string().min(1, { message: "机构名称不能为空" }),
  alias: z.string().optional(),
  notes: z.string().optional(),
})

OrganizationsService.createOrganization({ requestBody: data })
OrganizationsService.updateOrganization({
  organizationId: organization.id,
  requestBody: data,
})
showSuccessToast("机构创建成功")
showSuccessToast("机构更新成功")
queryClient.invalidateQueries({ queryKey: ["organizations"] })
```

- [ ] **Step 5: Add the organization delete dialog**

```tsx
// frontend/src/components/Subjects/Organizations/DeleteOrganization.tsx
OrganizationsService.deleteOrganization({ organizationId: organization.id })
showSuccessToast("机构删除成功")
queryClient.invalidateQueries({ queryKey: ["organizations"] })
```

- [ ] **Step 6: Render the organization tab in the route**

```tsx
// inside frontend/src/routes/_layout/subjects.tsx
import AddOrganization from "@/components/Subjects/Organizations/AddOrganization"
import { columns as organizationColumns } from "@/components/Subjects/Organizations/columns"

const { data: organizations } = useSuspenseQuery(getOrganizationsQueryOptions())

{tab === "organizations" ? (
  <>
    <div className="flex justify-end">
      <AddOrganization />
    </div>
    <DataTable columns={organizationColumns} data={organizations.data} />
  </>
) : null}
```

- [ ] **Step 7: Run the organization UI test to verify it passes**

Run:

```bash
cd frontend && bunx playwright test tests/subjects.spec.ts --grep "organization"
```

Expected: PASS for create, edit, and delete organization flow.

- [ ] **Step 8: Commit the organization UI slice**

```bash
git add frontend/src/components/Subjects/Organizations frontend/src/routes/_layout/subjects.tsx frontend/tests/subjects.spec.ts
git commit -m "feat: add organization subject management ui"
```

## Task 7: Add empty states, final regression, and release-ready cleanup

**Files:**
- Modify: `frontend/src/routes/_layout/subjects.tsx`
- Modify: `frontend/tests/subjects.spec.ts`

- [ ] **Step 1: Add failing empty-state tests**

```ts
// append to frontend/tests/subjects.spec.ts
test("Subjects page shows empty states when no data exists", async ({ page }) => {
  await logInUser(page, firstSuperuser, firstSuperuserPassword)
  await page.goto("/subjects")
  await expect(page.getByText("还没有人员记录")).toBeVisible()
  await page.getByRole("tab", { name: "机构" }).click()
  await expect(page.getByText("还没有机构记录")).toBeVisible()
})
```

- [ ] **Step 2: Run the empty-state test to verify it fails**

Run:

```bash
cd frontend && bunx playwright test tests/subjects.spec.ts --grep "empty states"
```

Expected: FAIL until the route renders tab-specific empty states instead of a blank table.

- [ ] **Step 3: Implement tab-specific empty states**

```tsx
// inside frontend/src/routes/_layout/subjects.tsx
{tab === "people" ? (
  people.data.length === 0 ? (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <h3 className="text-lg font-semibold">还没有人员记录</h3>
      <p className="text-muted-foreground">点击右上角新增第一条人员主数据</p>
    </div>
  ) : (
    <DataTable columns={personColumns} data={people.data} />
  )
) : null}

{tab === "organizations" ? (
  organizations.data.length === 0 ? (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <h3 className="text-lg font-semibold">还没有机构记录</h3>
      <p className="text-muted-foreground">点击右上角新增第一条机构主数据</p>
    </div>
  ) : (
    <DataTable columns={organizationColumns} data={organizations.data} />
  )
) : null}
```

- [ ] **Step 4: Run focused validation commands**

Run:

```bash
cd backend && uv run pytest tests/api/routes/test_people.py tests/api/routes/test_organizations.py -v
cd frontend && bun run lint && bun run build
cd frontend && bunx playwright test tests/subjects.spec.ts
```

Expected: backend tests PASS, frontend lint/build PASS, and the subject E2E suite PASS.

- [ ] **Step 5: Run repo-level smoke checks**

Run:

```bash
bun run lint
bun run test
```

Expected: root workspace lint and test commands succeed with the new subject maintenance coverage included in the frontend suite.

- [ ] **Step 6: Commit the final polish**

```bash
git add frontend/src/routes/_layout/subjects.tsx frontend/tests/subjects.spec.ts
git commit -m "test: cover subject maintenance empty states"
```
