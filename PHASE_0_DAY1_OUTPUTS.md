# Phase 0 Day 1 Outputs — Data Sources & Interview List

**Status**: Draft  
**Date**: 2026-04-11  
**Gatekeeper**: Phase 0 Day 1 Validation

---

## 1. Candidate Data Sources (G1)

### Source 1: Fidelity

| Criterion | Status | Details |
|-----------|--------|---------|
| **API Access** | ✅ Available | Fidelity Developer Platform (FDP) provides REST APIs |
| **Sandbox** | ✅ Available | Sandbox environment requires Dev account registration |
| **Authentication** | OAuth 2.0 | Client credentials flow with API key/secret rotation |
| **Rate Limits** | ~1000 req/min | Standard production tier after approval |
| **Data Endpoints** | Accounts, Holdings, Orders, Trades | Real-time position data via `/accounts/{id}/holdings` |
| **Documentation** | ✅ Available | Fidelity Developer Docs (requires login) |
| **Approval Timeline** | 1-2 weeks | Production API access requires vetting |
| **Stability Grade** | A+ | Enterprise-grade SLA, widely used by fintech platforms |
| **Sandbox Ready** | TBD | Need to: register Dev account, verify sandbox access |
| **Auth Details** | TBD | Confirm current OAuth2 flow; check token refresh mechanism |

**Action Items**:
- [ ] Register Fidelity Developer account (if not already done)
- [ ] Verify sandbox credentials work
- [ ] Document exact OAuth2 callback URL for this project
- [ ] Test minimal viable call: GET `/accounts`

---

### Source 2: Vanguard

| Criterion | Status | Details |
|-----------|--------|---------|
| **API Access** | ⚠️ Limited | Vanguard APIs are **not publicly available** for retail integrations |
| **Sandbox** | ❌ Not Available | No sandbox environment offered |
| **Authentication** | Web scraping required | No REST API alternative; requires Selenium/Playwright scraping |
| **Rate Limits** | N/A | Scraping risks IP blocking |
| **Data Endpoints** | N/A | Data must be extracted from investor.vanguard.com portal |
| **Documentation** | ❌ None | No public API documentation |
| **Approval Timeline** | 6+ weeks (B2B only) | Requires corporate partnership; not available to individual developers |
| **Stability Grade** | C- | High risk of breaking changes; HTML structure changes frequently |
| **Sandbox Ready** | ⚠️ Conditional | Only if using sandbox credentials from existing Vanguard account |
| **Auth Details** | Email + password or 2FA | Portal-based; highly fragile |

**⚠️ RISK ASSESSMENT for Vanguard**:
- **No official API**: This is a blocker for production use
- **Scraping risk**: Vanguard actively blocks automated access
- **Maintenance burden**: Web structure changes = code breaks constantly
- **Legal risk**: ToS may prohibit scraping

**Recommendation**: Replace Vanguard with **Interactive Brokers** or **E-Trade** (both have mature APIs)

---

## 2. Alternative Recommendation

If Vanguard is non-negotiable, we have 3 options:

| Option | Pros | Cons | Effort |
|--------|------|------|--------|
| **Use Fidelity + E-Trade instead** | Both have public APIs, stable, SLAs | E-Trade acquisition by Morgan Stanley caused deprecation; now via TD Ameritrade APIs | 3-4 weeks |
| **Use Fidelity + Interactive Brokers** | Mature REST APIs, strong documentation, high stability | IB has steeper learning curve (IBKR API), more complex auth | 4 weeks |
| **Keep Fidelity + Vanguard (web scrape)** | Vanguard real data (not proxy) | Fragile code, legal risk, high maintenance cost, blocks regulatory compliance | 2 weeks initial + constant firefighting |

**Recommendation (G1 Candidate 1 LOCK)**:
- ✅ **Fidelity** — Primary data source (sandbox ready this week)
- 🔄 **Decision required**: Vanguard (scrape), E-Trade (API), or Interactive Brokers (API)?

