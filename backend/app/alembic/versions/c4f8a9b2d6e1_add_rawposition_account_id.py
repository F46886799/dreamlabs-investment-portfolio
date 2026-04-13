"""Add rawposition account id

Revision ID: c4f8a9b2d6e1
Revises: 8d4f2c3b1a00
Create Date: 2026-04-13 00:30:00.000000

"""

import uuid
from datetime import datetime, timezone

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = "c4f8a9b2d6e1"
down_revision = "8d4f2c3b1a00"
branch_labels = None
depends_on = None

AUTO_ACCOUNT_NAMESPACE = uuid.UUID("6d8bb0aa-3e5d-4d89-87de-f9bc5c16f7a2")
AUTO_ACCOUNT_NAME = "Imported synced positions"
AUTO_ACCOUNT_INSTITUTION = "Imported connector account"
AUTO_ACCOUNT_NOTES = (
    f"[migration:{revision}] "
    "Auto-generated during account migration for existing synced positions."
)


def _generated_account_id(owner_id: uuid.UUID) -> uuid.UUID:
    return uuid.uuid5(AUTO_ACCOUNT_NAMESPACE, f"{revision}:{owner_id}")


def upgrade():
    connection = op.get_bind()
    inspector = inspect(connection)
    column_names = {column["name"] for column in inspector.get_columns("rawposition")}
    if "account_id" not in column_names:
        op.add_column(
            "rawposition",
            sa.Column("account_id", postgresql.UUID(as_uuid=True), nullable=True),
        )

    owner_ids = [
        row[0]
        for row in connection.execute(
            sa.text(
                """
                SELECT DISTINCT owner_id
                FROM rawposition
                WHERE account_id IS NULL
                """
            )
        )
    ]
    now = datetime.now(timezone.utc)
    for owner_id in owner_ids:
        generated_account_id = _generated_account_id(owner_id)
        connection.execute(
            sa.text(
                """
                INSERT INTO account (
                    name,
                    account_type,
                    institution_name,
                    account_mask,
                    base_currency,
                    notes,
                    is_active,
                    id,
                    owner_id,
                    created_at,
                    updated_at
                ) VALUES (
                    :name,
                    :account_type,
                    :institution_name,
                    :account_mask,
                    :base_currency,
                    :notes,
                    :is_active,
                    :id,
                    :owner_id,
                    :created_at,
                    :updated_at
                )
                ON CONFLICT (id) DO NOTHING
                """
            ),
            {
                "name": AUTO_ACCOUNT_NAME,
                "account_type": "brokerage",
                "institution_name": AUTO_ACCOUNT_INSTITUTION,
                "account_mask": None,
                "base_currency": "USD",
                "notes": AUTO_ACCOUNT_NOTES,
                "is_active": True,
                "id": generated_account_id,
                "owner_id": owner_id,
                "created_at": now,
                "updated_at": now,
            },
        )
        connection.execute(
            sa.text(
                """
                UPDATE rawposition
                SET account_id = :account_id
                WHERE owner_id = :owner_id
                  AND account_id IS NULL
                """
            ),
            {"account_id": generated_account_id, "owner_id": owner_id},
        )

    op.alter_column(
        "rawposition",
        "account_id",
        existing_type=postgresql.UUID(as_uuid=True),
        nullable=False,
    )

    inspector = inspect(connection)
    foreign_key_names = {
        foreign_key["name"]
        for foreign_key in inspector.get_foreign_keys("rawposition")
        if foreign_key["referred_table"] == "account"
        and foreign_key["constrained_columns"] == ["account_id"]
    }
    if "fk_rawposition_account_id_account" not in foreign_key_names:
        op.create_foreign_key(
            "fk_rawposition_account_id_account",
            "rawposition",
            "account",
            ["account_id"],
            ["id"],
            ondelete="RESTRICT",
        )


def downgrade():
    connection = op.get_bind()
    inspector = inspect(connection)
    column_names = {column["name"] for column in inspector.get_columns("rawposition")}
    if "account_id" in column_names:
        op.alter_column(
            "rawposition",
            "account_id",
            existing_type=postgresql.UUID(as_uuid=True),
            nullable=True,
        )

        generated_accounts = connection.execute(
            sa.text(
                """
                SELECT account.id, account.owner_id
                FROM account
                WHERE account.name = :name
                  AND account.account_type = :account_type
                  AND account.institution_name = :institution_name
                  AND account.account_mask IS NULL
                  AND account.base_currency = :base_currency
                  AND account.notes = :notes
                  AND account.is_active = :is_active
                  AND account.created_at = account.updated_at
                  AND NOT EXISTS (
                      SELECT 1
                      FROM portfolio
                      WHERE portfolio.account_id = account.id
                  )
                """
            ),
            {
                "name": AUTO_ACCOUNT_NAME,
                "account_type": "brokerage",
                "institution_name": AUTO_ACCOUNT_INSTITUTION,
                "base_currency": "USD",
                "notes": AUTO_ACCOUNT_NOTES,
                "is_active": True,
            },
        )
        generated_account_ids = [
            account_id
            for account_id, owner_id in generated_accounts
            if account_id == _generated_account_id(owner_id)
        ]
        if generated_account_ids:
            account_ids_param = sa.bindparam("account_ids", expanding=True)
            connection.execute(
                sa.text(
                    """
                    UPDATE rawposition
                    SET account_id = NULL
                    WHERE account_id IN :account_ids
                    """
                ).bindparams(account_ids_param),
                {"account_ids": generated_account_ids},
            )
            connection.execute(
                sa.text(
                    """
                    DELETE FROM account
                    WHERE id IN :account_ids
                      AND NOT EXISTS (
                          SELECT 1
                          FROM portfolio
                          WHERE portfolio.account_id = account.id
                      )
                    """
                ).bindparams(account_ids_param),
                {"account_ids": generated_account_ids},
            )

        inspector = inspect(connection)
    foreign_key_names = {
        foreign_key["name"]
        for foreign_key in inspector.get_foreign_keys("rawposition")
        if foreign_key["referred_table"] == "account"
        and foreign_key["constrained_columns"] == ["account_id"]
    }
    if "fk_rawposition_account_id_account" in foreign_key_names:
        op.drop_constraint(
            "fk_rawposition_account_id_account",
            "rawposition",
            type_="foreignkey",
        )

    inspector = inspect(connection)
    column_names = {column["name"] for column in inspector.get_columns("rawposition")}
    if "account_id" in column_names:
        op.drop_column("rawposition", "account_id")
