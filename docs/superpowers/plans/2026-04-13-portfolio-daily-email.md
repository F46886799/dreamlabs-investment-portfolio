# Portfolio Daily Email Digest Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a backend-native daily digest pipeline that emails each active user a 90-day total portfolio trend, per-portfolio balance deltas, and top-level portfolio alerts.

**Architecture:** This plan assumes the account/portfolio foundation is already merged, so `Account`, `Portfolio`, and account-scoped positions already exist. The digest feature adds two persistence tables for daily reporting and send auditing, three backend services for reporting/alerts/email rendering, and one CLI-style job entrypoint triggered by external scheduling instead of an in-process scheduler.

**Tech Stack:** FastAPI, SQLModel, Alembic, Pytest, Jinja2, MJML, Python standard library SVG generation, SMTP/email utils

---

## File Structure

### Backend

- Create: `backend/app/services/portfolio_reporting.py` — compute per-day aggregate snapshot rows and 90-day total trend points from account-scoped normalized positions.
- Create: `backend/app/services/portfolio_alerts.py` — translate snapshot + conflict inputs into digest-visible alert payloads.
- Create: `backend/app/services/portfolio_email_digest.py` — render the digest subject, chart asset, and HTML email body.
- Create: `backend/app/jobs/__init__.py` — package marker for job modules.
- Create: `backend/app/jobs/send_daily_portfolio_digest.py` — batch job entrypoint with retry-safe send orchestration.
- Create: `backend/app/email-templates/src/portfolio_daily_digest.mjml` — source MJML digest template.
- Create: `backend/app/email-templates/build/portfolio_daily_digest.html` — exported HTML template consumed by `render_email_template`.
- Create: `backend/app/alembic/versions/20260413_add_portfolio_daily_digest_tables.py` — migration for `portfolio_daily_snapshot` and `portfolio_daily_digest_run`.
- Create: `backend/tests/services/test_portfolio_reporting.py` — reporting snapshot/time-series tests.
- Create: `backend/tests/services/test_portfolio_alerts.py` — alert rule tests.
- Create: `backend/tests/services/test_portfolio_email_digest.py` — template/chart rendering tests.
- Create: `backend/tests/jobs/test_send_daily_portfolio_digest.py` — job orchestration/idempotency tests.
- Modify: `backend/app/models.py` — add persistence models and typed alert/report payloads.
- Modify: `backend/app/core/config.py` — add digest defaults for chart window, timezone name, and drawdown threshold.
- Modify: `backend/tests/conftest.py` — clean up new tables in test teardown.

### Existing Dependencies This Plan Uses

- `backend/app/services/portfolio_pipeline.py` — historical normalized positions and anomaly-count concepts.
- `backend/app/utils.py` — `render_email_template`, `send_email`, and `EmailData`.
- `backend/app/models.py` — assumed to already contain `Account` and `Portfolio` from the foundation work.

---

### Task 1: Persist digest tables and configuration defaults

**Files:**
- Create: `backend/app/alembic/versions/20260413_add_portfolio_daily_digest_tables.py`
- Modify: `backend/app/models.py`
- Modify: `backend/app/core/config.py`
- Modify: `backend/tests/conftest.py`
- Test: `backend/tests/services/test_portfolio_reporting.py`

- [ ] **Step 1: Write the failing persistence test**

```python
from datetime import date

from sqlmodel import Session, select

from app.core.config import settings
from app.models import PortfolioDailyDigestRun, PortfolioDailySnapshot, User


def test_digest_tables_round_trip(db: Session) -> None:
    user = db.exec(select(User).where(User.email == settings.FIRST_SUPERUSER)).one()

    total_snapshot = PortfolioDailySnapshot(
        owner_id=user.id,
        snapshot_date=date(2026, 4, 13),
        portfolio_id=None,
        account_id=None,
        base_currency="USD",
        market_value_usd=125000.0,
        day_change_amount_usd=-2500.0,
        day_change_pct=-0.0196,
        source_snapshot_version="20260413T000000Z",
    )
    digest_run = PortfolioDailyDigestRun(
        owner_id=user.id,
        digest_date=date(2026, 4, 13),
        status="pending",
        recipient_email=user.email,
        total_portfolios=0,
        total_alerts=0,
    )

    db.add(total_snapshot)
    db.add(digest_run)
    db.commit()

    saved_snapshot = db.exec(select(PortfolioDailySnapshot)).one()
    saved_run = db.exec(select(PortfolioDailyDigestRun)).one()

    assert saved_snapshot.market_value_usd == 125000.0
    assert saved_snapshot.portfolio_id is None
    assert saved_run.status == "pending"
    assert saved_run.recipient_email == settings.FIRST_SUPERUSER
```

- [ ] **Step 2: Run the test to verify it fails before the models exist**

