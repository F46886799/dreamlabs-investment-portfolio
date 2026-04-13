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
)

router = APIRouter(prefix="/portfolios", tags=["portfolios"])


def _get_owned_account(
    session: SessionDep, current_user: CurrentUser, account_id: uuid.UUID
) -> Account:
    account = session.get(Account, account_id)
    if not account or account.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Account not found")
    return account


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


@router.get("", response_model=PortfoliosPublic)
def read_portfolios(
    session: SessionDep,
    current_user: CurrentUser,
    include_inactive: bool = False,
) -> PortfoliosPublic:
    statement = select(Portfolio).where(Portfolio.owner_id == current_user.id)
    if not include_inactive:
        statement = statement.where(col(Portfolio.is_active).is_(True))
    rows = session.exec(statement.order_by(col(Portfolio.updated_at).desc())).all()
    return PortfoliosPublic(
        data=[PortfolioPublic.model_validate(row) for row in rows],
        count=len(rows),
    )
