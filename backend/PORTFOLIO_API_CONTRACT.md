# Portfolio API Contract Report

**Backend Source**: `/Users/Frank/Work/Frameworks/Coding/dreamlabs-investment-portfolio/backend`  
**API Version**: v1  
**Authentication**: JWT Bearer Token (OAuth2PasswordBearer)  
**Database**: PostgreSQL via SQLModel ORM

---

## 1. Portfolio API Endpoints

All endpoints are mounted under `/api/v1` with the following three router groups:

### 1.1. Connectors Router (`/api/v1/connectors`)

#### POST `/connectors/{source}/sync`
- **Method**: POST
- **Path Variable**: `source` (string) — connector source name (e.g., "demo-broker")
- **Authentication**: Required (CurrentUser dependency)
- **Request Body**: None
- **Response Model**: `ConnectorSyncResponse`
- **Status Code**: 200 (success)
- **Error Handling**: 
  - 403 Forbidden — invalid credentials or inactive user
  - 404 User not found
- **Purpose**: Trigger a sync operation for a specific connector source, fetching raw positions and normalizing them

**Response Schema**:
```python
class ConnectorSyncResponse(SQLModel):
    source: str                         # Connector identifier (e.g., "demo-broker")
    status: str                         # Always "ok" on success
    snapshot_version: str               # Timestamp in format: YYYYMMDDTHHMMSSZ
    synced_records: int                 # Count of records fetched from connector
    normalized_records: int             # Count successfully normalized
    conflict_records: int               # Count with normalization conflicts
```

**Example Response**:
```json
{
  "source": "demo-broker",
  "status": "ok",
  "snapshot_version": "20260411T143022Z",
  "synced_records": 3,
  "normalized_records": 2,
  "conflict_records": 1
}
```

---

### 1.2. Portfolio Router (`/api/v1/portfolio`)

#### GET `/portfolio/unified`
- **Method**: GET
- **Authentication**: Required (CurrentUser dependency)
- **Query Parameters**: None
- **Request Body**: None
- **Response Model**: `UnifiedPortfolioResponse`
- **Status Code**: 200 (success)
- **Purpose**: Retrieve aggregated portfolio positions across all normalized positions in the latest snapshot

**Response Schema**:
```python
class UnifiedPortfolioResponse(SQLModel):
    snapshot_version: str               # Latest snapshot identifier (YYYYMMDDTHHMMSSZ)
    stale: bool                         # True if no normalized positions exist
    data: list[UnifiedPosition]         # Aggregated positions by (symbol, asset_class)
```

**UnifiedPosition Schema**:
```python
class UnifiedPosition(SQLModel):
    symbol: str                         # Stock/crypto ticker (e.g., "AAPL", "BTC")
    asset_class: str                    # Normalized asset class (equity|digital_asset|cash)
    quantity: float                     # Total quantity across all positions
    market_value_usd: float             # Total USD value (aggregated)
```

**Example Response**:
```json
{
  "snapshot_version": "20260411T143022Z",
  "stale": false,
  "data": [
    {
      "symbol": "AAPL",
      "asset_class": "equity",
      "quantity": 10.0,
      "market_value_usd": 1890.0
    },
    {
      "symbol": "BTC",
      "asset_class": "digital_asset",
      "quantity": 0.1,
      "market_value_usd": 6200.0
    }
  ]
}
```

**Stale Data Logic**:
- `stale = True` when no normalized positions exist for the user
- No explicit 48-hour threshold currently implemented (logic is data-driven)
- Frontend should display stale warning when `stale: true`

---

#### GET `/portfolio/health-report`
- **Method**: GET
- **Authentication**: Required (CurrentUser dependency)
- **Query Parameters**: None
- **Request Body**: None
- **Response Model**: `HealthReportResponse`
- **Status Code**: 200 (success)
- **Purpose**: Retrieve portfolio health metrics and anomaly count for the current week

**Response Schema**:
```python
class HealthReportResponse(SQLModel):
    week: str                           # ISO week format: "YYYY-WWW" (e.g., "2026-W15")
    generated_at: datetime              # UTC timestamp of report generation
    positions_count: int                # Total unified positions
    total_market_value_usd: float       # Sum of all market_value_usd
    asset_class_count: int              # Distinct count of asset classes
    anomaly_count: int                  # Pending normalization conflicts
    stale: bool                         # Same stale flag as /unified
```

