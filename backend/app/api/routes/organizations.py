import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import col, func, select

from app.api.deps import SessionDep, get_current_active_superuser
from app.models import (
    Message,
    Organization,
    OrganizationCreate,
    OrganizationPublic,
    OrganizationsPublic,
    OrganizationUpdate,
    get_datetime_utc,
)

router = APIRouter(
    prefix="/organizations",
    tags=["organizations"],
    dependencies=[Depends(get_current_active_superuser)],
)


@router.get("/", response_model=OrganizationsPublic)
def read_organizations(session: SessionDep, skip: int = 0, limit: int = 100) -> Any:
    count_statement = select(func.count()).select_from(Organization)
    count = session.exec(count_statement).one()
    statement = (
        select(Organization)
        .order_by(col(Organization.created_at).desc())
        .offset(skip)
        .limit(limit)
    )
    organizations = session.exec(statement).all()
    return OrganizationsPublic(
        data=[
            OrganizationPublic.model_validate(organization)
            for organization in organizations
        ],
        count=count,
    )


@router.get("/{organization_id}", response_model=OrganizationPublic)
def read_organization(session: SessionDep, organization_id: uuid.UUID) -> Any:
    organization = session.get(Organization, organization_id)
    if not organization:
        raise HTTPException(status_code=404, detail="Organization not found")
    return organization


@router.post("/", response_model=OrganizationPublic)
def create_organization(
    *, session: SessionDep, organization_in: OrganizationCreate
) -> Any:
    organization = Organization.model_validate(organization_in)
    session.add(organization)
    session.commit()
    session.refresh(organization)
    return organization


@router.patch("/{organization_id}", response_model=OrganizationPublic)
def update_organization(
    *,
    session: SessionDep,
    organization_id: uuid.UUID,
    organization_in: OrganizationUpdate,
) -> Any:
    organization = session.get(Organization, organization_id)
    if not organization:
        raise HTTPException(status_code=404, detail="Organization not found")
    update_dict = organization_in.model_dump(exclude_unset=True)
    organization.sqlmodel_update(update_dict)
    organization.updated_at = get_datetime_utc()
    session.add(organization)
    session.commit()
    session.refresh(organization)
    return organization


@router.delete("/{organization_id}")
def delete_organization(
    session: SessionDep, organization_id: uuid.UUID
) -> Message:
    organization = session.get(Organization, organization_id)
    if not organization:
        raise HTTPException(status_code=404, detail="Organization not found")
    session.delete(organization)
    session.commit()
    return Message(message="Organization deleted successfully")
