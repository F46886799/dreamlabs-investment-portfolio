"""Add subject maintenance tables

Revision ID: 20260413_subjects
Revises: 7c2f1d4e9a10
Create Date: 2026-04-13 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = "20260413_subjects"
down_revision = "7c2f1d4e9a10"
branch_labels = None
depends_on = None

person_type_enum = sa.Enum(
    "internal_member",
    "client_contact",
    "external_advisor",
    "other",
    name="persontype",
    create_type=False,
)

organization_type_enum = sa.Enum(
    "fund_or_investment_vehicle",
    "broker_or_bank",
    "service_provider",
    "other",
    name="organizationtype",
    create_type=False,
)


def upgrade():
    bind = op.get_bind()
    person_type_enum.create(bind, checkfirst=True)
    organization_type_enum.create(bind, checkfirst=True)

    op.create_table(
        "person",
        sa.Column("person_type", person_type_enum, nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("alias", sa.String(length=255), nullable=True),
        sa.Column("notes", sa.String(length=1000), nullable=True),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "organization",
        sa.Column("organization_type", organization_type_enum, nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("alias", sa.String(length=255), nullable=True),
        sa.Column("notes", sa.String(length=1000), nullable=True),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade():
    bind = op.get_bind()
    op.drop_table("organization")
    op.drop_table("person")
    organization_type_enum.drop(bind, checkfirst=True)
    person_type_enum.drop(bind, checkfirst=True)
