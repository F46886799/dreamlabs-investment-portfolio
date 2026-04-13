from datetime import datetime, timezone
from uuid import UUID

from sqlmodel import Session, select

from app.models import (
    AuditEvent,
    NormalizationConflict,
    NormalizedPosition,
    RawPosition,
    UnifiedPosition,
)

ASSET_CLASS_MAPPING: dict[str, str] = {
    "stock": "equity",
    "etf": "equity",
    "crypto": "digital_asset",
    "cash": "cash",
}

TRANSFORM_VERSION = "v1"


def fetch_connector_positions(source: str) -> list[dict[str, str | float]]:
    if source != "demo-broker":
        return []
    return [
        {
            "external_id": "pos-1",
            "symbol": "AAPL",
            "asset_type": "stock",
            "quantity": 10.0,
            "market_value": 1890.0,
            "currency": "USD",
        },
        {
            "external_id": "pos-2",
            "symbol": "BTC",
            "asset_type": "crypto",
            "quantity": 0.1,
            "market_value": 6200.0,
            "currency": "USD",
        },
        {
            "external_id": "pos-3",
            "symbol": "MYST",
            "asset_type": "unknown",
            "quantity": 1.0,
            "market_value": 100.0,
            "currency": "USD",
        },
    ]


def ingest_positions(
    session: Session,
    owner_id: UUID,
    source: str,
    account_id: UUID,
) -> tuple[str, int, int, int]:
    rows = fetch_connector_positions(source)
    snapshot_version = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")

    synced_records = 0
    normalized_records = 0
    conflict_records = 0

    for row in rows:
        raw_position = RawPosition(
            source=source,
            external_id=str(row["external_id"]),
            symbol=str(row["symbol"]),
            asset_type=str(row["asset_type"]),
            quantity=float(row["quantity"]),
            market_value=float(row["market_value"]),
            currency=str(row["currency"]),
            owner_id=owner_id,
            account_id=account_id,
        )
        session.add(raw_position)
        session.flush()
        synced_records += 1

        asset_class = ASSET_CLASS_MAPPING.get(raw_position.asset_type)
        if not asset_class:
            conflict = NormalizationConflict(
                raw_position_id=raw_position.id,
                owner_id=owner_id,
                field_name="asset_type",
                raw_value=raw_position.asset_type,
                reason="No SSOT mapping for asset_type",
            )
            session.add(conflict)
            session.add(
                AuditEvent(
                    owner_id=owner_id,
                    entity_type="raw_position",
                    entity_id=raw_position.id,
                    event_type="normalization_conflict",
                    source_record_id=raw_position.id,
                    transform_version=TRANSFORM_VERSION,
                    changed_fields="asset_type",
                )
            )
            conflict_records += 1
            continue

        normalized = NormalizedPosition(
            raw_position_id=raw_position.id,
            owner_id=owner_id,
            symbol=raw_position.symbol,
            asset_class=asset_class,
            quantity=raw_position.quantity,
            market_value_usd=raw_position.market_value,
            transform_version=TRANSFORM_VERSION,
            snapshot_version=snapshot_version,
        )
        session.add(normalized)
        session.flush()
        session.add(
            AuditEvent(
                owner_id=owner_id,
                entity_type="normalized_position",
                entity_id=normalized.id,
                event_type="normalized",
                source_record_id=raw_position.id,
                transform_version=TRANSFORM_VERSION,
                changed_fields="asset_type,currency",
            )
        )
        normalized_records += 1

    session.commit()
    return snapshot_version, synced_records, normalized_records, conflict_records


def get_unified_positions(
    session: Session,
    owner_id: UUID,
) -> tuple[str, bool, list[UnifiedPosition]]:
    latest = session.exec(
        select(NormalizedPosition)
        .where(NormalizedPosition.owner_id == owner_id)
        .order_by(NormalizedPosition.created_at.desc())
    ).all()

    if not latest:
        return "", True, []

    snapshot_version = latest[0].snapshot_version
    rows = session.exec(
        select(NormalizedPosition).where(
            NormalizedPosition.owner_id == owner_id,
            NormalizedPosition.snapshot_version == snapshot_version,
            NormalizedPosition.normalization_status == "normalized",
        )
    ).all()

    grouped: dict[tuple[str, str], UnifiedPosition] = {}
    for row in rows:
        key = (row.symbol, row.asset_class)
        if key not in grouped:
            grouped[key] = UnifiedPosition(
                symbol=row.symbol,
                asset_class=row.asset_class,
                quantity=0,
                market_value_usd=0,
            )
        grouped[key].quantity += row.quantity
        grouped[key].market_value_usd += row.market_value_usd

    return snapshot_version, False, list(grouped.values())


def get_anomaly_count(session: Session, owner_id: UUID) -> int:
    return len(
        session.exec(
            select(NormalizationConflict).where(
                NormalizationConflict.owner_id == owner_id,
                NormalizationConflict.status == "pending",
            )
        ).all()
    )
