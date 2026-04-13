"""Add accounts and portfolios

Revision ID: 8d4f2c3b1a00
Revises: 7c2f1d4e9a10
Create Date: 2026-04-13 00:00:00.000000

"""

import uuid
from datetime import datetime, timezone

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = "8d4f2c3b1a00"
down_revision = "7c2f1d4e9a10"
branch_labels = None
depends_on = None

account_type = postgresql.ENUM(
    "brokerage",
    "bank",
    name="accounttype",
    create_type=False,
)


def upgrade():
    connection = op.get_bind()
    account_type.create(op.get_bind(), checkfirst=True)
    op.create_table(
        "account",
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("account_type", account_type, nullable=False),
        sa.Column("institution_name", sa.String(length=255), nullable=False),
        sa.Column("account_mask", sa.String(length=32), nullable=True),
        sa.Column("base_currency", sa.String(length=8), nullable=False),
        sa.Column("notes", sa.String(length=1000), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("owner_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["owner_id"], ["user.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "portfolio",
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("account_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("description", sa.String(length=1000), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("owner_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["account_id"], ["account.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["owner_id"], ["user.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.add_column(
        "rawposition",
        sa.Column("account_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    existing_owner_ids = [
        row[0] for row in connection.execute(sa.text("SELECT DISTINCT owner_id FROM rawposition"))
    ]
    now = datetime.now(timezone.utc)
    for owner_id in existing_owner_ids:
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
                "name": "Imported synced positions",
                "account_type": "brokerage",
                "institution_name": "Imported connector account",
                "account_mask": None,
                "base_currency": "USD",
                "notes": "Auto-generated during account migration for existing synced positions.",
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
                """
            ),
            {"account_id": generated_account_id, "owner_id": owner_id},
        )
    op.alter_column("rawposition", "account_id", nullable=False)
    op.create_foreign_key(
        "fk_rawposition_account_id_account",
        "rawposition",
        "account",
        ["account_id"],
        ["id"],
        ondelete="RESTRICT",
    )


def downgrade():
    op.drop_constraint("fk_rawposition_account_id_account", "rawposition", type_="foreignkey")
    op.drop_column("rawposition", "account_id")
    op.drop_table("portfolio")
    op.drop_table("account")
    account_type.drop(op.get_bind(), checkfirst=True)
