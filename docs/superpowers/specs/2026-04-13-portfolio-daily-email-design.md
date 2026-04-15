# Portfolio Daily Email Digest Design

## Goal

Add a daily portfolio email digest so each active user receives one email to their login address containing a 90-day total portfolio trend chart, a per-portfolio balance summary with day-over-day change, and top-level portfolio alerts.

## Current State

- The backend already supports outbound email through SMTP and renders HTML templates from `backend/app/email-templates/build/`.
- The product already has unified portfolio aggregation, health-report metrics, and visible stale/conflict concepts.
- `NormalizedPosition` rows retain historical `snapshot_version` values, so historical portfolio snapshots are not overwrite-only.
- The repository does not yet include a scheduler, a daily digest job, or persisted daily digest tracking.
- The repository's account/portfolio foundation is being designed separately and is assumed to exist before this email feature is implemented.

## Product Decisions

### Confirmed Scope

1. Send one daily digest email to each active user's login email.
2. Use one system-wide timezone and one fixed daily send time.
3. Include a 90-day total portfolio trend chart in the email.
4. Include one row per active `Portfolio` showing current balance and day-over-day change.
5. Include top-level alerts for stale data, pending normalization conflicts, and total portfolio daily drawdown at or below `-5%`.
6. Generate email content in the backend without depending on frontend page rendering or screenshots.
7. Use the existing MJML-to-HTML email template workflow.
8. Record digest generation and send results persistently for auditability and retries.

### Deferred Scope

- User-configurable recipients.
- User-specific timezones or per-user send schedules.
- User-configurable alert thresholds.
- Portfolio-level drawdown alerts.
- Security-level holding detail in the digest email.
- In-app digest history UI.
- Queue infrastructure such as Celery or Redis for v1.

## System Boundary

The daily digest is a backend-native reporting pipeline that consumes the existing portfolio domain and emits one email per user per business day.

### Responsibilities

- `portfolio` APIs remain responsible for interactive dashboard use cases.
- New reporting services compute daily portfolio aggregates and time series for offline reporting.
- New alert services compute digest-visible warning and critical states.
- New email digest services render one HTML email from a stable reporting payload.
- A new job entrypoint runs the batch once per day when triggered by external scheduling.

### Explicit Non-Goals

- The web application process does not own the scheduler in v1.
- The digest pipeline does not call frontend routes or render browser screenshots.
- The digest pipeline does not silently degrade into partial emails when critical data generation steps fail.

## Data Flow

### Daily Run Flow

1. External scheduling triggers a command such as `python -m app.jobs.send_daily_portfolio_digest`.
2. The job derives the current `digest_date` using the system-configured timezone.
3. The job loads the active users eligible for digest delivery.
4. For each user, the job resolves all active `Portfolio` records visible to that user.
5. Reporting services compute:
   - overall total portfolio value for `digest_date`
   - previous-day comparison values
   - one row per active portfolio
   - the last 90 available daily total points for the chart
6. Alert services evaluate stale data, pending conflicts, and total daily drawdown threshold rules.
7. Email services render the MJML-backed HTML digest and call the existing `send_email`.
8. Digest run status is persisted as `sent` or `failed` with explicit error details.

### Dependency on Portfolio Foundation

This design assumes the account/portfolio foundation exists before implementation:

- active `Portfolio` entities can be listed for a user
- each `Portfolio` can resolve to an account-backed holdings scope
- holdings snapshots can be aggregated for a resolved scope and business date

The email feature should consume those services directly rather than reconstructing portfolio scope from API-layer code.

## Domain Model

### PortfolioDailySnapshot

`PortfolioDailySnapshot` stores the digest business-day aggregate used for the email body and chart.

**Fields**

- `id: UUID`
- `owner_id: UUID`
- `snapshot_date: date`
- `portfolio_id: UUID | None`
- `account_id: UUID | None`
- `base_currency: str`
- `market_value_usd: float`
- `day_change_amount_usd: float | None`
- `day_change_pct: float | None`
- `source_snapshot_version: str`
- `generated_at: datetime`

