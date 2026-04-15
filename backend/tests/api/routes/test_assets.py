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


def test_create_asset_requires_superuser(
    client: TestClient, normal_user_token_headers: dict[str, str]
) -> None:
    response = client.post(
        f"{settings.API_V1_STR}/assets",
        headers=normal_user_token_headers,
        json={
            "asset_type": "stock",
            "symbol": "SHOULDFAIL",
            "display_name": "Should Fail",
            "currency": "USD",
            "category_level_1": "equity",
            "status": "active",
            "sync_status": "manual",
            "is_active": True,
        },
    )
    assert response.status_code == 403


def test_update_asset_requires_superuser(
    client: TestClient,
    superuser_token_headers: dict[str, str],
    normal_user_token_headers: dict[str, str],
) -> None:
    created = client.post(
        f"{settings.API_V1_STR}/assets",
        headers=superuser_token_headers,
        json={
            "asset_type": "stock",
            "symbol": "T2AUTH1",
            "display_name": "Auth Test Asset",
            "currency": "USD",
            "category_level_1": "equity",
            "status": "active",
            "sync_status": "manual",
            "is_active": True,
        },
    )
    asset_id = created.json()["id"]
    response = client.patch(
        f"{settings.API_V1_STR}/assets/{asset_id}",
        headers=normal_user_token_headers,
        json={"is_active": False},
    )
    assert response.status_code == 403


