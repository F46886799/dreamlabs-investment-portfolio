from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.pool import StaticPool
from sqlmodel import SQLModel, Session, create_engine, delete

import app.api.deps as api_deps
import app.core.db as db_module
from app.core.config import settings
from app.main import app
from app.models import AuditEvent, Item, NormalizationConflict, NormalizedPosition, RawPosition, User
from tests.utils.user import authentication_token_from_email
from tests.utils.utils import get_superuser_token_headers


@pytest.fixture(scope="session", autouse=True)
def test_db_engine() -> Generator[None, None, None]:
    test_engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    db_module.engine = test_engine
    api_deps.engine = test_engine
    SQLModel.metadata.create_all(test_engine)
    yield
    SQLModel.metadata.drop_all(test_engine)


@pytest.fixture(scope="session", autouse=True)
def db(test_db_engine: None) -> Generator[Session, None, None]:
    with Session(db_module.engine) as session:
        db_module.init_db(session)
        yield session
        statement = delete(AuditEvent)
        session.execute(statement)
        statement = delete(NormalizationConflict)
        session.execute(statement)
        statement = delete(NormalizedPosition)
        session.execute(statement)
        statement = delete(RawPosition)
        session.execute(statement)
        statement = delete(Item)
        session.execute(statement)
        statement = delete(User)
        session.execute(statement)
        session.commit()


@pytest.fixture(scope="module")
def client() -> Generator[TestClient, None, None]:
    with TestClient(app) as c:
        yield c


@pytest.fixture(scope="module")
def superuser_token_headers(client: TestClient) -> dict[str, str]:
    return get_superuser_token_headers(client)


@pytest.fixture(scope="module")
def normal_user_token_headers(client: TestClient, db: Session) -> dict[str, str]:
    return authentication_token_from_email(
        client=client, email=settings.EMAIL_TEST_USER, db=db
    )
