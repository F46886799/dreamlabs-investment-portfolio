from fastapi.testclient import TestClient

from app.core.config import settings


def _create_account(
    client: TestClient,
    headers: dict[str, str],
    *,
    name: str,
    is_active: bool = True,
) -> dict[str, str]:
    response = client.post(
        f"{settings.API_V1_STR}/accounts",
        headers=headers,
        json={
            "name": name,
            "account_type": "bank",
            "institution_name": "China Merchants Bank",
            "account_mask": "****5566",
            "base_currency": "CNY",
            "notes": "现金归集",
            "is_active": is_active,
        },
    )

    assert response.status_code == 200
    return response.json()


def test_create_portfolio_under_account(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    account_id = _create_account(
        client,
        superuser_token_headers,
        name="招商银行现金账户",
    )["id"]

    portfolio_response = client.post(
        f"{settings.API_V1_STR}/portfolios",
        headers=superuser_token_headers,
        json={
            "name": "家庭现金组合",
            "account_id": account_id,
            "description": "银行活期与短债现金仓位",
            "is_active": True,
        },
    )

    assert portfolio_response.status_code == 200
    content = portfolio_response.json()
    assert content["name"] == "家庭现金组合"
    assert content["account_id"] == account_id


def test_create_portfolio_requires_owned_account(
    client: TestClient,
    superuser_token_headers: dict[str, str],
    normal_user_token_headers: dict[str, str],
) -> None:
    account_id = _create_account(
        client,
        normal_user_token_headers,
        name="普通用户现金账户",
    )["id"]

    portfolio_response = client.post(
        f"{settings.API_V1_STR}/portfolios",
        headers=superuser_token_headers,
        json={
            "name": "越权组合",
            "account_id": account_id,
            "description": "不应允许访问其他用户账户",
            "is_active": True,
        },
    )

    assert portfolio_response.status_code == 404
    assert portfolio_response.json()["detail"] == "Account not found"


def test_create_portfolio_rejects_inactive_account(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    account_id = _create_account(
        client,
        superuser_token_headers,
        name="停用现金账户",
        is_active=False,
    )["id"]

    portfolio_response = client.post(
        f"{settings.API_V1_STR}/portfolios",
        headers=superuser_token_headers,
        json={
            "name": "停用账户组合",
            "account_id": account_id,
            "description": "不应创建在停用账户下",
            "is_active": True,
        },
    )

    assert portfolio_response.status_code == 409
    assert (
        portfolio_response.json()["detail"]
        == "Cannot create portfolio under inactive account"
    )


def test_list_portfolios_filters_by_owner_and_active_state(
    client: TestClient,
    superuser_token_headers: dict[str, str],
    normal_user_token_headers: dict[str, str],
) -> None:
    active_account_id = _create_account(
        client,
        superuser_token_headers,
        name="主账户",
    )["id"]
    inactive_account_id = _create_account(
        client,
        superuser_token_headers,
        name="停用账户",
    )["id"]
    other_user_account_id = _create_account(
        client,
        normal_user_token_headers,
        name="其他用户账户",
    )["id"]

    for headers, payload in (
        (
            superuser_token_headers,
            {
                "name": "活跃组合",
                "account_id": active_account_id,
                "description": "默认展示",
                "is_active": True,
            },
        ),
        (
            superuser_token_headers,
            {
                "name": "停用组合",
                "account_id": inactive_account_id,
                "description": "仅在 include_inactive=true 时展示",
                "is_active": False,
            },
        ),
        (
            normal_user_token_headers,
            {
                "name": "其他用户组合",
                "account_id": other_user_account_id,
                "description": "不应跨用户展示",
                "is_active": True,
            },
        ),
    ):
        response = client.post(
            f"{settings.API_V1_STR}/portfolios",
            headers=headers,
            json=payload,
        )
        assert response.status_code == 200

    list_response = client.get(
        f"{settings.API_V1_STR}/portfolios",
        headers=superuser_token_headers,
    )

    assert list_response.status_code == 200
    listed = list_response.json()
    listed_names = {portfolio["name"] for portfolio in listed["data"]}
    assert "活跃组合" in listed_names
    assert "停用组合" not in listed_names
    assert "其他用户组合" not in listed_names

    include_inactive_response = client.get(
        f"{settings.API_V1_STR}/portfolios?include_inactive=true",
        headers=superuser_token_headers,
    )

    assert include_inactive_response.status_code == 200
    listed_with_inactive = include_inactive_response.json()
    listed_with_inactive_names = {
        portfolio["name"] for portfolio in listed_with_inactive["data"]
    }
    assert "活跃组合" in listed_with_inactive_names
    assert "停用组合" in listed_with_inactive_names
    assert "其他用户组合" not in listed_with_inactive_names
