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

AUTO_ACCOUNT_NAME = "Imported synced positions"
AUTO_ACCOUNT_INSTITUTION = "Imported connector account"
AUTO_ACCOUNT_NOTES = "Auto-generated during account migration for existing synced positions."


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
        generated_account_id = uuid.uuid4()
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

    column_names = {column["name"] for column in inspector.get_columns("rawposition")}
    if "account_id" in column_names:
        op.drop_column("rawposition", "account_id")