**Field Details**:
- `positions_count`: Includes positions aggregated by (symbol, asset_class)
- `total_market_value_usd`: Used for portfolio composition calculations
- `asset_class_count`: Equity, Digital Asset, Cash, etc.
- `anomaly_count`: Count of `NormalizationConflict` records with `status='pending'`
- `stale`: Mirrors behavior from `/unified` endpoint

**Example Response**:
```json
{
  "week": "2026-W15",
  "generated_at": "2026-04-11T14:30:22.000000+00:00",
  "positions_count": 2,
  "total_market_value_usd": 8090.0,
  "asset_class_count": 2,
  "anomaly_count": 1,
  "stale": false
}
```

---

### 1.3. Audit Router (`/api/v1/audit`)

#### GET `/audit/events`
- **Method**: GET
- **Authentication**: Required (CurrentUser dependency)
- **Query Parameters**: None
- **Request Body**: None
- **Response Model**: `AuditEventsPublic`
- **Status Code**: 200 (success)
- **Purpose**: Retrieve full audit trail for the current user ordered by timestamp (newest first)

**Response Schema**:
```python
class AuditEventsPublic(SQLModel):
    data: list[AuditEventPublic]        # Audit records, newest first
    count: int                          # Total records returned

class AuditEventPublic(SQLModel):
    id: uuid.UUID                       # Audit event primary key
    entity_type: str                    # "raw_position" | "normalized_position"
    entity_id: uuid.UUID                # ID of the entity affected
    event_type: str                     # "normalized" | "normalization_conflict"
    source_record_id: uuid.UUID | None  # Raw position ID that triggered event
    transform_version: str | None       # Transform algorithm version (e.g., "v1")
    changed_fields: str | None          # Comma-separated fields changed (e.g., "asset_type,currency")
    created_at: datetime                # UTC timestamp of event
```

**Example Response**:
```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "entity_type": "normalized_position",
      "entity_id": "660e8400-e29b-41d4-a716-446655440001",
      "event_type": "normalized",
      "source_record_id": "770e8400-e29b-41d4-a716-446655440002",
      "transform_version": "v1",
      "changed_fields": "asset_type,currency",
      "created_at": "2026-04-11T14:30:10.000000+00:00"
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440003",
      "entity_type": "raw_position",
      "entity_id": "770e8400-e29b-41d4-a716-446655440002",
      "event_type": "normalization_conflict",
      "source_record_id": "770e8400-e29b-41d4-a716-446655440004",
      "transform_version": "v1",
      "changed_fields": "asset_type",
      "created_at": "2026-04-11T14:30:05.000000+00:00"
    }
  ],
  "count": 2
}
```

**Pagination**: No explicit pagination parameters. Returns all audit events for the user, sorted by `created_at DESC`.

---

## 2. Data Models

### 2.1. RawPosition (Database Model)

**File**: [backend/app/models.py](backend/app/models.py)  
**Base Class**: `RawPositionBase` → `SQLModel` with `table=True`  
**Primary Key**: `id: uuid.UUID` (auto-generated)

**Fields**:
```python
class RawPosition(SQLModel, table=True):
    id: uuid.UUID                       # Primary key
    source: str                         # Max 64 chars, indexed (connector source: "demo-broker")
    external_id: str                    # Max 255 chars, indexed (connector's position ID)
    symbol: str                         # Max 32 chars (e.g., "AAPL", "BTC")
    asset_type: str                     # Max 64 chars (raw classification: "stock", "crypto", "unknown")
    quantity: float                     # Raw quantity as reported by connector
    market_value: float                 # Market value in original currency
    currency: str                       # Max 8 chars, default "USD"
    owner_id: uuid.UUID                 # Foreign key → User.id (cascade delete)
    fetched_at: datetime                # UTC timestamp when record was ingested
```

**Database Constraints**:
- Foreign Key: `owner_id` → `user.id` (ON DELETE CASCADE)
- Indices: `source`, `external_id`

**Relationships**:
- One RawPosition → Many NormalizedPositions (1:N via `raw_position_id`)
- One RawPosition → Many NormalizationConflicts (1:N via `raw_position_id`)
- One RawPosition → Many AuditEvents (1:N via `source_record_id`)

---

### 2.2. NormalizedPosition (Database Model)

