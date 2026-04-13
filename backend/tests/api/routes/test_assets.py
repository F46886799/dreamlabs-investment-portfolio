from fastapi.testclient import TestClient

from app.core.config import settings


def test_read_assets_requires_superuser(
    client: TestClient, normal_user_token_headers: dict[str, str]
) -> None:
    response = client.get(
        f"{settings.API_V1_STR}/assets",
        headers=normal_user_token_headers,
    )
    assert response.status_code == 403


def test_read_assets_returns_empty_collection_for_superuser(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    response = client.get(
        f"{settings.API_V1_STR}/assets",
        headers=superuser_token_headers,
    )
    assert response.status_code == 200
    assert response.json() == {"data": [], "count": 0}
