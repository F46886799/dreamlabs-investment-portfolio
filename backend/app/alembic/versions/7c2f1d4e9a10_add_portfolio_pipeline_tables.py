"""Add portfolio pipeline tables

Revision ID: 7c2f1d4e9a10
Revises: fe56fa70289e
Create Date: 2026-04-11 20:30:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = "7c2f1d4e9a10"
down_revision = "fe56fa70289e"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "rawposition",
        sa.Column("source", sa.String(length=64), nullable=False),
        sa.Column("external_id", sa.String(length=255), nullable=False),
        sa.Column("symbol", sa.String(length=32), nullable=False),
        sa.Column("asset_type", sa.String(length=64), nullable=False),
        sa.Column("quantity", sa.Float(), nullable=False),
        sa.Column("market_value", sa.Float(), nullable=False),
        sa.Column("currency", sa.String(length=8), nullable=False),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("owner_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("fetched_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["owner_id"], ["user.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_rawposition_source"), "rawposition", ["source"], unique=False)
    op.create_index(op.f("ix_rawposition_external_id"), "rawposition", ["external_id"], unique=False)

    op.create_table(
        "normalizedposition",
        sa.Column("symbol", sa.String(length=32), nullable=False),
        sa.Column("asset_class", sa.String(length=64), nullable=False),
        sa.Column("quantity", sa.Float(), nullable=False),
        sa.Column("market_value_usd", sa.Float(), nullable=False),
        sa.Column("normalization_status", sa.String(length=32), nullable=False),
        sa.Column("transform_version", sa.String(length=32), nullable=False),
        sa.Column("snapshot_version", sa.String(length=64), nullable=False),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("raw_position_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("owner_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["owner_id"], ["user.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["raw_position_id"], ["rawposition.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_normalizedposition_snapshot_version"), "normalizedposition", ["snapshot_version"], unique=False)

    op.create_table(
        "normalizationconflict",
        sa.Column("field_name", sa.String(length=64), nullable=False),
        sa.Column("raw_value", sa.String(length=255), nullable=False),
        sa.Column("reason", sa.String(length=255), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("raw_position_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("owner_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["owner_id"], ["user.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["raw_position_id"], ["rawposition.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "auditevent",
        sa.Column("entity_type", sa.String(length=64), nullable=False),
        sa.Column("entity_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("event_type", sa.String(length=64), nullable=False),
        sa.Column("source_record_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("transform_version", sa.String(length=32), nullable=True),
        sa.Column("changed_fields", sa.String(length=512), nullable=True),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("owner_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["owner_id"], ["user.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_auditevent_entity_type"), "auditevent", ["entity_type"], unique=False)
    op.create_index(op.f("ix_auditevent_entity_id"), "auditevent", ["entity_id"], unique=False)
    op.create_index(op.f("ix_auditevent_source_record_id"), "auditevent", ["source_record_id"], unique=False)


def downgrade():
    op.drop_index(op.f("ix_auditevent_source_record_id"), table_name="auditevent")
    op.drop_index(op.f("ix_auditevent_entity_id"), table_name="auditevent")
    op.drop_index(op.f("ix_auditevent_entity_type"), table_name="auditevent")
    op.drop_table("auditevent")

    op.drop_table("normalizationconflict")

    op.drop_index(op.f("ix_normalizedposition_snapshot_version"), table_name="normalizedposition")
    op.drop_table("normalizedposition")

    op.drop_index(op.f("ix_rawposition_external_id"), table_name="rawposition")
    op.drop_index(op.f("ix_rawposition_source"), table_name="rawposition")
    op.drop_table("rawposition")
