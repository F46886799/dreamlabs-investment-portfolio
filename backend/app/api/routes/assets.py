import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlmodel import col, func, or_, select

from app.api.deps import SessionDep, get_current_active_superuser
from app.models import (
    AssetInstrument,
    AssetInstrumentCreate,
    AssetInstrumentPublic,
    AssetInstrumentsPublic,
    AssetInstrumentUpdate,
    get_datetime_utc,
)

router = APIRouter(
    prefix="/assets",
    tags=["assets"],
    dependencies=[Depends(get_current_active_superuser)],
)


@router.get("/", response_model=AssetInstrumentsPublic)
def read_assets(
    session: SessionDep,
    skip: int = 0,
    limit: int = 100,
    asset_type: str | None = None,
    is_active: bool | None = None,
    status: str | None = None,
    query: str | None = None,
) -> Any:
    statement = select(AssetInstrument)
    count_statement = select(func.count()).select_from(AssetInstrument)

    filters = []
    if asset_type:
        filters.append(AssetInstrument.asset_type == asset_type)
    if is_active is not None:
        filters.append(AssetInstrument.is_active == is_active)
    if status:
        filters.append(AssetInstrument.status == status)
    if query:
        like_value = f"%{query}%"
        filters.append(
            or_(
                col(AssetInstrument.symbol).ilike(like_value),
                col(AssetInstrument.display_name).ilike(like_value),
            )
        )

    for condition in filters:
        statement = statement.where(condition)
        count_statement = count_statement.where(condition)

    count = session.exec(count_statement).one()
    rows = session.exec(
        statement.order_by(col(AssetInstrument.updated_at).desc())
        .offset(skip)
        .limit(limit)
    ).all()
    return AssetInstrumentsPublic(
        data=[AssetInstrumentPublic.model_validate(row) for row in rows],
        count=count,
    )


@router.post("/", response_model=AssetInstrumentPublic)
def create_asset(*, session: SessionDep, asset_in: AssetInstrumentCreate) -> Any:
    asset = AssetInstrument.model_validate(asset_in)
    session.add(asset)
    try:
        session.commit()
    except IntegrityError:
        session.rollback()
        raise HTTPException(status_code=409, detail="Asset instrument already exists")
    session.refresh(asset)
    return asset


@router.get("/{asset_id}", response_model=AssetInstrumentPublic)
def read_asset(asset_id: uuid.UUID, session: SessionDep) -> Any:
    asset = session.get(AssetInstrument, asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset instrument not found")
    return asset


@router.patch("/{asset_id}", response_model=AssetInstrumentPublic)
def update_asset(
    *, asset_id: uuid.UUID, session: SessionDep, asset_in: AssetInstrumentUpdate
) -> Any:
    asset = session.get(AssetInstrument, asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset instrument not found")

    asset.sqlmodel_update(asset_in.model_dump(exclude_unset=True))
    asset.updated_at = get_datetime_utc()

    session.add(asset)
    try:
        session.commit()
    except IntegrityError:
        session.rollback()
        raise HTTPException(status_code=409, detail="Asset instrument already exists")

    session.refresh(asset)
    return asset