Run: `cd backend && pytest tests/services/test_portfolio_reporting.py::test_digest_tables_round_trip -v`

Expected: FAIL with `ImportError` or `AttributeError` for `PortfolioDailySnapshot` / `PortfolioDailyDigestRun`.

- [ ] **Step 3: Add the new SQLModel tables and typed digest payloads**

```python
from datetime import date, datetime
from enum import Enum


class PortfolioDailyDigestRunStatus(str, Enum):
    PENDING = "pending"
    GENERATED = "generated"
    SENT = "sent"
    FAILED = "failed"


class PortfolioDailySnapshot(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    owner_id: uuid.UUID = Field(foreign_key="user.id", nullable=False, ondelete="CASCADE")
    snapshot_date: date = Field(index=True)
    portfolio_id: uuid.UUID | None = Field(default=None, foreign_key="portfolio.id", nullable=True, ondelete="CASCADE")
    account_id: uuid.UUID | None = Field(default=None, foreign_key="account.id", nullable=True, ondelete="CASCADE")
    base_currency: str = Field(default="USD", max_length=8)
    market_value_usd: float
    day_change_amount_usd: float | None = None
    day_change_pct: float | None = None
    source_snapshot_version: str = Field(max_length=64)
    generated_at: datetime = Field(default_factory=get_datetime_utc, sa_type=DateTime(timezone=True))  # type: ignore


class PortfolioDailyDigestRun(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    owner_id: uuid.UUID = Field(foreign_key="user.id", nullable=False, ondelete="CASCADE")
    digest_date: date = Field(index=True)
    status: PortfolioDailyDigestRunStatus = Field(
        default=PortfolioDailyDigestRunStatus.PENDING,
        max_length=32,
    )
    recipient_email: EmailStr = Field(max_length=255)
    total_portfolios: int = 0
    total_alerts: int = 0
    sent_at: datetime | None = Field(default=None, sa_type=DateTime(timezone=True))  # type: ignore
    error_message: str | None = Field(default=None, max_length=1000)
    created_at: datetime = Field(default_factory=get_datetime_utc, sa_type=DateTime(timezone=True))  # type: ignore
    updated_at: datetime = Field(default_factory=get_datetime_utc, sa_type=DateTime(timezone=True))  # type: ignore


class PortfolioDigestAlert(SQLModel):
    kind: str
    severity: str
    title: str
    description: str


class PortfolioTrendPoint(SQLModel):
    snapshot_date: date
    market_value_usd: float
```

- [ ] **Step 4: Add configuration defaults, migration, and test cleanup**

```python
# backend/app/core/config.py
PORTFOLIO_DIGEST_TIMEZONE: str = "UTC"
PORTFOLIO_DIGEST_CHART_DAYS: int = 90
PORTFOLIO_DIGEST_DRAWDOWN_ALERT_PCT: float = -0.05

# backend/tests/conftest.py
from app.models import PortfolioDailyDigestRun, PortfolioDailySnapshot

statement = delete(PortfolioDailyDigestRun)
session.execute(statement)
statement = delete(PortfolioDailySnapshot)
session.execute(statement)

# backend/app/alembic/versions/20260413_add_portfolio_daily_digest_tables.py
op.create_table(
    "portfoliodailysnapshot",
    sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
    sa.Column("owner_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("user.id", ondelete="CASCADE"), nullable=False),
    sa.Column("snapshot_date", sa.Date(), nullable=False),
    sa.Column("portfolio_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("portfolio.id", ondelete="CASCADE"), nullable=True),
    sa.Column("account_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("account.id", ondelete="CASCADE"), nullable=True),
    sa.Column("base_currency", sa.String(length=8), nullable=False),
    sa.Column("market_value_usd", sa.Float(), nullable=False),
    sa.Column("day_change_amount_usd", sa.Float(), nullable=True),
    sa.Column("day_change_pct", sa.Float(), nullable=True),
    sa.Column("source_snapshot_version", sa.String(length=64), nullable=False),
    sa.Column("generated_at", sa.DateTime(timezone=True), nullable=False),
)
op.create_index(
    "ix_portfoliodailysnapshot_owner_date_portfolio",
    "portfoliodailysnapshot",
    ["owner_id", "snapshot_date", "portfolio_id"],
    unique=False,
)
op.create_table(
    "portfoliodailydigestrun",
    sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
    sa.Column("owner_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("user.id", ondelete="CASCADE"), nullable=False),
    sa.Column("digest_date", sa.Date(), nullable=False),
    sa.Column("status", sa.String(length=32), nullable=False),
    sa.Column("recipient_email", sa.String(length=255), nullable=False),
    sa.Column("total_portfolios", sa.Integer(), nullable=False),
    sa.Column("total_alerts", sa.Integer(), nullable=False),
    sa.Column("sent_at", sa.DateTime(timezone=True), nullable=True),
    sa.Column("error_message", sa.String(length=1000), nullable=True),
    sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
)
op.create_index(
    "ix_portfoliodailydigestrun_owner_digest_date",
    "portfoliodailydigestrun",
    ["owner_id", "digest_date"],
    unique=True,
)
```

