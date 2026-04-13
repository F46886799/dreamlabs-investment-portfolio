"""Add asset instruments

Revision ID: 20260413_add_asset_instruments
Revises: 7c2f1d4e9a10
Create Date: 2026-04-13 00:00:00.000000

"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = "20260413_add_asset_instruments"
down_revision = "7c2f1d4e9a10"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "assetinstrument",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("asset_type", sa.String(length=32), nullable=False),
        sa.Column("symbol", sa.String(length=32), nullable=False),
        sa.Column("display_name", sa.String(length=255), nullable=False),
        sa.Column("canonical_name", sa.String(length=255), nullable=True),
        sa.Column("market", sa.String(length=64), nullable=True),
        sa.Column("exchange", sa.String(length=64), nullable=True),
        sa.Column("currency", sa.String(length=8), nullable=False),
        sa.Column("country", sa.String(length=64), nullable=True),
        sa.Column("category_level_1", sa.String(length=64), nullable=False),
        sa.Column("category_level_2", sa.String(length=64), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("sync_status", sa.String(length=32), nullable=False),
        sa.Column("external_source", sa.String(length=64), nullable=True),
        sa.Column("external_id", sa.String(length=128), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("last_synced_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_assetinstrument_asset_type"), "assetinstrument", ["asset_type"], unique=False)
    op.create_index(op.f("ix_assetinstrument_symbol"), "assetinstrument", ["symbol"], unique=False)
    op.create_unique_constraint(
        "uq_assetinstrument_type_symbol_exchange",
        "assetinstrument",
        ["asset_type", "symbol", "exchange"],
    )


def downgrade() -> None:
    op.drop_constraint("uq_assetinstrument_type_symbol_exchange", "assetinstrument", type_="unique")
    op.drop_index(op.f("ix_assetinstrument_symbol"), table_name="assetinstrument")
    op.drop_index(op.f("ix_assetinstrument_asset_type"), table_name="assetinstrument")
    op.drop_table("assetinstrument")