**Rules**

- `portfolio_id = null` represents the overall portfolio total row for the user.
- Non-null `portfolio_id` rows represent one active managed portfolio each.
- `base_currency` is fixed to `USD` in v1, even if future account settings support other base currencies.
- `day_change_*` values remain `null` when no previous-day snapshot exists.
- Recommended uniqueness: `(owner_id, snapshot_date, portfolio_id)` using a practical null-safe implementation.
- Re-running the job for the same day should upsert this table instead of creating duplicate rows.

### PortfolioDailyDigestRun

`PortfolioDailyDigestRun` records digest generation and send outcomes.

**Fields**

- `id: UUID`
- `owner_id: UUID`
- `digest_date: date`
- `status: str`
- `recipient_email: str`
- `total_portfolios: int`
- `total_alerts: int`
- `sent_at: datetime | None`
- `error_message: str | None`
- `created_at: datetime`
- `updated_at: datetime`

**Rules**

- `status` is restricted in v1 to `pending`, `generated`, `sent`, or `failed`.
- One logical run exists per `(owner_id, digest_date)`.
- A previously `sent` run is skipped by default on repeat execution.
- A previously `failed` run may be retried by updating the same logical run.
- Error messages must be explicit enough for operators and tests to distinguish data-generation failures from SMTP failures.

## Reporting Model

### Daily Snapshot Strategy

The digest pipeline should not recompute the final sent values by scanning 90 days of `NormalizedPosition` rows every time an email is rendered.

Instead:

1. `NormalizedPosition.snapshot_version` history remains the source of truth for holdings snapshots.
2. Reporting services derive a single daily aggregate per scope and persist it into `PortfolioDailySnapshot`.
3. The email uses `PortfolioDailySnapshot` as its source for:
   - the total trend chart
   - current total summary
   - per-portfolio balance rows
   - previous-day comparisons

This keeps the email reproducible and prevents later reruns from drifting if portfolio aggregation logic evolves.

### Previous-Day Comparison Rule

- Compare `snapshot_date = D` against `snapshot_date = D - 1` for the same scope.
- If `D - 1` is missing, show `--` in the email rather than pretending the change is zero.

### Historical Backfill

The design should support a one-time backfill job that derives historical `PortfolioDailySnapshot` rows from retained `snapshot_version` history.

However, v1 does not require a full 90-day backfill at launch. If fewer than 90 daily rows exist, the chart should show the available range and the email should say so.

## Alert Rules

### Stale Data Alert

**Condition**

- No usable snapshot exists for the user's total scope on `digest_date`, or
- the latest available snapshot used by reporting does not belong to `digest_date`

**Severity**

- `warning`

**Meaning**

- The digest may contain non-current portfolio values.

### Normalization Conflict Alert

**Condition**

- One or more `NormalizationConflict` rows remain `status = "pending"` for the user at digest time.

**Severity**

- `warning`

**Meaning**

- Some holdings may be excluded from complete reporting totals.

### Total Daily Drawdown Alert

**Condition**

- The overall total snapshot row for `digest_date` has `day_change_pct <= -5%`

**Severity**

- `critical`

**Meaning**

- The user's overall portfolio dropped by at least the agreed threshold from the previous day.

### Alert Presentation Rules

- Alerts appear near the top of the email, before the detailed sections.
- Multiple alerts may appear together.
- If no alerts are active, the email explicitly says there are no new alerts today.

## Email Design

### Subject

- `{PROJECT_NAME} - 每日资产组合简报 ({digest_date})`

The subject remains stable in v1 and does not embed alert severity.

### Body Structure

#### Top Summary

- digest date
- overall current total market value
- overall day change amount
- overall day change percentage

#### Alerts Section

- zero or more alert cards/messages based on the rules above

#### Section 1: Overall Total Trend Chart

- title: `总体资产组合（近 90 天）`
- a static chart image suitable for email clients
- summary numbers below the chart for today's value and day-over-day movement
- if less than 90 days exist, note the available-day count

#### Section 2: Per-Portfolio Balance Summary