- [ ] **Step 5: Run the focused test to verify the tables now work**

Run: `cd backend && pytest tests/services/test_portfolio_reporting.py::test_digest_tables_round_trip -v`

Expected: PASS with one saved `PortfolioDailySnapshot` row and one saved `PortfolioDailyDigestRun` row.

- [ ] **Step 6: Commit**

```bash
git add backend/app/models.py backend/app/core/config.py backend/app/alembic/versions/20260413_add_portfolio_daily_digest_tables.py backend/tests/conftest.py backend/tests/services/test_portfolio_reporting.py
git commit -m "feat: add portfolio digest persistence models" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

### Task 2: Implement daily snapshot reporting

**Files:**
- Create: `backend/app/services/portfolio_reporting.py`
- Test: `backend/tests/services/test_portfolio_reporting.py`

- [ ] **Step 1: Write the failing reporting test**

```python
from datetime import date, datetime, timezone
import uuid

from sqlmodel import Session, select

from app.core.config import settings
from app.models import Account, NormalizedPosition, Portfolio, User
from app.services.portfolio_reporting import build_daily_snapshots, list_total_trend_points


def test_build_daily_snapshots_for_total_and_portfolios(db: Session) -> None:
    user = db.exec(select(User).where(User.email == settings.FIRST_SUPERUSER)).one()
    account = Account(owner_id=user.id, name="Main", account_type="brokerage", institution_name="IB", base_currency="USD")
    db.add(account)
    db.flush()
    growth = Portfolio(owner_id=user.id, account_id=account.id, name="Growth", is_active=True)
    db.add(growth)
    db.flush()

    db.add(
        NormalizedPosition(
            owner_id=user.id,
            account_id=account.id,
            raw_position_id=uuid.uuid4(),
            symbol="AAPL",
            asset_class="equity",
            quantity=10,
            market_value_usd=120000.0,
            snapshot_version="20260413T010000Z",
            created_at=datetime(2026, 4, 13, 1, 0, tzinfo=timezone.utc),
        )
    )
    db.add(
        NormalizedPosition(
            owner_id=user.id,
            account_id=account.id,
            raw_position_id=uuid.uuid4(),
            symbol="AAPL",
            asset_class="equity",
            quantity=10,
            market_value_usd=100000.0,
            snapshot_version="20260412T010000Z",
            created_at=datetime(2026, 4, 12, 1, 0, tzinfo=timezone.utc),
        )
    )
    db.commit()

    rows = build_daily_snapshots(db, owner_id=user.id, digest_date=date(2026, 4, 13))
    trend = list_total_trend_points(db, owner_id=user.id, days=90)

    assert len(rows) == 2
    total_row = next(row for row in rows if row.portfolio_id is None)
    portfolio_row = next(row for row in rows if row.portfolio_id == growth.id)
    assert total_row.market_value_usd == 120000.0
    assert total_row.day_change_amount_usd == 20000.0
    assert round(total_row.day_change_pct or 0, 4) == 0.2
    assert portfolio_row.market_value_usd == 120000.0
    assert trend[-1].market_value_usd == 120000.0
```

- [ ] **Step 2: Run the test to verify the service is missing**

Run: `cd backend && pytest tests/services/test_portfolio_reporting.py::test_build_daily_snapshots_for_total_and_portfolios -v`

Expected: FAIL with `ModuleNotFoundError` for `app.services.portfolio_reporting` or missing function imports.

- [ ] **Step 3: Implement snapshot selection and daily snapshot upsert**

```python
from collections import defaultdict
from datetime import date, datetime, time, timedelta, timezone
from uuid import UUID

from sqlmodel import Session, select

from app.models import NormalizedPosition, Portfolio, PortfolioDailySnapshot, PortfolioTrendPoint


def _load_previous_snapshot_map(
    session: Session,
    *,
    owner_id: UUID,
    digest_date: date,
) -> dict[UUID | None, float]:
    previous_date = digest_date - timedelta(days=1)
    rows = session.exec(
        select(PortfolioDailySnapshot).where(
            PortfolioDailySnapshot.owner_id == owner_id,
            PortfolioDailySnapshot.snapshot_date == previous_date,
        )
    ).all()
    return {row.portfolio_id: row.market_value_usd for row in rows}


