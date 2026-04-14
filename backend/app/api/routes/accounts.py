import uuid

from fastapi import APIRouter, HTTPException
from sqlmodel import col, select

from app.api.deps import CurrentUser, SessionDep
from app.models import (
    Account,
    AccountCreate,
    AccountPublic,
    AccountsPublic,
    AccountUpdate,
    get_datetime_utc,
)

router = APIRouter(prefix="/accounts", tags=["accounts"])


def _get_owned_account(
    session: SessionDep, current_user: CurrentUser, account_id: uuid.UUID
) -> Account:
    account = session.get(Account, account_id)
    if not account or account.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Account not found")
    return account


@router.post("", response_model=AccountPublic)
def create_account(
    session: SessionDep, current_user: CurrentUser, account_in: AccountCreate
) -> AccountPublic:
    account = Account(owner_id=current_user.id, **account_in.model_dump())
    session.add(account)
    session.commit()
    session.refresh(account)
    return AccountPublic.model_validate(account)


@router.put("/{account_id}", response_model=AccountPublic)
def update_account(
    session: SessionDep,
    current_user: CurrentUser,
    account_id: uuid.UUID,
    account_in: AccountUpdate,
) -> AccountPublic:
    account = _get_owned_account(session, current_user, account_id)
    update_data = account_in.model_dump(exclude_unset=True)
    account.sqlmodel_update({**update_data, "updated_at": get_datetime_utc()})
    session.add(account)
    session.commit()
    session.refresh(account)
    return AccountPublic.model_validate(account)


@router.get("", response_model=AccountsPublic)
def read_accounts(
    session: SessionDep,
    current_user: CurrentUser,
    include_inactive: bool = False,
) -> AccountsPublic:
    statement = select(Account).where(Account.owner_id == current_user.id)
    if not include_inactive:
        statement = statement.where(col(Account.is_active).is_(True))
    rows = session.exec(statement.order_by(col(Account.updated_at).desc())).all()
    return AccountsPublic(
        data=[AccountPublic.model_validate(row) for row in rows],
        count=len(rows),
    )
