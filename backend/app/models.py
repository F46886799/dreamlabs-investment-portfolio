import uuid
from datetime import datetime, timezone
from enum import Enum

from pydantic import EmailStr
from sqlalchemy import Column, DateTime
from sqlalchemy import Enum as SAEnum
from sqlmodel import Field, Relationship, SQLModel


def get_datetime_utc() -> datetime:
    return datetime.now(timezone.utc)


# Shared properties
class UserBase(SQLModel):
    email: EmailStr = Field(unique=True, index=True, max_length=255)
    is_active: bool = True
    is_superuser: bool = False
    full_name: str | None = Field(default=None, max_length=255)


# Properties to receive via API on creation
class UserCreate(UserBase):
    password: str = Field(min_length=8, max_length=128)


class UserRegister(SQLModel):
    email: EmailStr = Field(max_length=255)
    password: str = Field(min_length=8, max_length=128)
    full_name: str | None = Field(default=None, max_length=255)


# Properties to receive via API on update, all are optional
class UserUpdate(UserBase):
    email: EmailStr | None = Field(default=None, max_length=255)  # type: ignore[assignment]
    password: str | None = Field(default=None, min_length=8, max_length=128)


class UserUpdateMe(SQLModel):
    full_name: str | None = Field(default=None, max_length=255)
    email: EmailStr | None = Field(default=None, max_length=255)


class UpdatePassword(SQLModel):
    current_password: str = Field(min_length=8, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)


# Database model, database table inferred from class name
class User(UserBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    hashed_password: str
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    accounts: list["Account"] = Relationship(back_populates="owner", cascade_delete=True)
    portfolios: list["Portfolio"] = Relationship(
        back_populates="owner", cascade_delete=True
    )
    items: list["Item"] = Relationship(back_populates="owner", cascade_delete=True)


# Properties to return via API, id is always required
class UserPublic(UserBase):
    id: uuid.UUID
    created_at: datetime | None = None


class UsersPublic(SQLModel):
    data: list[UserPublic]
    count: int


# Shared properties
class ItemBase(SQLModel):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=255)


# Properties to receive on item creation
class ItemCreate(ItemBase):
    pass


# Properties to receive on item update
class ItemUpdate(ItemBase):
    title: str | None = Field(default=None, min_length=1, max_length=255)  # type: ignore[assignment]