def _upsert_snapshot(
    session: Session,
    *,
    owner_id: UUID,
    digest_date: date,
    portfolio_id: UUID | None,
    account_id: UUID | None,
    market_value_usd: float,
    previous_value: float | None,
    snapshot_version: str,
) -> PortfolioDailySnapshot:
    row = session.exec(
        select(PortfolioDailySnapshot).where(
            PortfolioDailySnapshot.owner_id == owner_id,
            PortfolioDailySnapshot.snapshot_date == digest_date,
            PortfolioDailySnapshot.portfolio_id == portfolio_id,
        )
    ).one_or_none()
    if row is None:
        row = PortfolioDailySnapshot(
            owner_id=owner_id,
            snapshot_date=digest_date,
            portfolio_id=portfolio_id,
            account_id=account_id,
        )
    row.base_currency = "USD"
    row.market_value_usd = market_value_usd
    row.day_change_amount_usd = None if previous_value is None else market_value_usd - previous_value
    row.day_change_pct = None if previous_value in (None, 0) else (market_value_usd - previous_value) / previous_value
    row.source_snapshot_version = snapshot_version
    row.generated_at = get_datetime_utc()
    session.add(row)
    session.flush()
    return row


def build_daily_snapshots(
    session: Session,
    *,
    owner_id: UUID,
    digest_date: date,
) -> list[PortfolioDailySnapshot]:
    start = datetime.combine(digest_date, time.min, tzinfo=timezone.utc)
    end = start + timedelta(days=1)
    rows = session.exec(
        select(NormalizedPosition)
        .where(
            NormalizedPosition.owner_id == owner_id,
            NormalizedPosition.created_at >= start,
            NormalizedPosition.created_at < end,
            NormalizedPosition.normalization_status == "normalized",
        )
        .order_by(NormalizedPosition.created_at.desc())
    ).all()
    if not rows:
        return []

    latest_snapshot_version = rows[0].snapshot_version
    latest_rows = [row for row in rows if row.snapshot_version == latest_snapshot_version]
    portfolios = session.exec(
        select(Portfolio).where(Portfolio.owner_id == owner_id, Portfolio.is_active.is_(True))
    ).all()
    positions_by_account: dict[UUID, list[NormalizedPosition]] = defaultdict(list)
    for row in latest_rows:
        positions_by_account[row.account_id].append(row)

    previous_by_portfolio = _load_previous_snapshot_map(session, owner_id=owner_id, digest_date=digest_date)
    upserted_rows: list[PortfolioDailySnapshot] = []
    total_value = 0.0
    for portfolio in portfolios:
        current_value = sum(position.market_value_usd for position in positions_by_account.get(portfolio.account_id, []))
        if current_value == 0:
            continue
        previous_value = previous_by_portfolio.get(portfolio.id)
        row = _upsert_snapshot(
            session,
            owner_id=owner_id,
            digest_date=digest_date,
            portfolio_id=portfolio.id,
            account_id=portfolio.account_id,
            market_value_usd=current_value,
            previous_value=previous_value,
            snapshot_version=latest_snapshot_version,
        )
        upserted_rows.append(row)
        total_value += current_value

    total_row = _upsert_snapshot(
        session,
        owner_id=owner_id,
        digest_date=digest_date,
        portfolio_id=None,
        account_id=None,
        market_value_usd=total_value,
        previous_value=previous_by_portfolio.get(None),
        snapshot_version=latest_snapshot_version,
    )
    session.commit()
    return [total_row, *upserted_rows]
```

- [ ] **Step 4: Implement the 90-day total trend query**

```python
def list_total_trend_points(
    session: Session,
    *,
    owner_id: UUID,
    days: int,
) -> list[PortfolioTrendPoint]:
    rows = session.exec(
        select(PortfolioDailySnapshot)
        .where(
            PortfolioDailySnapshot.owner_id == owner_id,
            PortfolioDailySnapshot.portfolio_id.is_(None),
        )
        .order_by(PortfolioDailySnapshot.snapshot_date.asc())
    ).all()
    trimmed = rows[-days:]
    return [
        PortfolioTrendPoint(
            snapshot_date=row.snapshot_date,
            market_value_usd=row.market_value_usd,
        )
        for row in trimmed
    ]
```

- [ ] **Step 5: Run the focused reporting tests**

Run: `cd backend && pytest tests/services/test_portfolio_reporting.py -v`

Expected: PASS with daily total rows, per-portfolio rows, and 90-day trend points derived from persisted snapshots.

- [ ] **Step 6: Commit**

```bash
git add backend/app/services/portfolio_reporting.py backend/tests/services/test_portfolio_reporting.py
git commit -m "feat: add portfolio digest reporting service" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

### Task 3: Implement digest alert evaluation

**Files:**
- Create: `backend/app/services/portfolio_alerts.py`
- Test: `backend/tests/services/test_portfolio_alerts.py`

