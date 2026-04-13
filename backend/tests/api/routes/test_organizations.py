import uuid
from datetime import timedelta

from fastapi.testclient import TestClient
from sqlmodel import Session

from app.core.config import settings
from app.models import OrganizationType
from tests.utils.organization import create_random_organization


def test_create_organization(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    data = {
        "organization_type": OrganizationType.service_provider.value,
        "name": "Acme Capital",
        "alias": "Acme",
        "notes": "Created in test",
    }
    response = client.post(
        f"{settings.API_V1_STR}/organizations/",
        headers=superuser_token_headers,
        json=data,
    )
    assert response.status_code == 200
    content = response.json()
    assert content["organization_type"] == data["organization_type"]
    assert content["name"] == data["name"]
    assert content["alias"] == data["alias"]
    assert content["notes"] == data["notes"]
    assert "id" in content
    assert "created_at" in content
    assert "updated_at" in content


def test_read_organization(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    organization = create_random_organization(db)
    response = client.get(
        f"{settings.API_V1_STR}/organizations/{organization.id}",
        headers=superuser_token_headers,
    )
    assert response.status_code == 200
    content = response.json()
    assert content["organization_type"] == organization.organization_type
    assert content["name"] == organization.name
    assert content["alias"] == organization.alias
    assert content["notes"] == organization.notes
    assert content["id"] == str(organization.id)


def test_read_organization_not_found(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    response = client.get(
        f"{settings.API_V1_STR}/organizations/{uuid.uuid4()}",
        headers=superuser_token_headers,
    )
    assert response.status_code == 404
    assert response.json()["detail"] == "Organization not found"


def test_read_organization_not_enough_permissions(
    client: TestClient, normal_user_token_headers: dict[str, str], db: Session
) -> None:
    organization = create_random_organization(db)
    response = client.get(
        f"{settings.API_V1_STR}/organizations/{organization.id}",
        headers=normal_user_token_headers,
    )
    assert response.status_code == 403
    assert response.json()["detail"] == "The user doesn't have enough privileges"


def test_read_organizations(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    first_organization = create_random_organization(db)
    first_organization.created_at = first_organization.created_at - timedelta(days=1)
    db.add(first_organization)
    db.commit()
    db.refresh(first_organization)
    second_organization = create_random_organization(db)

    response = client.get(
        f"{settings.API_V1_STR}/organizations/?skip=0&limit=1",
        headers=superuser_token_headers,
    )
    assert response.status_code == 200
    content = response.json()
    assert content["count"] >= 2
    assert len(content["data"]) == 1
    assert content["data"][0]["id"] == str(second_organization.id)
    assert content["data"][0]["id"] != str(first_organization.id)


def test_read_organizations_not_enough_permissions(
    client: TestClient, normal_user_token_headers: dict[str, str]
) -> None:
    response = client.get(
        f"{settings.API_V1_STR}/organizations/",
        headers=normal_user_token_headers,
    )
    assert response.status_code == 403
    assert response.json()["detail"] == "The user doesn't have enough privileges"


def test_update_organization(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    organization = create_random_organization(db)
    original_updated_at = organization.updated_at
    data = {
        "organization_type": OrganizationType.broker_or_bank.value,
        "name": "Updated Name",
        "alias": "Updated Alias",
        "notes": "Updated notes",
    }
    response = client.patch(
        f"{settings.API_V1_STR}/organizations/{organization.id}",
        headers=superuser_token_headers,
        json=data,
    )
    assert response.status_code == 200
    content = response.json()
    assert content["organization_type"] == data["organization_type"]
    assert content["name"] == data["name"]
    assert content["alias"] == data["alias"]
    assert content["notes"] == data["notes"]
    assert content["id"] == str(organization.id)
    assert content["updated_at"] != original_updated_at.isoformat()


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
