import uuid
from datetime import timedelta

from fastapi.testclient import TestClient
from sqlmodel import Session, func, select

from app.core.config import settings
from app.models import Person, PersonType
from tests.utils.person import create_random_person


def test_create_person(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    data = {
        "person_type": PersonType.internal_member.value,
        "name": "Alice Example",
        "alias": "Alice",
        "notes": "Created in test",
    }
    response = client.post(
        f"{settings.API_V1_STR}/people/",
        headers=superuser_token_headers,
        json=data,
    )
    assert response.status_code == 200
    content = response.json()
    assert content["person_type"] == data["person_type"]
    assert content["name"] == data["name"]
    assert content["alias"] == data["alias"]
    assert content["notes"] == data["notes"]
    assert "id" in content
    assert "created_at" in content
    assert "updated_at" in content


def test_read_person(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    person = create_random_person(db)
    response = client.get(
        f"{settings.API_V1_STR}/people/{person.id}",
        headers=superuser_token_headers,
    )
    assert response.status_code == 200
    content = response.json()
    assert content["person_type"] == person.person_type
    assert content["name"] == person.name
    assert content["alias"] == person.alias
    assert content["notes"] == person.notes
    assert content["id"] == str(person.id)


def test_read_person_not_found(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    response = client.get(
        f"{settings.API_V1_STR}/people/{uuid.uuid4()}",
        headers=superuser_token_headers,
    )
    assert response.status_code == 404
    assert response.json()["detail"] == "Person not found"


def test_read_person_not_enough_permissions(
    client: TestClient, normal_user_token_headers: dict[str, str], db: Session
) -> None:
    person = create_random_person(db)
    response = client.get(
        f"{settings.API_V1_STR}/people/{person.id}",
        headers=normal_user_token_headers,
    )
    assert response.status_code == 403
    assert response.json()["detail"] == "The user doesn't have enough privileges"


def test_read_people(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    existing_count = db.exec(select(func.count()).select_from(Person)).one()
    first_person = create_random_person(db)
    first_person.created_at = first_person.created_at - timedelta(days=1)
    db.add(first_person)
    db.commit()
    db.refresh(first_person)
    second_person = create_random_person(db)

    response = client.get(
        f"{settings.API_V1_STR}/people/?skip=0&limit=1",
        headers=superuser_token_headers,
    )
    assert response.status_code == 200
    content = response.json()
    assert content["count"] == existing_count + 2
    assert len(content["data"]) == 1
    assert content["data"][0]["id"] == str(second_person.id)
    assert content["data"][0]["id"] != str(first_person.id)


def test_update_person(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    person = create_random_person(db)
    original_updated_at = person.updated_at
    data = {
        "person_type": PersonType.external_advisor.value,
        "name": "Updated Name",
        "alias": "Updated Alias",
        "notes": "Updated notes",
    }
    response = client.patch(
        f"{settings.API_V1_STR}/people/{person.id}",
        headers=superuser_token_headers,
        json=data,
    )
    assert response.status_code == 200
    content = response.json()
    assert content["person_type"] == data["person_type"]
    assert content["name"] == data["name"]
    assert content["alias"] == data["alias"]
    assert content["notes"] == data["notes"]
    assert content["id"] == str(person.id)
    assert content["updated_at"] != original_updated_at.isoformat()


def test_update_person_not_found(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    response = client.patch(
        f"{settings.API_V1_STR}/people/{uuid.uuid4()}",
        headers=superuser_token_headers,
        json={
            "name": "Updated Name",
        },
    )
    assert response.status_code == 404
    assert response.json()["detail"] == "Person not found"


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
    read_response = client.get(
        f"{settings.API_V1_STR}/people/{person.id}",
        headers=superuser_token_headers,
    )
    assert read_response.status_code == 404
    assert read_response.json()["detail"] == "Person not found"
