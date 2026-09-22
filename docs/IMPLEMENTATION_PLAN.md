# Implementation Plan — Philip's Personal LinkedIn AI Agent
**Date:** 2026-09-22
**Owner:** Philip Opeyemi Ogungboye

## Overview

This plan implements a production-grade, secure, testable application per Master Build Spec, after research phase. It distinguishes what is real vs blocked and provides compliant fallbacks.

## Phase 0: Research (Completed)

- [x] Verify official docs for OAuth, Messages, Connections, Compliance, Webhooks
- [x] Produce RESEARCH_REPORT.md, API_CAPABILITY_MATRIX.md, OAUTH_SETUP.md, PLATFORM_LIMITATIONS.md
- [x] Determine feasibility: OAuth + profile + posting self-serve, connections/messages closed, need manual intake fallback
- [x] Create architecture and threat model

## Phase 1: Foundation — Database & Auth

### 1.1 Supabase Project Setup
- [x] Project already exists: cbxloutahmalorumaihc, eu-west-2
- [x] Migration 001_initial_schema.sql executed via management API
- [x] Tables verified: contacts, interactions, drafts, followups, agent_runs, integration_connections, audit_logs, webhook_events
- [ ] Add RLS policies for auth.uid() (currently service_role bypass for MVP single-user)
- [ ] Add retention policies (e.g., delete interactions >1 year)
- [ ] Test owner-only access, duplicate events, invalid FKs

### 1.2 Application Authentication (Owner-Only)
- [ ] Implement Supabase Auth or custom session
- For MVP single-user: fixed UUID `00000000-0000-0000-0000-000000000001` as Philip, or real Supabase user
- [ ] Secure cookies: httpOnly, secure, sameSite=lax
- [ ] Protected routes: middleware checks session server-side
- [ ] Tests: owner-only access, unauthorized access blocked

### 1.3 LinkedIn OAuth Implementation
- [ ] Backend: FastAPI routes `/auth/linkedin`, `/auth/linkedin/callback`, `/auth/linkedin/disconnect`
- [ ] Frontend: Connect LinkedIn button, status display, token expiry, disconnect
- [ ] Security: state generation/validation, PKCE, exact redirect URI, client secret server-only, encrypted token storage (AES-256-GCM)
- [ ] Token refresh: handle 60-day expiry, 365-day refresh, re-auth flow
- [ ] Tests: valid callback, invalid state, denied auth, missing scopes, expired creds, disconnect

**Credentials Required from Philip:**
- LinkedIn Developer App Client ID, Client Secret, Redirect URI (see OAUTH_SETUP.md)
- After research, we know exactly what is needed: Sign In with LinkedIn using OIDC product, redirect URIs for prod + localhost

## Phase 2: Python FastAPI Agent Service

### 2.1 Project Structure
```
backend/
├── app/
│   ├── main.py
│   ├── config.py
│   ├── schemas.py
│   ├── database.py
│   ├── auth.py
│   ├── security.py
│   ├── agent.py
│   ├── prompts.py
│   ├── policy.py
│   ├── services/
│   │   ├── contacts.py
│   │   ├── drafts.py
│   │   ├── briefings.py
│   │   ├── linkedin_oauth.py
│   │   └── notifications.py
│   └── routes/
│       ├── briefing.py
│       ├── welcome.py
│       ├── reply.py
│       ├── intake.py
│       ├── auth.py
│       └── health.py
├── migrations/
├── tests/
├── Dockerfile
├── requirements.txt
└── .env.example
```

### 2.2 Endpoints
- `POST /agent/briefing` — Generate morning briefing from contacts + followups
- `POST /agent/welcome` — Draft welcome for new connection
- `POST /agent/reply` — Draft reply to incoming message
- `POST /agent/intake` — Manual intake for contact/message
- `GET /health` — Health check
- `GET /auth/linkedin` — Initiate OAuth
- `GET /auth/linkedin/callback` — Handle callback
- `POST /auth/linkedin/disconnect` — Disconnect

All with Pydantic validation, authenticated, rate-limited, structured logging, error handling.

### 2.3 Agent Engine
- Context assembly: fetch contact + last 10 interactions + notes
- Prompt management: system prompt = Philip identity + style + rules, user prompt = task + context
- LLM: OpenAI gpt-4o-mini with mock fallback
- Structured outputs: JSON for briefing, text for drafts
- Classification: incoming message intent
- Policy checks: server-side after generation
- Idempotency: external_event_id unique check
- Retry-safe: agent_runs logging

### 2.4 Policy Engine
- Default: briefing auto, draft gen auto, storage auto, follow-up auto, DM sending approval required, sensitive always review, financial/legal/employment require review, bulk disabled, unsupported disabled
- Approval binding: hash of draft_text + recipient + purpose + action, editing invalidates
- Final server-side check before any external action

## Phase 3: Frontend (TypeScript, Next.js)

### 3.1 Dashboard
- Connection status (not connected, in progress, connected, missing perms, expired, error, disconnected)
- Granted scopes
- Integration health
- Last sync
- Agent activity (from agent_runs)
- New connection drafts (pending)
- Incoming message drafts (pending)
- Morning briefing
- Follow-up reminders
- Pending approvals
- Failed ops with actionable errors
- Autonomy settings

All connected to real backend state via API calls, not mock.

### 3.2 Connection Settings
- Connect LinkedIn button → OAuth flow
- Consent info
- Connected account info (from userinfo)
- Token status (expires in X days, no token exposed)
- Disconnect button
- Reconnection handling
- Clear errors for missing permissions

