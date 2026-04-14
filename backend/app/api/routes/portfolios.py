import uuid

from fastapi import APIRouter, HTTPException
from sqlmodel import col, select

from app.api.deps import CurrentUser, SessionDep
from app.models import (
    Account,
    Portfolio,
    PortfolioCreate,
    PortfolioPublic,
    PortfoliosPublic,
    PortfolioUpdate,
    get_datetime_utc,
)

router = APIRouter(prefix="/portfolios", tags=["portfolios"])


def _get_owned_account(
    session: SessionDep, current_user: CurrentUser, account_id: uuid.UUID
) -> Account:
    account = session.get(Account, account_id)
    if not account or account.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Account not found")
    return account


def _get_owned_portfolio(
    session: SessionDep, current_user: CurrentUser, portfolio_id: uuid.UUID
) -> Portfolio:
    portfolio = session.get(Portfolio, portfolio_id)
    if not portfolio or portfolio.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    return portfolio


@router.post("", response_model=PortfolioPublic)
def create_portfolio(
    session: SessionDep,
    current_user: CurrentUser,
    portfolio_in: PortfolioCreate,
) -> PortfolioPublic:
    account = _get_owned_account(session, current_user, portfolio_in.account_id)
    if not account.is_active:
        raise HTTPException(
            status_code=409,
            detail="Cannot create portfolio under inactive account",
        )

    portfolio = Portfolio(owner_id=current_user.id, **portfolio_in.model_dump())
    session.add(portfolio)
    session.commit()
    session.refresh(portfolio)
    return PortfolioPublic.model_validate(portfolio)


@router.put("/{portfolio_id}", response_model=PortfolioPublic)
def update_portfolio(
    session: SessionDep,
    current_user: CurrentUser,
    portfolio_id: uuid.UUID,
    portfolio_in: PortfolioUpdate,
) -> PortfolioPublic:
    portfolio = _get_owned_portfolio(session, current_user, portfolio_id)
    update_data = portfolio_in.model_dump(exclude_unset=True)

    if not update_data:
        return PortfolioPublic.model_validate(portfolio)

    changed_data = {
        field: value
        for field, value in update_data.items()
        if getattr(portfolio, field) != value
    }
    if not changed_data:
        return PortfolioPublic.model_validate(portfolio)

    if "account_id" in changed_data:
        account = _get_owned_account(session, current_user, changed_data["account_id"])
        if not account.is_active:
            raise HTTPException(
                status_code=409,
                detail="Cannot assign portfolio to inactive account",
            )

    portfolio.sqlmodel_update({**changed_data, "updated_at": get_datetime_utc()})
    session.add(portfolio)
    session.commit()
    session.refresh(portfolio)
    return PortfolioPublic.model_validate(portfolio)


@router.get("", response_model=PortfoliosPublic)
def read_portfolios(
    session: SessionDep,
    current_user: CurrentUser,
    account_id: uuid.UUID | None = None,
    include_inactive: bool = False,
) -> PortfoliosPublic:
    statement = select(Portfolio).where(Portfolio.owner_id == current_user.id)
    if account_id is not None:
        _get_owned_account(session, current_user, account_id)
        statement = statement.where(Portfolio.account_id == account_id)
    if not include_inactive:
        statement = statement.where(col(Portfolio.is_active).is_(True))
    rows = session.exec(statement.order_by(col(Portfolio.updated_at).desc())).all()
    return PortfoliosPublic(
        data=[PortfolioPublic.model_validate(row) for row in rows],
        count=len(rows),
    )