# Database model, database table inferred from class name
class Item(ItemBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    owner_id: uuid.UUID = Field(
        foreign_key="user.id", nullable=False, ondelete="CASCADE"
    )
    owner: User | None = Relationship(back_populates="items")


# Properties to return via API, id is always required
class ItemPublic(ItemBase):
    id: uuid.UUID
    owner_id: uuid.UUID
    created_at: datetime | None = None


class ItemsPublic(SQLModel):
    data: list[ItemPublic]
    count: int


class AccountType(str, Enum):
    BROKERAGE = "brokerage"
    BANK = "bank"


class AccountBase(SQLModel):
    name: str = Field(min_length=1, max_length=255)
    account_type: AccountType = Field(
        sa_column=Column(
            SAEnum(
                AccountType,
                values_callable=lambda members: [member.value for member in members],
                name="accounttype",
            ),
            nullable=False,
        )
    )
    institution_name: str = Field(min_length=1, max_length=255)
    account_mask: str | None = Field(default=None, max_length=32)
    base_currency: str = Field(default="USD", max_length=8)
    notes: str | None = Field(default=None, max_length=1000)
    is_active: bool = True


class AccountCreate(AccountBase):
    pass


class Account(AccountBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    owner_id: uuid.UUID = Field(
        foreign_key="user.id", nullable=False, ondelete="CASCADE"
    )
    created_at: datetime = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    updated_at: datetime = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    owner: User | None = Relationship(back_populates="accounts")
    raw_positions: list["RawPosition"] = Relationship(back_populates="account")
    portfolios: list["Portfolio"] = Relationship(
        back_populates="account", cascade_delete=True
    )


class AccountPublic(AccountBase):
    id: uuid.UUID
    owner_id: uuid.UUID
    created_at: datetime
    updated_at: datetime


class AccountsPublic(SQLModel):
    data: list[AccountPublic]
    count: int


class PortfolioBase(SQLModel):
    name: str = Field(min_length=1, max_length=255)
    account_id: uuid.UUID
    description: str | None = Field(default=None, max_length=1000)
    is_active: bool = True


class PortfolioCreate(PortfolioBase):
    pass


class Portfolio(PortfolioBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    account_id: uuid.UUID = Field(
        foreign_key="account.id", nullable=False, ondelete="CASCADE"
    )
    owner_id: uuid.UUID = Field(
        foreign_key="user.id", nullable=False, ondelete="CASCADE"
    )
    created_at: datetime = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    updated_at: datetime = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    account: Account | None = Relationship(back_populates="portfolios")
    owner: User | None = Relationship(back_populates="portfolios")


class PortfolioPublic(PortfolioBase):
    id: uuid.UUID
    owner_id: uuid.UUID
    created_at: datetime
    updated_at: datetime


class PortfoliosPublic(SQLModel):
    data: list[PortfolioPublic]
    count: int


class ConnectorSyncResponse(SQLModel):
    source: str
    status: str
    snapshot_version: str
    synced_records: int
    normalized_records: int
    conflict_records: int


class RawPositionBase(SQLModel):
    source: str = Field(max_length=64, index=True)
    external_id: str = Field(max_length=255, index=True)
    symbol: str = Field(max_length=32)
    asset_type: str = Field(max_length=64)
    quantity: float
    market_value: float
    currency: str = Field(default="USD", max_length=8)


class RawPosition(RawPositionBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    owner_id: uuid.UUID = Field(foreign_key="user.id", nullable=False, ondelete="CASCADE")
    account_id: uuid.UUID = Field(
        foreign_key="account.id", nullable=False, ondelete="RESTRICT"
    )
    fetched_at: datetime = Field(default_factory=get_datetime_utc, sa_type=DateTime(timezone=True))  # type: ignore
    account: Account | None = Relationship(back_populates="raw_positions")


class NormalizedPositionBase(SQLModel):
    symbol: str = Field(max_length=32)
    asset_class: str = Field(max_length=64)
    quantity: float
    market_value_usd: float
    normalization_status: str = Field(default="normalized", max_length=32)
    transform_version: str = Field(default="v1", max_length=32)
    snapshot_version: str = Field(max_length=64, index=True)


class NormalizedPosition(NormalizedPositionBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    raw_position_id: uuid.UUID = Field(foreign_key="rawposition.id", nullable=False, ondelete="CASCADE")
    owner_id: uuid.UUID = Field(foreign_key="user.id", nullable=False, ondelete="CASCADE")
    created_at: datetime = Field(default_factory=get_datetime_utc, sa_type=DateTime(timezone=True))  # type: ignore


class NormalizationConflictBase(SQLModel):
    field_name: str = Field(max_length=64)
    raw_value: str = Field(max_length=255)
    reason: str = Field(max_length=255)
    status: str = Field(default="pending", max_length=32)


class NormalizationConflict(NormalizationConflictBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    raw_position_id: uuid.UUID = Field(foreign_key="rawposition.id", nullable=False, ondelete="CASCADE")
    owner_id: uuid.UUID = Field(foreign_key="user.id", nullable=False, ondelete="CASCADE")
    created_at: datetime = Field(default_factory=get_datetime_utc, sa_type=DateTime(timezone=True))  # type: ignore


class AuditEventBase(SQLModel):
    entity_type: str = Field(max_length=64, index=True)
    entity_id: uuid.UUID = Field(index=True)
    event_type: str = Field(max_length=64)
    source_record_id: uuid.UUID | None = Field(default=None, index=True)
    transform_version: str | None = Field(default=None, max_length=32)
    changed_fields: str | None = Field(default=None, max_length=512)


class AuditEvent(AuditEventBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    owner_id: uuid.UUID = Field(foreign_key="user.id", nullable=False, ondelete="CASCADE")
    created_at: datetime = Field(default_factory=get_datetime_utc, sa_type=DateTime(timezone=True))  # type: ignore


class UnifiedPosition(SQLModel):
    symbol: str
    asset_class: str
    quantity: float
    market_value_usd: float


class PortfolioAggregationFilters(SQLModel):
    account_id: uuid.UUID | None = None
    portfolio_id: uuid.UUID | None = None


class UnifiedPortfolioResponse(SQLModel):
    snapshot_version: str
    stale: bool
    data: list[UnifiedPosition]


class HealthReportResponse(SQLModel):
    week: str
    generated_at: datetime
    positions_count: int
    total_market_value_usd: float
    asset_class_count: int
    anomaly_count: int
    stale: bool


class AuditEventPublic(SQLModel):
    id: uuid.UUID
    entity_type: str
    entity_id: uuid.UUID
    event_type: str
    source_record_id: uuid.UUID | None = None
    transform_version: str | None = None
    changed_fields: str | None = None
    created_at: datetime


class AuditEventsPublic(SQLModel):
    data: list[AuditEventPublic]
    count: int


# Generic message
class Message(SQLModel):
    message: str


# JSON payload containing access token
class Token(SQLModel):
    access_token: str
    token_type: str = "bearer"


# Contents of JWT token
class TokenPayload(SQLModel):
    sub: str | None = None


class NewPassword(SQLModel):
    token: str
    new_password: str = Field(min_length=8, max_length=128)