- [ ] **Step 1: Write the failing alert tests**

```python
from datetime import date
import uuid

from app.models import PortfolioDailySnapshot
from app.services.portfolio_alerts import build_digest_alerts


def test_build_digest_alerts_emits_conflict_and_drawdown_warnings() -> None:
    total_snapshot = PortfolioDailySnapshot(
        owner_id=uuid.uuid4(),
        snapshot_date=date(2026, 4, 13),
        portfolio_id=None,
        account_id=None,
        base_currency="USD",
        market_value_usd=95000.0,
        day_change_amount_usd=-6000.0,
        day_change_pct=-0.0594,
        source_snapshot_version="20260413T010000Z",
    )

    alerts = build_digest_alerts(
        total_snapshot=total_snapshot,
        has_current_day_snapshot=True,
        pending_conflict_count=2,
        drawdown_threshold_pct=-0.05,
    )

    assert [alert.kind for alert in alerts] == ["normalization_conflict", "drawdown"]
    assert alerts[1].severity == "critical"


def test_build_digest_alerts_emits_stale_when_no_current_snapshot() -> None:
    alerts = build_digest_alerts(
        total_snapshot=None,
        has_current_day_snapshot=False,
        pending_conflict_count=0,
        drawdown_threshold_pct=-0.05,
    )

    assert [alert.kind for alert in alerts] == ["stale"]
```

- [ ] **Step 2: Run the tests to verify the module is missing**

Run: `cd backend && pytest tests/services/test_portfolio_alerts.py -v`

Expected: FAIL with `ModuleNotFoundError` for `app.services.portfolio_alerts`.

- [ ] **Step 3: Implement deterministic alert generation**

```python
from app.models import PortfolioDailySnapshot, PortfolioDigestAlert


def build_digest_alerts(
    *,
    total_snapshot: PortfolioDailySnapshot | None,
    has_current_day_snapshot: bool,
    pending_conflict_count: int,
    drawdown_threshold_pct: float,
) -> list[PortfolioDigestAlert]:
    alerts: list[PortfolioDigestAlert] = []
    if not has_current_day_snapshot:
        alerts.append(
            PortfolioDigestAlert(
                kind="stale",
                severity="warning",
                title="今日未获得最新持仓快照",
                description="以下资产组合数据可能不是最新，请检查同步任务。",
            )
        )
    if pending_conflict_count > 0:
        alerts.append(
            PortfolioDigestAlert(
                kind="normalization_conflict",
                severity="warning",
                title="存在待处理标准化冲突",
                description=f"检测到 {pending_conflict_count} 条待处理冲突，部分资产可能未完整计入统计。",
            )
        )
    if (
        total_snapshot is not None
        and total_snapshot.day_change_pct is not None
        and total_snapshot.day_change_pct <= drawdown_threshold_pct
    ):
        alerts.append(
            PortfolioDigestAlert(
                kind="drawdown",
                severity="critical",
                title="总体资产组合触发跌幅预警",
                description=f"总体资产组合较上一日下降 {total_snapshot.day_change_pct:.2%}，已达到预警阈值。",
            )
        )
    return alerts
```

- [ ] **Step 4: Run the alert tests again**

Run: `cd backend && pytest tests/services/test_portfolio_alerts.py -v`

Expected: PASS with stable alert ordering and correct warning/critical severities.

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/portfolio_alerts.py backend/tests/services/test_portfolio_alerts.py
git commit -m "feat: add portfolio digest alert rules" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

### Task 4: Render the digest email and chart asset

**Files:**
- Create: `backend/app/services/portfolio_email_digest.py`
- Create: `backend/app/email-templates/src/portfolio_daily_digest.mjml`
- Create: `backend/app/email-templates/build/portfolio_daily_digest.html`
- Test: `backend/tests/services/test_portfolio_email_digest.py`

- [ ] **Step 1: Write the failing email rendering test**

```python
from datetime import date

from app.models import PortfolioDigestAlert, PortfolioTrendPoint
from app.services.portfolio_email_digest import generate_portfolio_daily_digest_email


def test_generate_portfolio_daily_digest_email_renders_chart_totals_and_alerts() -> None:
    email = generate_portfolio_daily_digest_email(
        project_name="DreamLabs",
        digest_date=date(2026, 4, 13),
        email_to="investor@example.com",
        total_market_value_usd=125000.0,
        total_day_change_amount_usd=-2500.0,
        total_day_change_pct=-0.0196,
        trend_points=[
            PortfolioTrendPoint(snapshot_date=date(2026, 4, 12), market_value_usd=127500.0),
            PortfolioTrendPoint(snapshot_date=date(2026, 4, 13), market_value_usd=125000.0),
        ],
        portfolio_rows=[
            {
                "name": "Growth",
                "market_value_usd": 125000.0,
                "day_change_amount_usd": -2500.0,
                "day_change_pct": -0.0196,
            }
        ],
        alerts=[
            PortfolioDigestAlert(
                kind="drawdown",
                severity="critical",
                title="总体资产组合触发跌幅预警",
                description="总体资产组合较上一日下降 1.96%。",
            )
        ],
    )

    assert email.subject == "DreamLabs - 每日资产组合简报 (2026-04-13)"
    assert "总体资产组合（近 90 天）" in email.html_content
    assert "Growth" in email.html_content
    assert "总体资产组合触发跌幅预警" in email.html_content
    assert "<svg" in email.html_content
```