**File**: [backend/app/models.py](backend/app/models.py)  
**Base Class**: `NormalizedPositionBase` → `SQLModel` with `table=True`  
**Primary Key**: `id: uuid.UUID` (auto-generated)

**Fields**:
```python
class NormalizedPosition(SQLModel, table=True):
    id: uuid.UUID                       # Primary key
    raw_position_id: uuid.UUID          # Foreign key → RawPosition.id (cascade delete)
    owner_id: uuid.UUID                 # Foreign key → User.id (cascade delete)
    symbol: str                         # Max 32 chars (normalized ticker)
    asset_class: str                    # Max 64 chars (normalized: "equity", "digital_asset", "cash")
    quantity: float                     # Quantity preserved from raw
    market_value_usd: float             # Converted/normalized to USD
    normalization_status: str           # Max 32 chars, default "normalized"
    transform_version: str              # Max 32 chars, default "v1" (transform algorithm version)
    snapshot_version: str               # Max 64 chars, indexed (YYYYMMDDTHHMMSSZ batch identifier)
    created_at: datetime                # UTC timestamp of normalization
```

**Database Constraints**:
- Foreign Key: `raw_position_id` → `rawposition.id` (ON DELETE CASCADE)
- Foreign Key: `owner_id` → `user.id` (ON DELETE CASCADE)
- Index: `snapshot_version`

**Key Values**:
- `normalization_status`: "normalized" (success) or other states for partial normalization
- `transform_version`: "v1" (current version identifier for tracking algorithm changes)
- `snapshot_version`: ISO 8601 compact format (e.g., "20260411T143022Z")

---

### 2.3. NormalizationConflict (Database Model)

**File**: [backend/app/models.py](backend/app/models.py)  
**Base Class**: `NormalizationConflictBase` → `SQLModel` with `table=True`  
**Primary Key**: `id: uuid.UUID` (auto-generated)

**Fields**:
```python
class NormalizationConflict(SQLModel, table=True):
    id: uuid.UUID                       # Primary key
    raw_position_id: uuid.UUID          # Foreign key → RawPosition.id (cascade delete)
    owner_id: uuid.UUID                 # Foreign key → User.id (cascade delete)
    field_name: str                     # Max 64 chars (name of conflicted field, e.g., "asset_type")
    raw_value: str                      # Max 255 chars (value from raw position that couldn't normalize)
    reason: str                         # Max 255 chars (human-readable explanation)
    status: str                         # Max 32 chars, default "pending" ("pending", "resolved", "ignored")
    created_at: datetime                # UTC timestamp of conflict detection
```

**Database Constraints**:
- Foreign Key: `raw_position_id` → `rawposition.id` (ON DELETE CASCADE)
- Foreign Key: `owner_id` → `user.id` (ON DELETE CASCADE)

**Example Conflict**:
```
field_name: "asset_type"
raw_value: "unknown"
reason: "No SSOT mapping for asset_type"
status: "pending"
```

**Asset Class Mapping** (Source: [backend/app/services/portfolio_pipeline.py](backend/app/services/portfolio_pipeline.py)):
```python
ASSET_CLASS_MAPPING = {
    "stock": "equity",
    "etf": "equity",
    "crypto": "digital_asset",
    "cash": "cash",
}
```
If `asset_type` not in mapping → creates NormalizationConflict with status "pending"

---

### 2.4. AuditEvent (Database Model)

**File**: [backend/app/models.py](backend/app/models.py)  
**Base Class**: `AuditEventBase` → `SQLModel` with `table=True`  
**Primary Key**: `id: uuid.UUID` (auto-generated)

**Fields**:
```python
class AuditEvent(SQLModel, table=True):
    id: uuid.UUID                       # Primary key
    owner_id: uuid.UUID                 # Foreign key → User.id (cascade delete)
    entity_type: str                    # Max 64 chars, indexed (entity type affected)
    entity_id: uuid.UUID                # UUID reference, indexed (ID of affected entity)
    event_type: str                     # Max 64 chars ("normalized", "normalization_conflict")
    source_record_id: uuid.UUID | None  # Optional, indexed (originating raw position)
    transform_version: str | None       # Max 32 chars, optional (algorithm version)
    changed_fields: str | None          # Max 512 chars, optional (CSV of field names)
    created_at: datetime                # UTC timestamp of event
```

