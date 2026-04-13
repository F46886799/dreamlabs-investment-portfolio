import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import col, func, select

from app.api.deps import SessionDep, get_current_active_superuser
from app.models import (
    Message,
    PeoplePublic,
    Person,
    PersonCreate,
    PersonPublic,
    PersonUpdate,
    get_datetime_utc,
)

router = APIRouter(
    prefix="/people",
    tags=["people"],
    dependencies=[Depends(get_current_active_superuser)],
)


@router.get("/", response_model=PeoplePublic)
def read_people(session: SessionDep, skip: int = 0, limit: int = 100) -> Any:
    count_statement = select(func.count()).select_from(Person)
    count = session.exec(count_statement).one()
    statement = (
        select(Person).order_by(col(Person.created_at).desc()).offset(skip).limit(limit)
    )
    people = session.exec(statement).all()
    return PeoplePublic(
        data=[PersonPublic.model_validate(person) for person in people],
        count=count,
    )


@router.get("/{person_id}", response_model=PersonPublic)
def read_person(session: SessionDep, person_id: uuid.UUID) -> Any:
    person = session.get(Person, person_id)
    if not person:
        raise HTTPException(status_code=404, detail="Person not found")
    return person


@router.post("/", response_model=PersonPublic)
def create_person(*, session: SessionDep, person_in: PersonCreate) -> Any:
    person = Person.model_validate(person_in)
    session.add(person)
    session.commit()
    session.refresh(person)
    return person


@router.patch("/{person_id}", response_model=PersonPublic)
def update_person(
    *, session: SessionDep, person_id: uuid.UUID, person_in: PersonUpdate
) -> Any:
    person = session.get(Person, person_id)
    if not person:
        raise HTTPException(status_code=404, detail="Person not found")
    update_dict = person_in.model_dump(exclude_unset=True)
    person.sqlmodel_update(update_dict)
    person.updated_at = get_datetime_utc()
    session.add(person)
    session.commit()
    session.refresh(person)
    return person


@router.delete("/{person_id}")
def delete_person(session: SessionDep, person_id: uuid.UUID) -> Message:
    person = session.get(Person, person_id)
    if not person:
        raise HTTPException(status_code=404, detail="Person not found")
    session.delete(person)
    session.commit()
    return Message(message="Person deleted successfully")