- [ ] **Step 2: Run the test to verify the renderer does not exist yet**

Run: `cd backend && pytest tests/services/test_portfolio_email_digest.py::test_generate_portfolio_daily_digest_email_renders_chart_totals_and_alerts -v`

Expected: FAIL with `ModuleNotFoundError` for `app.services.portfolio_email_digest`.

- [ ] **Step 3: Add the digest MJML/HTML template**

```mjml
<mjml>
  <mj-body background-color="#fafbfc">
    <mj-section background-color="#ffffff" padding="24px">
      <mj-column>
        <mj-text font-size="20px" font-family="Arial, Helvetica, sans-serif">
          {{ project_name }} - 每日资产组合简报
        </mj-text>
        <mj-text font-size="14px">日期：{{ digest_date }}</mj-text>
        <mj-text font-size="16px">总资产：{{ total_market_value_label }}</mj-text>
        <mj-text font-size="16px">较昨日：{{ total_day_change_label }}</mj-text>
        {% for alert in alerts %}
        <mj-text color="{{ alert.color }}">{{ alert.title }}：{{ alert.description }}</mj-text>
        {% endfor %}
        <mj-text font-size="18px">总体资产组合（近 90 天）</mj-text>
        <mj-raw>{{ chart_svg | safe }}</mj-raw>
        <mj-table>
          <tr>
            <th align="left">Portfolio</th>
            <th align="right">今日余额</th>
            <th align="right">较昨日变化</th>
            <th align="right">变化率</th>
          </tr>
          {% for row in portfolio_rows %}
          <tr>
            <td>{{ row.name }}</td>
            <td align="right">{{ row.market_value_label }}</td>
            <td align="right">{{ row.day_change_label }}</td>
            <td align="right">{{ row.day_change_pct_label }}</td>
          </tr>
          {% endfor %}
        </mj-table>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>
```

- [ ] **Step 4: Implement chart rendering and email payload assembly**

```python
from app.utils import EmailData, render_email_template


def generate_portfolio_daily_digest_email(
    *,
    project_name: str,
    digest_date: date,
    email_to: str,
    total_market_value_usd: float,
    total_day_change_amount_usd: float | None,
    total_day_change_pct: float | None,
    trend_points: list[PortfolioTrendPoint],
    portfolio_rows: list[dict[str, object]],
    alerts: list[PortfolioDigestAlert],
) -> EmailData:
    subject = f"{project_name} - 每日资产组合简报 ({digest_date.isoformat()})"
    html_content = render_email_template(
        template_name="portfolio_daily_digest.html",
        context={
            "project_name": project_name,
            "digest_date": digest_date.isoformat(),
            "total_market_value_label": _format_currency(total_market_value_usd),
            "total_day_change_label": _format_change(total_day_change_amount_usd),
            "chart_svg": render_trend_chart_svg(trend_points),
            "portfolio_rows": [_format_portfolio_row(row) for row in portfolio_rows],
            "alerts": [_format_alert(alert) for alert in alerts],
        },
    )
    return EmailData(subject=subject, html_content=html_content)


def render_trend_chart_svg(points: list[PortfolioTrendPoint]) -> str:
    width = 520
    height = 180
    values = [point.market_value_usd for point in points] or [0.0]
    minimum = min(values)
    maximum = max(values)
    spread = maximum - minimum or 1.0
    coordinates = []
    for index, point in enumerate(points):
        x = 20 + (index * (width - 40) / max(len(points) - 1, 1))
        y = height - 20 - ((point.market_value_usd - minimum) / spread * (height - 40))
        coordinates.append(f"{x:.1f},{y:.1f}")
    polyline = " ".join(coordinates)
    return (
        f'<svg viewBox="0 0 {width} {height}" xmlns="http://www.w3.org/2000/svg">'
        f'<polyline fill="none" stroke="#009688" stroke-width="3" points="{polyline}" />'
        "</svg>"
    )
```

- [ ] **Step 5: Export the MJML file to `build/portfolio_daily_digest.html`**

