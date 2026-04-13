from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, HTTPException
from sqlmodel import select

from app.api.deps import CurrentUser, SessionDep
from app.models import (
    Account,
    AuditEvent,
    AuditEventPublic,
    AuditEventsPublic,
    ConnectorSyncResponse,
    HealthReportResponse,
    UnifiedPortfolioResponse,
)
from app.services.portfolio_pipeline import (
    get_anomaly_count,
    get_unified_positions,
    ingest_positions,
)

router = APIRouter(prefix="/portfolio", tags=["portfolio"])
connectors_router = APIRouter(prefix="/connectors", tags=["portfolio"])
audit_router = APIRouter(prefix="/audit", tags=["portfolio"])


def _get_owned_account(
    session: SessionDep, current_user: CurrentUser, account_id: UUID
) -> Account:
    account = session.get(Account, account_id)
    if not account or account.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Account not found")
    return account


@connectors_router.post("/{source}/sync", response_model=ConnectorSyncResponse)
def sync_connector_positions(
    session: SessionDep,
    current_user: CurrentUser,
    source: str,
    account_id: UUID,
) -> ConnectorSyncResponse:
    _get_owned_account(session, current_user, account_id)
    snapshot_version, synced, normalized, conflicts = ingest_positions(
        session=session,
        owner_id=current_user.id,
        source=source,
        account_id=account_id,
    )
    return ConnectorSyncResponse(
        source=source,
        status="ok",
        snapshot_version=snapshot_version,
        synced_records=synced,
        normalized_records=normalized,
        conflict_records=conflicts,
    )


@router.get("/unified", response_model=UnifiedPortfolioResponse)
def get_unified_portfolio(
    session: SessionDep,
    current_user: CurrentUser,
) -> UnifiedPortfolioResponse:
    snapshot_version, is_stale, positions = get_unified_positions(
        session=session,
        owner_id=current_user.id,
    )

    return UnifiedPortfolioResponse(
        snapshot_version=snapshot_version,
        stale=is_stale,
        data=positions,
    )


@router.get("/health-report", response_model=HealthReportResponse)
def get_health_report(
    session: SessionDep,
    current_user: CurrentUser,
) -> HealthReportResponse:
    _, is_stale, positions = get_unified_positions(session=session, owner_id=current_user.id)
    anomaly_count = get_anomaly_count(session=session, owner_id=current_user.id)

    return HealthReportResponse(
        week=datetime.now(timezone.utc).strftime("%Y-W%W"),
        generated_at=datetime.now(timezone.utc),
        positions_count=len(positions),
        total_market_value_usd=sum(position.market_value_usd for position in positions),
        asset_class_count=len({position.asset_class for position in positions}),
        anomaly_count=anomaly_count,
        stale=is_stale,
    )


@audit_router.get("/events", response_model=AuditEventsPublic)
def get_audit_events(
    session: SessionDep,
    current_user: CurrentUser,
) -> AuditEventsPublic:
    rows = session.exec(
        select(AuditEvent)
        .where(AuditEvent.owner_id == current_user.id)
        .order_by(AuditEvent.created_at.desc())
    ).all()

    return AuditEventsPublic(
        data=[AuditEventPublic.model_validate(row) for row in rows],
        count=len(rows),
    )