def test_read_assets_returns_empty_collection_for_superuser(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    response = client.get(
        f"{settings.API_V1_STR}/assets",
        headers=superuser_token_headers,
        params={"query": "__no_such_asset_instrument__"},
    )
    assert response.status_code == 200
    assert response.json() == {"data": [], "count": 0}


def test_create_asset_for_superuser(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    response = client.post(
        f"{settings.API_V1_STR}/assets",
        headers=superuser_token_headers,
        json={
            "asset_type": "stock",
            "symbol": "T2MSFT",
            "display_name": "Microsoft Corp.",
            "canonical_name": "Microsoft Corp.",
            "exchange": "NASDAQ",
            "market": "US",
            "currency": "USD",
            "country": "US",
            "category_level_1": "equity",
            "category_level_2": "large_cap",
            "status": "active",
            "sync_status": "manual",
            "is_active": True,
        },
    )
    assert response.status_code == 200
    content = response.json()
    assert content["symbol"] == "T2MSFT"
    assert content["asset_type"] == "stock"
    assert content["sync_status"] == "manual"


def test_duplicate_asset_returns_conflict_with_normalization_and_null_safety(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    # Proves API-level behavior matches normalized + null-safe uniqueness semantics:
    # lower(symbol) and coalesce(lower(exchange/market), '')
    payload_1 = {
        "asset_type": "stock",
        "symbol": " dupnull1 ",
        "display_name": "Dup Null Safe 1",
        "exchange": None,
        "market": None,
        "currency": "USD",
        "country": "US",
        "category_level_1": "equity",
        "status": "active",
        "sync_status": "manual",
        "is_active": True,
    }
    payload_2 = {
        "asset_type": "stock",
        "symbol": "DUPNULL1",
        "display_name": "Dup Null Safe 1 (case variant)",
        "exchange": "",  # normalizes to None
        "market": " ",  # normalizes to None
        "currency": "USD",
        "country": "US",
        "category_level_1": "equity",
        "status": "active",
        "sync_status": "manual",
        "is_active": True,
    }

    first = client.post(
        f"{settings.API_V1_STR}/assets",
        headers=superuser_token_headers,
        json=payload_1,
    )
    second = client.post(
        f"{settings.API_V1_STR}/assets",
        headers=superuser_token_headers,
        json=payload_2,
    )
    assert first.status_code == 200
    assert second.status_code == 409


def test_patch_asset_rejects_invalid_asset_type(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    created = client.post(
        f"{settings.API_V1_STR}/assets",
        headers=superuser_token_headers,
        json={
            "asset_type": "etf",
            "symbol": "T2PATCH1",
            "display_name": "Patch Validation",
            "exchange": "NASDAQ",
            "market": "US",
            "currency": "USD",
            "country": "US",
            "category_level_1": "fund",
            "status": "active",
            "sync_status": "manual",
            "is_active": True,
        },
    )
    asset_id = created.json()["id"]

    response = client.patch(
        f"{settings.API_V1_STR}/assets/{asset_id}",
        headers=superuser_token_headers,
        json={"asset_type": "not-a-real-asset-type"},
    )
    assert response.status_code == 422


def test_patch_asset_can_deactivate(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    created = client.post(
        f"{settings.API_V1_STR}/assets",
        headers=superuser_token_headers,
        json={
            "asset_type": "etf",
            "symbol": "T2QQQ",
            "display_name": "Invesco QQQ",
            "exchange": "NASDAQ",
            "market": "US",
            "currency": "USD",
            "country": "US",
            "category_level_1": "fund",
            "status": "active",
            "sync_status": "manual",
            "is_active": True,
        },
    )
    asset_id = created.json()["id"]
    response = client.patch(
        f"{settings.API_V1_STR}/assets/{asset_id}",
        headers=superuser_token_headers,
        json={"is_active": False, "status": "inactive"},
    )
    assert response.status_code == 200
    assert response.json()["is_active"] is False
    assert response.json()["status"] == "inactive"


def test_read_single_asset_not_found(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    import uuid

    nonexistent_id = uuid.uuid4()
    response = client.get(
        f"{settings.API_V1_STR}/assets/{nonexistent_id}",
        headers=superuser_token_headers,
    )
    assert response.status_code == 404


def test_update_asset_not_found(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    import uuid

    nonexistent_id = uuid.uuid4()
    response = client.patch(
        f"{settings.API_V1_STR}/assets/{nonexistent_id}",
        headers=superuser_token_headers,
        json={"is_active": False},
    )
    assert response.status_code == 404


def test_patch_asset_duplicate_returns_conflict(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    # Create two distinct assets, then PATCH the second to collide with the first.
    asset_a = client.post(
        f"{settings.API_V1_STR}/assets",
        headers=superuser_token_headers,
        json={
            "asset_type": "stock",
            "symbol": "T2COLLA",
            "display_name": "Collision Asset A",
            "exchange": "NYSE",
            "market": "US",
            "currency": "USD",
            "category_level_1": "equity",
            "status": "active",
            "sync_status": "manual",
            "is_active": True,
        },
    )
    assert asset_a.status_code == 200

    asset_b = client.post(
        f"{settings.API_V1_STR}/assets",
        headers=superuser_token_headers,
        json={
            "asset_type": "stock",
            "symbol": "T2COLLB",
            "display_name": "Collision Asset B",
            "exchange": "NYSE",
            "market": "US",
            "currency": "USD",
            "category_level_1": "equity",
            "status": "active",
            "sync_status": "manual",
            "is_active": True,
        },
    )
    assert asset_b.status_code == 200
    asset_b_id = asset_b.json()["id"]

    # PATCH B to use A's symbol — must collide on (asset_type, lower(symbol), exchange, market)
    response = client.patch(
        f"{settings.API_V1_STR}/assets/{asset_b_id}",
        headers=superuser_token_headers,
        json={"symbol": "T2COLLA"},
    )
    assert response.status_code == 409


def test_create_asset_invalid_type_returns_422(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    response = client.post(
        f"{settings.API_V1_STR}/assets",
        headers=superuser_token_headers,
        json={
            "asset_type": "futures",
            "symbol": "T2INVALID",
            "display_name": "Invalid Type Asset",
            "currency": "USD",
            "category_level_1": "equity",
            "status": "active",
            "sync_status": "manual",
            "is_active": True,
        },
    )
    assert response.status_code == 422
