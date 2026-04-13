"""Fix asset instrument uniqueness

Revision ID: 20260413_fix_asset_instrument_uniqueness
Revises: 20260413_add_asset_instruments
Create Date: 2026-04-13 00:00:00.000000

"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20260413_fix_asset_instrument_uniqueness"
down_revision = "20260413_add_asset_instruments"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_constraint(
        "uq_assetinstrument_type_symbol_exchange", "assetinstrument", type_="unique"
    )
    op.create_index(
        "uq_assetinstrument_type_symbol_exchange_market",
        "assetinstrument",
        [
            "asset_type",
            sa.text("lower(symbol)"),
            sa.text("coalesce(lower(exchange), '')"),
            sa.text("coalesce(lower(market), '')"),
        ],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index(
        "uq_assetinstrument_type_symbol_exchange_market", table_name="assetinstrument"
    )
    op.create_unique_constraint(
        "uq_assetinstrument_type_symbol_exchange",
        "assetinstrument",
        ["asset_type", "symbol", "exchange"],
    )