Recommended columns:

- portfolio name
- current balance in USD
- day change amount
- day change percentage

**Rules**

- sort descending by current balance
- only include active portfolios in the main table
- show `--` for day-over-day values when no previous-day snapshot exists
- if a portfolio cannot produce a valid current-day row, exclude it from the main table and surface the problem through alerts/logging rather than fabricating a row

#### Section 3: Footer

- explanation that values are daily digest summaries
- no product deep-link is required in v1

### Rendering Strategy

- Add `portfolio_daily_digest.mjml` under `backend/app/email-templates/src/`
- Export it to `backend/app/email-templates/build/portfolio_daily_digest.html`
- Reuse the existing Jinja-based rendering flow in `app.utils`

### Chart Format

- Implement chart rendering behind a backend interface that can emit static email-safe assets.
- Use SVG as the preferred output and keep a PNG fallback path available for client-compatibility cases.
- Keep chart styling visually consistent with the product's neutral primary palette rather than using aggressive red/green-heavy rendering.

## Job Orchestration

### Scheduling Model

Use external scheduling to invoke an internal job command.

**Recommended v1 approach**

1. Implement the business logic inside the application codebase.
2. Expose it through a command entrypoint such as `python -m app.jobs.send_daily_portfolio_digest`.
3. Run that command from cron, a container scheduler, or an equivalent deployment-level scheduler.

This avoids duplicate triggers in multi-instance web deployments and keeps the operational model simple.

### Execution Model

- v1 should process users serially.
- A failure for one user must not abort the entire batch.
- The job should log final counts for sent, failed, and skipped users.

### Idempotency

- `PortfolioDailySnapshot` rows are upserted by business key.
- `PortfolioDailyDigestRun` prevents duplicate sends for the same user and day.
- `sent` runs are skipped by default.
- `failed` runs are eligible for retry.

### Failure Policy

- No silent failures.
- Failures must be persisted to `PortfolioDailyDigestRun.error_message`.
- If chart generation or digest payload generation fails for a user, the digest should be marked failed and not sent as a partial email.
- SMTP errors should also mark the run as failed with explicit context.

## Backend File Structure

### Modify

- `backend/app/models.py`
- `backend/app/core/config.py` if digest defaults become configurable
- `backend/tests/conftest.py`

### Create

- `backend/app/services/portfolio_reporting.py`
- `backend/app/services/portfolio_alerts.py`
- `backend/app/services/portfolio_email_digest.py`
- `backend/app/jobs/send_daily_portfolio_digest.py`
- `backend/app/email-templates/src/portfolio_daily_digest.mjml`
- `backend/app/email-templates/build/portfolio_daily_digest.html`
- a new Alembic revision for digest tables
- `backend/tests/services/test_portfolio_reporting.py`
- `backend/tests/services/test_portfolio_alerts.py`
- `backend/tests/services/test_portfolio_email_digest.py`
- `backend/tests/jobs/test_send_daily_portfolio_digest.py`

## Implementation Slices

### Slice 1

Persist the daily snapshot and digest run tables, plus the supporting SQLModel schemas and migration.

### Slice 2

Implement reporting services that produce:

- today's total snapshot
- per-portfolio snapshot rows
- previous-day comparisons
- 90-day total time series

### Slice 3

Implement alert evaluation and normalize the output into digest-friendly alert payloads.

### Slice 4

Implement the MJML template, digest rendering service, and chart embedding strategy.

### Slice 5

Implement the daily job command, retry/idempotency handling, and end-to-end job tests.

## Acceptance Criteria

1. Each active user can receive at most one daily digest email per business date by default.
2. The digest email includes a total portfolio trend chart covering up to the most recent 90 available days.
3. The digest email includes one row per active portfolio with current balance and day-over-day change.
4. The digest surfaces stale data, pending conflicts, and total daily drawdown alerts using the agreed rules.
5. Failed generation or sending attempts are explicitly recorded and retryable without creating duplicate sent records.
6. The implementation does not depend on frontend rendering or browser screenshot generation.