Run: Open `backend/app/email-templates/src/portfolio_daily_digest.mjml` in VS Code and run `MJML: Export to HTML`, then save the generated output to `backend/app/email-templates/build/portfolio_daily_digest.html`.

Expected: `backend/app/email-templates/build/portfolio_daily_digest.html` contains the compiled HTML version of the digest template with Jinja placeholders preserved.

- [ ] **Step 6: Run the email rendering tests**

Run: `cd backend && pytest tests/services/test_portfolio_email_digest.py -v`

Expected: PASS with HTML output containing the chart SVG, summary totals, alert content, and per-portfolio table rows.

- [ ] **Step 7: Commit**

```bash
git add backend/app/services/portfolio_email_digest.py backend/app/email-templates/src/portfolio_daily_digest.mjml backend/app/email-templates/build/portfolio_daily_digest.html backend/tests/services/test_portfolio_email_digest.py
git commit -m "feat: add portfolio digest email renderer" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

### Task 5: Orchestrate the daily send job

**Files:**
- Create: `backend/app/jobs/__init__.py`
- Create: `backend/app/jobs/send_daily_portfolio_digest.py`
- Test: `backend/tests/jobs/test_send_daily_portfolio_digest.py`

- [ ] **Step 1: Write the failing orchestration test**

```python
from datetime import date
import pytest

from sqlmodel import Session, select

from app.models import (
    PortfolioDailyDigestRun,
    PortfolioDailyDigestRunStatus,
    PortfolioDigestAlert,
    PortfolioDailySnapshot,
    PortfolioTrendPoint,
    User,
)
from app.jobs.send_daily_portfolio_digest import run_daily_portfolio_digest_job
from app.utils import EmailData


def test_run_daily_portfolio_digest_job_marks_sent_once(db: Session, monkeypatch: pytest.MonkeyPatch) -> None:
    sent_messages: list[tuple[str, str]] = []

    def fake_send_email(*, email_to: str, subject: str, html_content: str) -> None:
        sent_messages.append((email_to, subject))

    monkeypatch.setattr("app.jobs.send_daily_portfolio_digest.send_email", fake_send_email)
    monkeypatch.setattr(
        "app.jobs.send_daily_portfolio_digest.build_daily_snapshots",
        lambda session, owner_id, digest_date: [
            PortfolioDailySnapshot(
                owner_id=owner_id,
                snapshot_date=digest_date,
                portfolio_id=None,
                account_id=None,
                base_currency="USD",
                market_value_usd=125000.0,
                day_change_amount_usd=-2500.0,
                day_change_pct=-0.0196,
                source_snapshot_version="20260413T010000Z",
            )
        ],
    )
    monkeypatch.setattr(
        "app.jobs.send_daily_portfolio_digest.list_total_trend_points",
        lambda session, owner_id, days: [
            PortfolioTrendPoint(snapshot_date=date(2026, 4, 13), market_value_usd=125000.0)
        ],
    )
    monkeypatch.setattr(
        "app.jobs.send_daily_portfolio_digest.build_digest_alerts",
        lambda **kwargs: [
            PortfolioDigestAlert(
                kind="drawdown",
                severity="critical",
                title="总体资产组合触发跌幅预警",
                description="总体资产组合较上一日下降 1.96%。",
            )
        ],
    )
    monkeypatch.setattr(
        "app.jobs.send_daily_portfolio_digest.generate_portfolio_daily_digest_email",
        lambda **kwargs: EmailData(
            subject="DreamLabs - 每日资产组合简报 (2026-04-13)",
            html_content="<html>digest</html>",
        ),
    )

    summary = run_daily_portfolio_digest_job(db, digest_date=date(2026, 4, 13))
    rerun = run_daily_portfolio_digest_job(db, digest_date=date(2026, 4, 13))

    run = db.exec(select(PortfolioDailyDigestRun)).one()
    assert summary["sent"] == 1
    assert rerun["skipped"] == 1
    assert len(sent_messages) == 1
    assert run.status == PortfolioDailyDigestRunStatus.SENT
```

- [ ] **Step 2: Run the test to verify the job entrypoint is missing**

Run: `cd backend && pytest tests/jobs/test_send_daily_portfolio_digest.py::test_run_daily_portfolio_digest_job_marks_sent_once -v`

Expected: FAIL with `ModuleNotFoundError` for `app.jobs.send_daily_portfolio_digest`.

- [ ] **Step 3: Implement the retry-safe batch job**

```python
from datetime import date
from zoneinfo import ZoneInfo

from sqlmodel import Session, select

