import uuid
from datetime import datetime, timezone

from pydantic import EmailStr, field_validator
from sqlalchemy import DateTime, Index, event, text
from sqlmodel import Field, Relationship, SQLModel


ALLOWED_ASSET_TYPES = {"stock", "etf", "crypto", "bond", "cash"}


def normalize_asset_type_value(value: str) -> str:
    normalized = value.strip().lower()
    if normalized not in ALLOWED_ASSET_TYPES:
        raise ValueError(
            "asset_type must be one of: stock, etf, crypto, bond, cash"
        )
    return normalized


def normalize_symbol_value(value: str) -> str:
    return value.strip().upper()


def normalize_market_value(value: str | None) -> str | None:
    if value is None:
        return None
    normalized = value.strip().upper()
    return normalized or None


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
    fetched_at: datetime = Field(default_factory=get_datetime_utc, sa_type=DateTime(timezone=True))  # type: ignore


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


class AssetInstrumentBase(SQLModel):
    asset_type: str = Field(max_length=32, index=True)
    symbol: str = Field(min_length=1, max_length=32, index=True)
    display_name: str = Field(min_length=1, max_length=255)
    canonical_name: str | None = Field(default=None, max_length=255)
    market: str | None = Field(default=None, max_length=64)
    exchange: str | None = Field(default=None, max_length=64)
    currency: str = Field(default="USD", max_length=8)
    country: str | None = Field(default=None, max_length=64)
    category_level_1: str = Field(default="other", max_length=64)
    category_level_2: str | None = Field(default=None, max_length=64)
    status: str = Field(default="active", max_length=32)
    sync_status: str = Field(default="manual", max_length=32)
    external_source: str | None = Field(default=None, max_length=64)
    external_id: str | None = Field(default=None, max_length=128)
    is_active: bool = True

    @field_validator("asset_type")
    @classmethod
    def validate_asset_type(cls, value: str) -> str:
        return normalize_asset_type_value(value)

    @field_validator("symbol")
    @classmethod
    def normalize_symbol(cls, value: str) -> str:
        return normalize_symbol_value(value)

    @field_validator("exchange", "market")
    @classmethod
    def normalize_market_fields(cls, value: str | None) -> str | None:
        return normalize_market_value(value)


class AssetInstrumentCreate(AssetInstrumentBase):
    pass


class AssetInstrumentUpdate(SQLModel):
    asset_type: str | None = Field(default=None, max_length=32)
    symbol: str | None = Field(default=None, min_length=1, max_length=32)
    display_name: str | None = Field(default=None, min_length=1, max_length=255)
    canonical_name: str | None = Field(default=None, max_length=255)
    market: str | None = Field(default=None, max_length=64)
    exchange: str | None = Field(default=None, max_length=64)
    currency: str | None = Field(default=None, max_length=8)
    country: str | None = Field(default=None, max_length=64)
    category_level_1: str | None = Field(default=None, max_length=64)
    category_level_2: str | None = Field(default=None, max_length=64)
    status: str | None = Field(default=None, max_length=32)
    sync_status: str | None = Field(default=None, max_length=32)
    external_source: str | None = Field(default=None, max_length=64)
    external_id: str | None = Field(default=None, max_length=128)
    is_active: bool | None = None

    @field_validator("asset_type")
    @classmethod
    def validate_asset_type(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return normalize_asset_type_value(value)

    @field_validator("symbol")
    @classmethod
    def normalize_symbol(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return normalize_symbol_value(value)

    @field_validator("exchange", "market")
    @classmethod
    def normalize_market_fields(cls, value: str | None) -> str | None:
        return normalize_market_value(value)


class AssetInstrument(AssetInstrumentBase, table=True):
    __table_args__ = (
        Index(
            "uq_assetinstrument_type_symbol_exchange_market",
            "asset_type",
            text("lower(symbol)"),
            text("coalesce(lower(exchange), '')"),
            text("coalesce(lower(market), '')"),
            unique=True,
        ),
    )

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    updated_at: datetime = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    last_synced_at: datetime | None = Field(
        default=None,
        sa_type=DateTime(timezone=True),  # type: ignore
    )

class AssetInstrumentPublic(AssetInstrumentBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    last_synced_at: datetime | None = None


class AssetInstrumentsPublic(SQLModel):
    data: list[AssetInstrumentPublic]
    count: int


@event.listens_for(AssetInstrument, "before_insert")
@event.listens_for(AssetInstrument, "before_update")
def normalize_asset_instrument_before_persist(
    mapper: object, connection: object, target: AssetInstrument
) -> None:
    del mapper, connection
    target.asset_type = normalize_asset_type_value(target.asset_type)
    target.symbol = normalize_symbol_value(target.symbol)
    target.exchange = normalize_market_value(target.exchange)
    target.market = normalize_market_value(target.market)
