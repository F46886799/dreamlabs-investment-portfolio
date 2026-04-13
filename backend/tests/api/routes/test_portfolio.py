from uuid import UUID

from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.core.config import settings
from app.models import RawPosition


def _create_account(
    client: TestClient,
    headers: dict[str, str],
    *,
    name: str,
) -> dict[str, str]:
    response = client.post(
        f"{settings.API_V1_STR}/accounts",
        headers=headers,
        json={
            "name": name,
            "account_type": "brokerage",
            "institution_name": "Interactive Brokers",
            "account_mask": "****7788",
            "base_currency": "USD",
            "notes": "同步目标",
            "is_active": True,
        },
    )

    assert response.status_code == 200
    return response.json()


def test_sync_demo_connector(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    account_id = _create_account(
        client, superuser_token_headers, name="同步账户-基础用例"
    )["id"]
    response = client.post(
        f"{settings.API_V1_STR}/connectors/demo-broker/sync",
        headers=superuser_token_headers,
        params={"account_id": account_id},
    )
    assert response.status_code == 200
    content = response.json()
    assert content["source"] == "demo-broker"
    assert content["status"] == "ok"
    assert content["synced_records"] == 3
    assert content["normalized_records"] == 2
    assert content["conflict_records"] == 1


def test_sync_demo_connector_requires_account_id(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    response = client.post(
        f"{settings.API_V1_STR}/connectors/demo-broker/sync",
        headers=superuser_token_headers,
    )

    assert response.status_code == 422


def test_sync_demo_connector_persists_account_id(
    client: TestClient,
    db: Session,
    superuser_token_headers: dict[str, str],
) -> None:
    account_id = _create_account(client, superuser_token_headers, name="盈透同步账户")[
        "id"
    ]

    response = client.post(
        f"{settings.API_V1_STR}/connectors/demo-broker/sync",
        headers=superuser_token_headers,
        params={"account_id": account_id},
    )

    assert response.status_code == 200
    content = response.json()
    assert content["synced_records"] == 3

    raw_positions = db.exec(
        select(RawPosition).where(RawPosition.account_id == UUID(account_id))
    ).all()
    assert len(raw_positions) == 3
    assert {str(position.account_id) for position in raw_positions} == {account_id}


def test_sync_demo_connector_requires_owned_account(
    client: TestClient,
    superuser_token_headers: dict[str, str],
    normal_user_token_headers: dict[str, str],
) -> None:
    account_id = _create_account(client, normal_user_token_headers, name="其他用户同步账户")[
        "id"
    ]

    response = client.post(
        f"{settings.API_V1_STR}/connectors/demo-broker/sync",
        headers=superuser_token_headers,
        params={"account_id": account_id},
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Account not found"


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