### 3.3 Approval Inbox
- Each draft: contact name, profile link if verified, purpose, context used, message text, approval status, timestamp, edit, copy, open LinkedIn, sending status
- Do not show success send until authorized send actually succeeds
- Edit invalidates approval

### 3.4 Other Pages
- Contacts: relationship memory, search, add via manual intake
- Briefings: generate now, history
- Intake: new connection form, incoming message form
- Followups: list, due, overdue
- Settings: professional identity, communication style, goals, avoid topics, autonomy, system prompt preview

## Phase 4: n8n Automation

### 4.1 Workflows (JSON Exports)
1. Morning briefing: Schedule 08:00 Africa/Lagos → Fetch contacts → POST /agent/briefing → Save → Notify
2. New connection intake: Webhook /new-connection → Validate → Idempotency → POST /agent/welcome → Policy → Save → Notify
3. Incoming message intake: Webhook /incoming-message → Validate → Deduplicate → Fetch context → POST /agent/reply → Classify → Save → Notify
4. Draft generation & persistence (part of above)
5. Approval notifications (email/dashboard)
6. Retry & failure handling (n8n retry + agent_runs logging)
7. Integration health monitoring (schedule hourly, check expires_at)

### 4.2 Provisioning
- App does NOT require manual workflow construction — provides importable JSON in /n8n-workflows/
- Docs explain import, Postgres credential, HTTP auth, URL updates
- Real triggers where available: Schedule Trigger (real), Webhook Trigger (real, but LinkedIn personal webhooks not available, so webhook is for manual/future authorized source)
- Do NOT invent LinkedIn triggers

## Phase 5: Security & Compliance

See SECURITY_THREAT_MODEL.md

- Secure auth, owner-only, RLS
- OAuth state validation, CSRF, encrypted tokens, secure cookies, HTTPS
- Input validation, prompt injection protection (external message as untrusted input)
- No tokens in logs, no secrets in Git
- Audit logging, rate limiting, safe errors
- Retention & deletion policies, disconnect & data deletion

## Phase 6: Testing

See ACCEPTANCE_TESTS.md

- OAuth tests: valid callback, invalid state, denied, missing scopes, expired, disconnect
- DB tests: owner-only, duplicate events, invalid FK, unauthorized access, deletion
- Agent tests: welcome gen, reply drafting, missing context, prompt injection, sensitive escalation, structured output validation
- Automation tests: morning schedule, duplicate handling, retry, failed API, notification failures, approval invalidation
- Integration tests: mocked provider, real LinkedIn only when legit creds available, e2e for functioning journeys

Distinguish mocked vs real integration tests. Never claim live LinkedIn op tested if no authorized creds.

## Phase 7: Deployment

- Dockerfiles for backend and frontend
- Docker Compose for local + persistent server
- Env templates
- Migrations
- n8n exports
- Reverse proxy & HTTPS (Vercel handles, or nginx + Let's Encrypt)
- Health checks, structured logs, error monitoring, backup guidance, deployment + rollback instructions
- Must not depend on personal laptop — persistent cloud server or managed hosting (Vercel, Fly.io, etc.)
- Document persistent storage requirements (n8n needs volume, Supabase managed)

## Phase 8: Final Deliverables & Capability Report

- Research report with official sources + dates
- API capability & permission matrix
- Architecture + threat model
- Implementation plan
- Production frontend + backend
- Supabase migrations + RLS
- n8n workflow JSON exports
- OAuth implementation
- Agent prompts + policy engine
- Automated tests + results
- Docker + deployment config
- Env template
- Setup + troubleshooting docs
- Final capability report: what works, what requires approval, what is blocked

## Acceptance Criteria (From Spec Section 13)

Project not complete until:
1. App starts via documented instructions
2. Frontend communicates with real backend
3. Migrations run successfully
4. Auth + owner-only tested
5. OAuth works with valid dev creds + redirect URI
6. Granted perms displayed
7. App does not claim unsupported capabilities
8. Morning briefing works with test data + real authorized data where available
9. New connection intake produces persisted drafts
10. Incoming message intake produces persisted reply drafts
11. Approval policy enforced server-side
12. n8n workflows exported + documented
13. Failures visible + recoverable
14. Deployment reproducible
15. Automated tests pass
16. README accurately documents remaining external approval/access requirements

If live API feature cannot be tested because no valid creds or approval, label BLOCKED BY EXTERNAL ACCESS, not complete.

## Credentials Required (After Research)

From Philip:
- LinkedIn Developer App: Client ID, Client Secret, Redirect URI (see OAUTH_SETUP.md for exact steps)
- Supabase: Already have project cbxloutahmalorumaihc, anon key, service_role key (already configured in Vercel)
- Vercel: Already deployed, token for CI (already used)
- GitHub: Already pushed, token for CI (already used)
- OpenAI: Optional, has mock fallback — if wants real LLM, provide OPENAI_API_KEY
- Encryption key: Generate random 32-char for token encryption at rest

Do NOT ask for LinkedIn password, browser cookies, session credentials.

## Timeline (Estimated)

- Research: 1 day (completed)
- Foundation (DB, auth, OAuth): 2-3 days
- Python FastAPI backend: 2-3 days
- Frontend: 2-3 days
- n8n workflows: 1 day
- Security + testing: 2 days
- Deployment + docs: 1 day
- Total: ~10-12 days for full production spec (MVP already deployed in 1 day)

## Current Status

- v1 deployed: Next.js + Supabase + mock LLM fallback, manual intake, approval inbox — live at https://personal-linkedin-agent.vercel.app
- Now upgrading to full spec: Python FastAPI backend, real OAuth, research docs, threat model, tests, Docker

Next: Implement Python backend and upgrade frontend to use it, while keeping v1 live.
