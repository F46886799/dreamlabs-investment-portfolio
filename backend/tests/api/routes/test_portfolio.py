from fastapi.testclient import TestClient

from app.core.config import settings


def test_sync_demo_connector(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    response = client.post(
        f"{settings.API_V1_STR}/connectors/demo-broker/sync",
        headers=superuser_token_headers,
    )
    assert response.status_code == 200
    content = response.json()
    assert content["source"] == "demo-broker"
    assert content["status"] == "ok"
    assert content["synced_records"] == 3
    assert content["normalized_records"] == 2
    assert content["conflict_records"] == 1


def test_get_unified_portfolio(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    response = client.get(
        f"{settings.API_V1_STR}/portfolio/unified",
        headers=superuser_token_headers,
    )
    assert response.status_code == 200
    content = response.json()
    assert "snapshot_version" in content
    assert "stale" in content
    assert isinstance(content["data"], list)


def test_get_health_report(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    response = client.get(
        f"{settings.API_V1_STR}/portfolio/health-report",
        headers=superuser_token_headers,
    )
    assert response.status_code == 200
    content = response.json()
    assert "week" in content
    assert "positions_count" in content
    assert "anomaly_count" in content


def test_get_audit_events(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    response = client.get(
        f"{settings.API_V1_STR}/audit/events",
        headers=superuser_token_headers,
    )
    assert response.status_code == 200
    content = response.json()
    assert "data" in content
    assert "count" in content
