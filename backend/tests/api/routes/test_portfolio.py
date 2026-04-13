import time
from uuid import UUID

from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.core.config import settings
from app.models import NormalizedPosition, RawPosition


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


def test_get_unified_portfolio_filtered_by_account(
    client: TestClient,
    db: Session,
    superuser_token_headers: dict[str, str],
) -> None:
    primary = client.post(
        f"{settings.API_V1_STR}/accounts",
        headers=superuser_token_headers,
        json={
            "name": "主券商账户",
            "account_type": "brokerage",
            "institution_name": "IBKR",
            "account_mask": "****1111",
            "base_currency": "USD",
            "notes": "主账户",
            "is_active": True,
        },
    ).json()
    secondary = client.post(
        f"{settings.API_V1_STR}/accounts",
        headers=superuser_token_headers,
        json={
            "name": "备用券商账户",
            "account_type": "brokerage",
            "institution_name": "Futu",
            "account_mask": "****2222",
            "base_currency": "USD",
            "notes": "备用账户",
            "is_active": True,
        },
    ).json()

    primary_sync = client.post(
        f"{settings.API_V1_STR}/connectors/demo-broker/sync",
        headers=superuser_token_headers,
        params={"account_id": primary["id"]},
    ).json()
    primary_raw_position = db.exec(
        select(RawPosition).where(RawPosition.account_id == UUID(primary["id"]))
    ).first()
    assert primary_raw_position is not None
    extra_primary_raw_position = RawPosition(
        source="demo-broker",
        external_id="pos-primary-extra",
        symbol="TSLA",
        asset_type="stock",
        quantity=5.0,
        market_value=875.0,
        currency="USD",
        owner_id=primary_raw_position.owner_id,
        account_id=primary_raw_position.account_id,
    )
    db.add(extra_primary_raw_position)
    db.flush()
    db.add(
        NormalizedPosition(
            raw_position_id=extra_primary_raw_position.id,
            owner_id=primary_raw_position.owner_id,
            symbol="TSLA",
            asset_class="equity",
            quantity=5.0,
            market_value_usd=875.0,
            snapshot_version=primary_sync["snapshot_version"],
        )
    )
    db.commit()
    time.sleep(1)
    client.post(
        f"{settings.API_V1_STR}/connectors/demo-broker/sync",
        headers=superuser_token_headers,
        params={"account_id": secondary["id"]},
    )

    response = client.get(
        f"{settings.API_V1_STR}/portfolio/unified",
        headers=superuser_token_headers,
        params={"account_id": primary["id"]},
    )

    assert response.status_code == 200
    assert response.json()["snapshot_version"] == primary_sync["snapshot_version"]
    assert len(response.json()["data"]) == 3
    assert {position["symbol"] for position in response.json()["data"]} == {
        "AAPL",
        "BTC",
        "TSLA",
    }