**Database Constraints**:
- Foreign Key: `owner_id` → `user.id` (ON DELETE CASCADE)
- Indices: `entity_type`, `entity_id`, `source_record_id`

**Event Types**:
- `"normalized"`: Position successfully normalized
- `"normalization_conflict"`: Normalization produced a conflict

---

## 3. Response DTOs (Non-Database Models)

### 3.1. UnifiedPortfolioResponse
Returned by: `GET /portfolio/unified`  
Contains aggregated positions by (symbol, asset_class) tuple

### 3.2. ConnectorSyncResponse
Returned by: `POST /connectors/{source}/sync`  
Contains sync operation summary

### 3.3. HealthReportResponse
Returned by: `GET /portfolio/health-report`  
Contains portfolio health metrics

### 3.4. AuditEventsPublic
Returned by: `GET /audit/events`  
Wrapper around list of AuditEventPublic with count

---

## 4. Error Handling

### Exception Types & Handling

**FastAPI Global Handlers**:
- `HTTPException(status_code=403, detail="Could not validate credentials")` → Invalid/expired JWT
- `HTTPException(status_code=404, detail="User not found")` → User ID from token not found
- `HTTPException(status_code=400, detail="Inactive user")` → User is_active=False

**Authentication Flow** ([backend/app/api/deps.py](backend/app/api/deps.py)):
```python
def get_current_user(session: SessionDep, token: TokenDep) -> User:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[security.ALGORITHM])
        token_data = TokenPayload(**payload)
    except (InvalidTokenError, ValidationError):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, ...)
    if not token_data.sub:
        raise HTTPException(status_code=403, ...)
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, ...)
    if not user.is_active:
        raise HTTPException(status_code=400, ...)
    return user
```

**HTTP Status Codes**:
- `200 OK` — Successful GET/POST
- `400 Bad Request` — Inactive user
- `403 Forbidden` — Invalid/expired credentials
- `404 Not Found` — User not found

**Frontend Error Handling Context**:
From frontend findings: "Global error handler: 401/403 clears token and redirects to /login"

---

## 5. Authentication Requirements

### All Portfolio Endpoints Require Authentication

**Dependency**: `CurrentUser` (enforced via Depends in all route handlers)

**Token Format**: OAuth2 Bearer Token
- Header: `Authorization: Bearer {jwt_token}`
- Token issued by: `/api/v1/login/access-token`
- Token type: JWT (RS256 or HS256 depending on SECRET_KEY)

**User Context Available**:
```python
class User(SQLModel, table=True):
    id: uuid.UUID                       # User's UUID from token.sub
    email: EmailStr
    is_active: bool
    is_superuser: bool
    full_name: str | None
    hashed_password: str
    created_at: datetime
```

**Token Payload**:
```python
class TokenPayload(SQLModel):
    sub: str | None = None              # User ID (UUID string)
```

**Configuration**:
- `ACCESS_TOKEN_EXPIRE_MINUTES`: 60 * 24 * 8 = 11,520 minutes (8 days)
- Secret: `settings.SECRET_KEY` (from .env)

---

## 6. Pagination

### No Explicit Pagination Implemented

**Current Behavior**:
- All list endpoints return all records (no offset/limit parameters)
- `/audit/events` returns full audit history ordered by `created_at DESC`

**Recommendations for Frontend**:
- Load-on-demand or client-side virtualization for large audit logs
- Consider adding pagination params in v2: `?skip=0&limit=50`

---

## 7. Filtering & Sorting

### No Filtering/Sorting Parameters Currently Supported

**Current Endpoint Capabilities**:
- `/portfolio/unified` — No filters, returns latest snapshot
- `/portfolio/health-report` — No filters, returns current week
- `/audit/events` — No filters, returns all events

**Implicit Sorting**:
- `/audit/events` — Sorted by `created_at DESC` (newest first)

**Future Enhancement Opportunities**:
- Filter audit events by `entity_type`, `event_type`, date range
- Filter unified portfolio by asset_class
- Sort health report metrics by date range

---

## 8. Stale Data Logic

### Detection Mechanism

**Source**: [backend/app/services/portfolio_pipeline.py](backend/app/services/portfolio_pipeline.py) → `get_unified_positions()`

