"""Add accounts and portfolios

Revision ID: 8d4f2c3b1a00
Revises: 7c2f1d4e9a10
Create Date: 2026-04-13 00:00:00.000000

"""

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


def downgrade():
    op.drop_table("account")
    account_type.drop(op.get_bind(), checkfirst=True)
