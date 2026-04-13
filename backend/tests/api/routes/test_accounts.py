from fastapi.testclient import TestClient

from app.core.config import settings


def test_create_and_list_accounts(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    payload = {
        "name": "盈透证券主账户",
        "account_type": "brokerage",
        "institution_name": "Interactive Brokers",
        "account_mask": "****1234",
        "base_currency": "USD",
        "notes": "主要美股账户",
        "is_active": True,
    }

    create_response = client.post(
        f"{settings.API_V1_STR}/accounts",
        headers=superuser_token_headers,
        json=payload,
    )

    assert create_response.status_code == 200
    created = create_response.json()
    assert created["name"] == payload["name"]
    assert created["account_type"] == payload["account_type"]

    list_response = client.get(
        f"{settings.API_V1_STR}/accounts",
        headers=superuser_token_headers,
    )

    assert list_response.status_code == 200
    listed = list_response.json()
    assert listed["count"] == 1
    assert listed["data"][0]["institution_name"] == "Interactive Brokers"


def test_list_accounts_filters_by_owner_and_active_state(
    client: TestClient,
    superuser_token_headers: dict[str, str],
    normal_user_token_headers: dict[str, str],
) -> None:
    active_payload = {
        "name": "Superuser Active Account",
        "account_type": "brokerage",
        "institution_name": "Active Broker",
        "base_currency": "USD",
        "is_active": True,
    }
    inactive_payload = {
        "name": "Superuser Inactive Account",
        "account_type": "bank",
        "institution_name": "Inactive Bank",
        "base_currency": "USD",
        "is_active": False,
    }
    other_user_payload = {
        "name": "Other User Account",
        "account_type": "brokerage",
        "institution_name": "Other Broker",
        "base_currency": "USD",
        "is_active": True,
    }

    for headers, payload in (
        (superuser_token_headers, active_payload),
        (superuser_token_headers, inactive_payload),
        (normal_user_token_headers, other_user_payload),
    ):
        response = client.post(
            f"{settings.API_V1_STR}/accounts",
            headers=headers,
            json=payload,
        )
        assert response.status_code == 200

    list_response = client.get(
        f"{settings.API_V1_STR}/accounts",
        headers=superuser_token_headers,
    )

    assert list_response.status_code == 200
    listed = list_response.json()
    listed_names = {account["name"] for account in listed["data"]}
    assert active_payload["name"] in listed_names
    assert inactive_payload["name"] not in listed_names
    assert other_user_payload["name"] not in listed_names

    include_inactive_response = client.get(
        f"{settings.API_V1_STR}/accounts?include_inactive=true",
        headers=superuser_token_headers,
    )

    assert include_inactive_response.status_code == 200
    listed_with_inactive = include_inactive_response.json()
    listed_with_inactive_names = {
        account["name"] for account in listed_with_inactive["data"]
    }
    assert active_payload["name"] in listed_with_inactive_names
    assert inactive_payload["name"] in listed_with_inactive_names
    assert other_user_payload["name"] not in listed_with_inactive_names