```python
def get_unified_positions(session: Session, owner_id: UUID) -> tuple[str, bool, list[UnifiedPosition]]:
    latest = session.exec(
        select(NormalizedPosition)
        .where(NormalizedPosition.owner_id == owner_id)
        .order_by(NormalizedPosition.created_at.desc())
    ).all()

    if not latest:
        return "", True, []  # ← stale = True if NO positions exist
```

**Stale Flag** (`stale: bool`):
- `True` — No normalized positions exist for user (empty portfolio or failed syncs)
- `False` — Latest snapshot has ≥1 normalized positions

**No Time-Based Threshold**:
- Currently **not** checking 48-hour recency
- Logic is purely presence-based (data exists = not stale)
- Future enhancement: Add configurable TTL check (e.g., `created_at < now() - 48h` → stale)

### Returned In:
- `GET /portfolio/unified` → `UnifiedPortfolioResponse.stale`
- `GET /portfolio/health-report` → `HealthReportResponse.stale`

### Frontend Usage (from CLAUDE.md):
- Use amber-600 for stale/warnings
- Stale data should trigger user-visible warning

---

## 9. Data Flow Diagram

```
POST /connectors/{source}/sync
    ↓
ingest_positions() →
    ├─ fetch_connector_positions(source)
    │   └─ Returns: [{"external_id", "symbol", "asset_type", "quantity", "market_value", "currency"}]
    │
    ├─ FOR EACH raw record:
    │   ├─ Create RawPosition (status: new)
    │   ├─ Try ASSET_CLASS_MAPPING[asset_type]
    │   │   ├─ SUCCESS → Create NormalizedPosition + AuditEvent(event_type="normalized")
    │   │   └─ FAIL → Create NormalizationConflict + AuditEvent(event_type="normalization_conflict")
    │   └─ Increment counters: synced, normalized, conflict
    │
    └─ RETURN: (snapshot_version, synced_count, normalized_count, conflict_count)

GET /portfolio/unified
    ↓
get_unified_positions(session, owner_id) →
    ├─ Query latest NormalizedPosition records by created_at DESC
    ├─ IF empty: RETURN stale=True
    ├─ ELSE: Get snapshot_version from latest[0]
    ├─ Filter: WHERE snapshot_version == latest AND normalization_status == "normalized"
    ├─ GROUP BY (symbol, asset_class) and SUM quantities, market_value_usd
    └─ RETURN: (snapshot_version, stale=False, aggregated_positions)

GET /portfolio/health-report
    ↓
    ├─ Calls get_unified_positions() → positions list
    ├─ Calls get_anomaly_count() → COUNT(NormalizationConflict WHERE status="pending")
    ├─ Calculates: positions_count, total_market_value_usd, asset_class_count
    └─ RETURN: HealthReportResponse with week=YYYY-WWW format

GET /audit/events
    ↓
    ├─ Query AuditEvent WHERE owner_id == current_user.id
    ├─ ORDER BY created_at DESC
    └─ RETURN: AuditEventsPublic(data=[], count)
```

---

## 10. Integration Summary for Frontend

### Type Auto-Generation
```bash
cd frontend
npm run generate-client  # Generates src/client/schemas.gen.ts with TypeScript types
```

**Auto-generated types** (matching these models):
- `UnifiedPortfolioResponse`
- `ConnectorSyncResponse`
- `HealthReportResponse`
- `AuditEventsPublic`
- `AuditEventPublic`

### Usage Pattern (from frontend findings)
```typescript
import { useSuspenseQuery } from '@tanstack/react-query';
import { PortfolioService } from '@/client';

export function PortfolioDashboard() {
  const { data: portfolio } = useSuspenseQuery({
    queryKey: ['portfolio', 'unified'],
    queryFn: () => PortfolioService.getUnifiedPortfolio(),
  });

  if (portfolio.stale) {
    return <StaleDataWarning />;
  }

  return <PortfolioGrid positions={portfolio.data} />;
}
```

### Key Constraints
- All endpoints require JWT authentication (in `Authorization: Bearer` header)
- All requests must include valid `CurrentUser` context
- Paginated responses always include `count` field (even if no pagination params)
- `snapshot_version` is YYYYMMDDTHHMMSSZ format (ISO 8601 compact)
- Asset classes: "equity", "digital_asset", "cash"
- Status fields: "normalized", "pending", "resolved", "ignored"

