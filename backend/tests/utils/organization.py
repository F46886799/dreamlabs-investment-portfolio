import random

from sqlmodel import Session

from app.models import Organization, OrganizationType
from tests.utils.utils import random_lower_string


def create_random_organization(
    db: Session, organization_type: OrganizationType | None = None
) -> Organization:
    organization = Organization(
        organization_type=organization_type or random.choice(list(OrganizationType)),
        name=random_lower_string(),
        alias=random_lower_string(),
        notes=random_lower_string(),
    )
    db.add(organization)
    db.commit()
    db.refresh(organization)
    return organization
