import random

from sqlmodel import Session

from app.models import Person, PersonType
from tests.utils.utils import random_lower_string


def create_random_person(
    db: Session, person_type: PersonType | None = None
) -> Person:
    person = Person(
        person_type=person_type or random.choice(list(PersonType)),
        name=random_lower_string(),
        alias=random_lower_string(),
        notes=random_lower_string(),
    )
    db.add(person)
    db.commit()
    db.refresh(person)
    return person