def test_get_unified_portfolio_rejects_truly_conflicting_filters(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    account = _create_account(client, superuser_token_headers, name="冲突主账户")
    other_account = _create_account(client, superuser_token_headers, name="冲突副账户")
    portfolio = client.post(
        f"{settings.API_V1_STR}/portfolios",
        headers=superuser_token_headers,
        json={
            "name": "冲突组合",
            "account_id": account["id"],
            "description": "组合归属冲突",
            "is_active": True,
        },
    ).json()

    response = client.get(
        f"{settings.API_V1_STR}/portfolio/unified",
        headers=superuser_token_headers,
        params={
            "account_id": other_account["id"],
            "portfolio_id": portfolio["id"],
        },
    )

    assert response.status_code == 409
    assert response.json()["detail"] == "portfolio_id does not belong to account_id"


def test_get_unified_portfolio_requires_owned_account(
    client: TestClient,
    normal_user_token_headers: dict[str, str],
    superuser_token_headers: dict[str, str],
) -> None:
    account = _create_account(client, normal_user_token_headers, name="他人聚合账户")

    response = client.get(
        f"{settings.API_V1_STR}/portfolio/unified",
        headers=superuser_token_headers,
        params={"account_id": account["id"]},
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Account not found"


def test_get_unified_portfolio_filtered_by_portfolio(
    client: TestClient,
    db: Session,
    superuser_token_headers: dict[str, str],
) -> None:
    account = _create_account(client, superuser_token_headers, name="组合聚合账户")
    other_account = _create_account(client, superuser_token_headers, name="其他聚合账户")
    portfolio = client.post(
        f"{settings.API_V1_STR}/portfolios",
        headers=superuser_token_headers,
        json={
            "name": "核心组合",
            "account_id": account["id"],
            "description": "核心持仓",
            "is_active": True,
        },
    ).json()

    account_sync = client.post(
        f"{settings.API_V1_STR}/connectors/demo-broker/sync",
        headers=superuser_token_headers,
        params={"account_id": account["id"]},
    ).json()
    account_raw_position = db.exec(
        select(RawPosition).where(RawPosition.account_id == UUID(account["id"]))
    ).first()
    assert account_raw_position is not None
    extra_account_raw_position = RawPosition(
        source="demo-broker",
        external_id="pos-portfolio-extra",
        symbol="TSLA",
        asset_type="stock",
        quantity=3.0,
        market_value=525.0,
        currency="USD",
        owner_id=account_raw_position.owner_id,
        account_id=account_raw_position.account_id,
    )
    db.add(extra_account_raw_position)
    db.flush()
    db.add(
        NormalizedPosition(
            raw_position_id=extra_account_raw_position.id,
            owner_id=account_raw_position.owner_id,
            symbol="TSLA",
            asset_class="equity",
            quantity=3.0,
            market_value_usd=525.0,
            snapshot_version=account_sync["snapshot_version"],
        )
    )
    db.commit()
    time.sleep(1)
    client.post(
        f"{settings.API_V1_STR}/connectors/demo-broker/sync",
        headers=superuser_token_headers,
        params={"account_id": other_account["id"]},
    )

    response = client.get(
        f"{settings.API_V1_STR}/portfolio/unified",
        headers=superuser_token_headers,
        params={"portfolio_id": portfolio["id"]},
    )

    assert response.status_code == 200
    assert response.json()["snapshot_version"] == account_sync["snapshot_version"]
    assert {position["symbol"] for position in response.json()["data"]} == {
        "AAPL",
        "BTC",
        "TSLA",
    }


def test_get_unified_portfolio_accepts_consistent_filters(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    account = _create_account(client, superuser_token_headers, name="组合一致性账户")
    portfolio = client.post(
        f"{settings.API_V1_STR}/portfolios",
        headers=superuser_token_headers,
        json={
            "name": "一致性组合",
            "account_id": account["id"],
            "description": "组合范围一致",
            "is_active": True,
        },
    ).json()

    sync_response = client.post(
        f"{settings.API_V1_STR}/connectors/demo-broker/sync",
        headers=superuser_token_headers,
        params={"account_id": account["id"]},
    )
    assert sync_response.status_code == 200

    response = client.get(
        f"{settings.API_V1_STR}/portfolio/unified",
        headers=superuser_token_headers,
        params={
            "account_id": account["id"],
            "portfolio_id": portfolio["id"],
        },
    )

    assert response.status_code == 200
    assert response.json()["snapshot_version"] == sync_response.json()["snapshot_version"]
    assert {position["symbol"] for position in response.json()["data"]} == {
        "AAPL",
        "BTC",
    }


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


def test_get_health_report_filtered_by_account(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    primary_account = _create_account(
        client, superuser_token_headers, name="健康报告主账户"
    )
    secondary_account = _create_account(
        client, superuser_token_headers, name="健康报告次账户"
    )

    client.post(
        f"{settings.API_V1_STR}/connectors/demo-broker/sync",
        headers=superuser_token_headers,
        params={"account_id": primary_account["id"]},
    )
    client.post(
        f"{settings.API_V1_STR}/connectors/demo-broker/sync",
        headers=superuser_token_headers,
        params={"account_id": secondary_account["id"]},
    )

    response = client.get(
        f"{settings.API_V1_STR}/portfolio/health-report",
        headers=superuser_token_headers,
        params={"account_id": primary_account["id"]},
    )

    assert response.status_code == 200
    assert response.json()["positions_count"] == 2
    assert response.json()["anomaly_count"] == 1


def test_get_health_report_filtered_by_portfolio(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    account = _create_account(client, superuser_token_headers, name="组合健康主账户")
    other_account = _create_account(client, superuser_token_headers, name="组合健康次账户")
    portfolio = client.post(
        f"{settings.API_V1_STR}/portfolios",
        headers=superuser_token_headers,
        json={
            "name": "健康组合",
            "account_id": account["id"],
            "description": "组合健康检查",
            "is_active": True,
        },
    ).json()

    client.post(
        f"{settings.API_V1_STR}/connectors/demo-broker/sync",
        headers=superuser_token_headers,
        params={"account_id": account["id"]},
    )
    client.post(
        f"{settings.API_V1_STR}/connectors/demo-broker/sync",
        headers=superuser_token_headers,
        params={"account_id": other_account["id"]},
    )

    response = client.get(
        f"{settings.API_V1_STR}/portfolio/health-report",
        headers=superuser_token_headers,
        params={"portfolio_id": portfolio["id"]},
    )

    assert response.status_code == 200
    assert response.json()["positions_count"] == 2
    assert response.json()["anomaly_count"] == 1


def test_get_health_report_accepts_consistent_filters(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    account = _create_account(client, superuser_token_headers, name="健康一致性账户")
    portfolio = client.post(
        f"{settings.API_V1_STR}/portfolios",
        headers=superuser_token_headers,
        json={
            "name": "健康一致性组合",
            "account_id": account["id"],
            "description": "健康范围一致",
            "is_active": True,
        },
    ).json()

    client.post(
        f"{settings.API_V1_STR}/connectors/demo-broker/sync",
        headers=superuser_token_headers,
        params={"account_id": account["id"]},
    )

    response = client.get(
        f"{settings.API_V1_STR}/portfolio/health-report",
        headers=superuser_token_headers,
        params={
            "account_id": account["id"],
            "portfolio_id": portfolio["id"],
        },
    )

    assert response.status_code == 200
    assert response.json()["positions_count"] == 2
    assert response.json()["anomaly_count"] == 1


def test_get_health_report_rejects_truly_conflicting_filters(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    account = _create_account(client, superuser_token_headers, name="健康冲突主账户")
    other_account = _create_account(client, superuser_token_headers, name="健康冲突副账户")
    portfolio = client.post(
        f"{settings.API_V1_STR}/portfolios",
        headers=superuser_token_headers,
        json={
            "name": "健康冲突组合",
            "account_id": account["id"],
            "description": "健康归属冲突",
            "is_active": True,
        },
    ).json()

    response = client.get(
        f"{settings.API_V1_STR}/portfolio/health-report",
        headers=superuser_token_headers,
        params={
            "account_id": other_account["id"],
            "portfolio_id": portfolio["id"],
        },
    )

    assert response.status_code == 409
    assert response.json()["detail"] == "portfolio_id does not belong to account_id"


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