from app.core.config import settings
from app.models import Portfolio, PortfolioDailyDigestRun, PortfolioDailyDigestRunStatus, User, get_datetime_utc
from app.services.portfolio_alerts import build_digest_alerts
from app.services.portfolio_email_digest import generate_portfolio_daily_digest_email
from app.services.portfolio_reporting import build_daily_snapshots, list_total_trend_points
from app.services.portfolio_pipeline import get_anomaly_count
from app.utils import send_email


def run_daily_portfolio_digest_job(session: Session, *, digest_date: date) -> dict[str, int]:
    users = session.exec(select(User).where(User.is_active.is_(True))).all()
    summary = {"sent": 0, "failed": 0, "skipped": 0}
    for user in users:
        portfolio_lookup = {
            portfolio.id: portfolio
            for portfolio in session.exec(
                select(Portfolio).where(
                    Portfolio.owner_id == user.id,
                    Portfolio.is_active.is_(True),
                )
            ).all()
        }
        existing_run = session.exec(
            select(PortfolioDailyDigestRun).where(
                PortfolioDailyDigestRun.owner_id == user.id,
                PortfolioDailyDigestRun.digest_date == digest_date,
            )
        ).one_or_none()
        if existing_run and existing_run.status == PortfolioDailyDigestRunStatus.SENT:
            summary["skipped"] += 1
            continue

        run = existing_run or PortfolioDailyDigestRun(
            owner_id=user.id,
            digest_date=digest_date,
            recipient_email=user.email,
        )
        session.add(run)
        session.commit()
        try:
            snapshot_rows = build_daily_snapshots(session, owner_id=user.id, digest_date=digest_date)
            total_row = next((row for row in snapshot_rows if row.portfolio_id is None), None)
            alerts = build_digest_alerts(
                total_snapshot=total_row,
                has_current_day_snapshot=total_row is not None,
                pending_conflict_count=get_anomaly_count(session, owner_id=user.id),
                drawdown_threshold_pct=settings.PORTFOLIO_DIGEST_DRAWDOWN_ALERT_PCT,
            )
            email = generate_portfolio_daily_digest_email(
                project_name=settings.PROJECT_NAME,
                digest_date=digest_date,
                email_to=user.email,
                total_market_value_usd=total_row.market_value_usd if total_row else 0.0,
                total_day_change_amount_usd=total_row.day_change_amount_usd if total_row else None,
                total_day_change_pct=total_row.day_change_pct if total_row else None,
                trend_points=list_total_trend_points(
                    session,
                    owner_id=user.id,
                    days=settings.PORTFOLIO_DIGEST_CHART_DAYS,
                ),
                portfolio_rows=[
                    {
                        "name": portfolio_lookup[row.portfolio_id].name,
                        "market_value_usd": row.market_value_usd,
                        "day_change_amount_usd": row.day_change_amount_usd,
                        "day_change_pct": row.day_change_pct,
                    }
                    for row in snapshot_rows
                    if row.portfolio_id is not None and row.portfolio_id in portfolio_lookup
                ],
                alerts=alerts,
            )
            send_email(
                email_to=user.email,
                subject=email.subject,
                html_content=email.html_content,
            )
            run.status = PortfolioDailyDigestRunStatus.SENT
            run.total_portfolios = len([row for row in snapshot_rows if row.portfolio_id is not None])
            run.total_alerts = len(alerts)
            run.sent_at = get_datetime_utc()
            run.error_message = None
            summary["sent"] += 1
        except Exception as exc:
            run.status = PortfolioDailyDigestRunStatus.FAILED
            run.error_message = str(exc)
            summary["failed"] += 1
        run.updated_at = get_datetime_utc()
        session.add(run)
        session.commit()
    return summary
```

- [ ] **Step 4: Add the CLI entrypoint**

```python
from datetime import datetime

from sqlmodel import Session

from app.core.config import settings
from app.core.db import engine


def main() -> None:
    digest_date = datetime.now(ZoneInfo(settings.PORTFOLIO_DIGEST_TIMEZONE)).date()
    with Session(engine) as session:
        summary = run_daily_portfolio_digest_job(session, digest_date=digest_date)
    print(summary)


if __name__ == "__main__":
    main()
```

- [ ] **Step 5: Run the focused job tests**

Run: `cd backend && pytest tests/jobs/test_send_daily_portfolio_digest.py -v`

Expected: PASS with one send on the first run, one skip on the second run, and persisted `PortfolioDailyDigestRun` state transitions.

- [ ] **Step 6: Run the full backend test suite**

Run: `cd backend && bash ./scripts/test.sh`

Expected: PASS with existing backend tests plus the new reporting, alerts, email, and job tests.

- [ ] **Step 7: Commit**

```bash
git add backend/app/jobs/__init__.py backend/app/jobs/send_daily_portfolio_digest.py backend/tests/jobs/test_send_daily_portfolio_digest.py
git commit -m "feat: add portfolio daily digest job" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```