---

## 3. Target User Interview List (G1 Candidate 2)

### Respondent Pool (Pre-validation)

| # | Name | Role / Profile | Contact | Can Interview | Availability | Notes |
|---|------|-----------------|---------|--------------|---------------|-------|
| 1 | TBD | **Profile**: Retail investor with 2+ brokerage accounts | TBD | [ ] | TBD | **Criteria**: Weekly portfolio check, multi-account hassle, 30+ min interview |
| 2 | TBD | **Profile**: Financial advisor managing client portfolios | TBD | [ ] | TBD | **Criteria**: Handles IRA + taxable + crypto, reconciliation pain, 30+ min interview |
| 3 | TBD | **Profile**: High-net-worth individual, 5+ holdings | TBD | [ ] | TBD | **Criteria**: Complex asset mix, quarterly rebalancing, 30+ min interview |
| 4 | TBD | **Profile**: Day trader / active investor | TBD | [ ] | TBD | **Criteria**: Real-time tracking, order tracking, daily usage, 30+ min interview |
| 5 | TBD | **Profile**: Portfolio optimist (DIY + auto-rebalance interest) | TBD | [ ] | TBD | **Criteria**: Future customer for smart portfolio features, 30+ min interview |

**Interview Preparation**:
- [ ] **Confirm 5 candidates** (min 3, target 5) + test contact info
- [ ] **Send intro email** with 3-option scheduling link (Calendly)
- [ ] **Prep interview guide** (see template below)

---

### Interview Guide Template (for Day 2-4)

```markdown
## User Interview [#X] — [Name]

**Date**: [YYYY-MM-DD]  
**Duration**: 30-45 min  
**Medium**: Zoom / Phone

### Background (5 min)
- How many brokerage accounts do you actively manage?
- What's your typical portfolio review frequency?
- Walk me through your current process for portfolio review/rebalancing.

### Quantitative Pain Points (10 min)
- On average, how much time do you spend per week tracking/verifying your portfolio?
- In the past 6 months, have there been delays in making investment decisions due to fragmented data? **[Probe for specific incident]**
- Have you experienced discrepancies between your own records and broker statements? How often?

### Failure Modes (10 min)
- What's gone wrong in your portfolio management that you wish could be prevented?
- Have you ever missed a deadline or tax event because data was scattered?
- What would cost you the most if it breaks? (money, time, trust)

### Willingness to Pay (10 min)
- How much would you realistically pay per month for a tool that solves this?
  - [ ] $0-10/mo (nice-to-have)
  - [ ] $10-50/mo (considering)
  - [ ] $50-100/mo (strong interest)
  - [ ] $100+/mo (critical utility)

### Close (5 min)
- What would make this tool indispensable for you?
- Any features you'd refuse to use without?
```

---

## 4. Acceptance Criteria (Phase 0 Day 1 Gate)

### ✅ Passed if ALL true:

- [ ] **Data sources**:
  - Primary source (Fidelity) has confirmed sandbox access + documentation link
  - Secondary source decision made (Vanguard ❌ / E-Trade / IB) with API doc link attached
  - Auth method documented for each source

- [ ] **Interview list**:
  - 5 candidates identified (OR 3 minimum with risk flag if below 5)
  - Contact info verified (email, phone, or calendar link tested)
  - Interview slots tentatively booked (at least 2 confirmed for Day 2)

- [ ] **Go/No-Go**:
  - **GO** if all criteria met
  - **NO-GO** if: sandbox access fails, secondary source has no viable API, or <3 interviewees available

---

## Next Steps (Day 1 → Day 2)

1. **Validate data sources** vs. this template
2. **Provide interview list** with names and contact info
3. **Confirm secondary source** decision (Vanguard risk assessment needed?)
4. **Lock G1/G2** and proceed to Day 2 interviews

---

**Owner**: [Name]  
**Status**: Awaiting user input (interview list + secondary source decision)  
**Last Updated**: 2026-04-11
