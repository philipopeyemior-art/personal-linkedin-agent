# Architecture — Philip's Personal LinkedIn AI Agent
**Date:** 2026-09-22
**Owner:** Philip Opeyemi Ogungboye

## Overview

Private, single-user, production-grade AI application that helps manage professional relationships via personal LinkedIn account, with compliant fallbacks where official APIs are restricted.

**Core Principles:**
- Real backend, real DB, real auth, not a mockup
- Mixed autonomy: automatic draft generation, approval-required sending
- Security-first: encrypted tokens, RLS, no secrets in frontend
- Clearly distinguishes real vs simulated vs blocked capabilities
- No browser automation, no scraping, no password storage

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Client (Browser / Phone)                     │
│  Next.js 14 App Router (TypeScript, React, Tailwind)                │
│  - Dashboard, Approval Inbox, Contacts, Briefings, Intake, Settings │
│  - Authenticated routes, real backend integration                   │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ HTTPS
                               │ /api/* 
┌──────────────────────────────▼──────────────────────────────────────┐
│                     Vercel Hosting (Next.js)                        │
│  - Next.js API Routes as BFF (Backend for Frontend)                 │
│  - /api/auth/linkedin (OAuth), /api/agent/* (proxy to Python)      │
│  - Cron: /api/agent/briefing?user_id=philip at 08:00 Africa/Lagos  │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ HTTP (service-to-service, mTLS / secret)
                               │
┌──────────────────────────────▼──────────────────────────────────────┐
│                  Python FastAPI Agent Service                       │
│  - FastAPI, Pydantic validation, modular services                   │
│  - Endpoints: /agent/briefing, /welcome, /reply, /intake, /health   │
│  - LLM provider abstraction (OpenAI + mock fallback)                │
│  - Prompt management, structured outputs, classification            │
│  - Policy engine (server-side, approval binding)                    │
│  - Context assembly, idempotency, retry-safe                        │
│  - Structured logging                                               │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
┌───────▼────────┐    ┌────────▼────────┐    ┌──────▼───────┐
│   Supabase     │    │   n8n           │    │  LinkedIn    │
│   Postgres     │    │  Orchestration  │    │  OAuth + APIs│
│                │    │                 │    │              │
│ - users        │    │ - Morning       │    │ - OIDC Auth  │
│ - contacts     │    │   briefing      │    │ - userinfo   │
│ - interactions │    │ - New conn      │    │ - Messages*  │
│ - drafts       │    │ - Reply intake  │    │ - Webhooks*  │
│ - followups    │    │ - Notifications │    │ (*restricted)│
│ - agent_runs   │    │ - Health checks │    │              │
│ - integration_ │    │                 │    │              │
│   connections  │    │                 │    │              │
│ - audit_logs   │    │                 │    │              │
│ - RLS enabled  │    │                 │    │              │
└────────────────┘    └─────────────────┘    └──────────────┘

*Restricted capabilities use manual intake fallback
```

## Deployment Architecture

- **Frontend + BFF:** Vercel (Next.js), HTTPS, global CDN, serverless functions
- **Python Backend:** Can be deployed as:
  - Option A (MVP): Next.js API routes contain Python-like logic (current v1) — works on Vercel
  - Option B (Production spec): Separate FastAPI service on Fly.io / Railway / Render / Cloud Run with persistent storage, HTTPS, health checks
  - For this spec, we implement Option B with Dockerfile, but keep BFF proxy for Vercel deployment
- **Database:** Supabase Postgres, region eu-west-2, with migrations, RLS, indexes, retention policies
- **Automation:** n8n self-hosted or n8n.cloud, with workflow JSON exports, Postgres credential, HTTP auth
- **LLM:** OpenAI API (gpt-4o-mini) with mock fallback
- **Secrets:** Environment variables + encryption key for token storage, never in Git

## Component Details

### Frontend (TypeScript, Next.js 14 App Router)

**Stack:**
- Next.js 14.2.5 App Router
- TypeScript 5.5
- Tailwind CSS 3.4
- React 18.3
- Supabase SSR for auth
- Lucide React for icons
- date-fns for dates
- Zod for validation

**Routes:**
- `/` — Dashboard: connection status, granted scopes, integration health, last sync, agent activity, briefing preview, pending approvals, failed ops, autonomy settings
- `/briefings` — Morning briefing: generate now, view history, n8n workflow diagram
- `/drafts` — Approval inbox: list drafts with contact, purpose, context, message, status, timestamp, edit, copy, open LinkedIn, sending status
- `/contacts` — Contacts: relationship memory, search, add via manual intake, view history
- `/intake` — Manual intake: new connection form, incoming message form, generates draft
- `/followups` — Follow-up reminders: due, overdue, reason
- `/settings` — Agent settings: professional identity, communication style, goals, avoid topics, autonomy policy, system prompt preview, env status
- `/api/auth/linkedin` — Initiates OAuth
- `/api/auth/linkedin/callback` — Handles callback, state validation, token exchange, userinfo
- `/api/auth/linkedin/disconnect` — Deletes tokens, marks disconnected
- `/api/agent/briefing`, `/welcome`, `/reply`, `/intake`, `/health` — BFF proxy to Python service (or direct logic in MVP)

**Auth:**
- Supabase Auth or custom session with secure httpOnly cookies
- Owner-only access: single user (Philip) — fixed UUID `00000000-0000-0000-0000-000000000001` for MVP, or Supabase auth user id
- Protected routes check session server-side

**UI States:**
- Loading, empty, success, error — all real backend integration, no mock

### Backend (Python, FastAPI) — Production Spec

**Project Structure (Target):**
```
backend/
├── app/
│   ├── main.py (FastAPI app, lifespan, middleware)
│   ├── config.py (settings from env, encryption key, etc.)
│   ├── schemas.py (Pydantic request/response models)
│   ├── database.py (Supabase client, or asyncpg)
│   ├── auth.py (session validation, owner check)
│   ├── security.py (encryption, rate limiting, prompt injection protection)
│   ├── agent.py (LLM calls, prompt assembly)
│   ├── prompts.py (Philip's system prompt, welcome, reply, briefing prompts)
│   ├── policy.py (policy engine, classification, approval binding)
│   ├── services/
│   │   ├── contacts.py
│   │   ├── drafts.py
│   │   ├── briefings.py
│   │   ├── linkedin_oauth.py (OAuth flow, token refresh, userinfo)
│   │   └── notifications.py
│   └── routes/
│       ├── briefing.py
│       ├── welcome.py
│       ├── reply.py
│       ├── intake.py
│       ├── auth.py (linkedin connect, callback, disconnect)
│       └── health.py
├── migrations/
│   └── 001_initial_schema.sql
├── tests/
│   ├── test_oauth.py
│   ├── test_policy.py
│   ├── test_welcome.py
│   ├── test_reply.py
│   └── test_briefing.py
├── Dockerfile
├── requirements.txt
└── .env.example
```

**FastAPI Details:**
- Pydantic v2 for validation
- Modular service architecture
- Structured logging (JSON, with request id, user id, no tokens)
- Authenticated internal API endpoints: check `AGENT_API_SECRET` header or JWT
- Rate limiting: slowapi or custom middleware (e.g., 100 req/min per user)
- Error handling: global exception handler, returns safe messages, logs details
- Retry controls: tenacity for LLM calls, idempotency keys for drafts

**Agent Engine:**
- Context assembly: fetch relevant contact + recent interactions (limit 10) + relationship notes
- Prompt management: system prompt = Philip's identity + communication style + rules, user prompt = task + context
- Structured outputs: JSON for briefing (summary, items[]), text for drafts
- Classification: incoming message intent (casual, collaboration, job, sales, sensitive)
- Policy checks: checkDraftPolicy() — blocks generic spam, sensitive commitments, hallucinated history, too long, bulk
- Idempotency: check external_event_id + user_id + source unique index before processing
- Retry-safe: agent_runs table logs input_summary, output_summary, status, error_message
- Model abstraction: getOpenAI() with mock fallback, so works without API key

**Security:**
- No LLM tool access to credentials
- Model must not bypass policy engine — policy check is server-side after LLM generation, not LLM self-check
- Treat external message content as untrusted input — cannot override system prompt (prompt injection protection via delimiters and instructions)
- Encrypted sensitive credentials: AES-256-GCM with ENCRYPTION_KEY env var

### Database (Supabase PostgreSQL)

**Tables:**
- `users` (if using Supabase Auth) or fixed owner
- `contacts` — id uuid pk, user_id uuid, linkedin_member_id text, profile_url text, full_name text, headline text, relationship_notes text, source text, created_at, updated_at, indexes on user_id, created_at, unique on (user_id, linkedin_member_id) where not null
- `interactions` — id uuid, user_id uuid, contact_id uuid fk cascade, kind enum, source text, external_event_id text, occurred_at timestamptz, content text, summary text, created_at, unique on (user_id, source, external_event_id) where not null, index on contact_id, created_at desc
- `drafts` — id uuid, user_id uuid, contact_id uuid fk cascade, interaction_id uuid fk set null, purpose text, draft_text text, status enum, requires_approval bool, approved_at, sent_at, expires_at, created_at, index on user_id, status, created_at desc, contact_id
- `followups` — id uuid, user_id uuid, contact_id uuid fk cascade, due_at timestamptz, reason text, status text, created_at, index on user_id, due_at where status=open
- `agent_runs` — id uuid, user_id uuid, workflow_name text, status text, input_summary jsonb, output_summary jsonb, error_message text, started_at, completed_at, index on user_id, started_at desc
- `integration_connections` — id uuid, user_id uuid, provider text, linkedin_sub text, scopes text[], connection_status text, access_token_encrypted text, refresh_token_encrypted text, expires_at timestamptz, refresh_expires_at timestamptz, profile_data jsonb, created_at, updated_at
- `audit_logs` — id uuid, user_id uuid, action text, resource_type text, resource_id uuid, details jsonb, created_at
- `webhook_events` — id uuid, user_id uuid, source text, event_type text, external_event_id text, payload jsonb, status text, created_at, unique on (user_id, source, external_event_id)

**RLS:**
- Enable RLS on all user-facing tables
- Policies: owner-only access via auth.uid() or fixed owner UUID
- Service_role bypass for backend
- For MVP single-user, allow service_role full access, but document proper auth.uid() policies for future

**Migrations:**
- `migrations/001_initial_schema.sql` — already executed on Supabase project cbxloutahmalorumaihc, contains enums, tables, indexes, RLS, triggers for updated_at
- Future migrations via Supabase CLI or SQL editor

**Retention & Deletion:**
- Configurable retention: e.g., delete interactions older than 1 year, drafts older than 90 days, etc.
- Data deletion on disconnect: delete integration_connections tokens, optionally delete contacts/interactions per user preference
- Provide API for user to delete all data

### Automation (n8n)

**Workflows (JSON exports in /n8n-workflows/):**

1. **Morning Briefing**
   - Trigger: Schedule Trigger 08:00 Africa/Lagos (or Vercel Cron as alternative)
   - Nodes: Set briefing_date, timezone, user_id → Postgres fetch contacts + followups → IF any contacts? → HTTP POST /agent/briefing → Code validate → Postgres save drafts + agent_runs → Email/dashboard notification
   - Real trigger: Schedule, not LinkedIn webhook (since personal webhook unavailable)

2. **New Connection Intake**
   - Trigger: Webhook POST /new-connection (for future authorized source) + Manual intake form
   - Nodes: Webhook → Normalize event (source, external_id, connected_at, full_name, headline, profile_url) → IF valid? → Postgres idempotency check → HTTP POST /agent/welcome → Policy check → Postgres save draft → Notify
   - Idempotency via external_event_id

3. **Incoming Message Intake**
   - Trigger: Webhook POST /incoming-message + Manual intake
   - Nodes: Webhook → Validate message + source → Postgres deduplicate → Fetch contact + history → HTTP POST /agent/reply → Classify + policy → IF routine? → Save suggested reply vs Save as needs_review → Notify

4. **Draft Generation & Persistence**
   - Part of above workflows, but also standalone: HTTP Request to Python agent, validation, save

5. **Approval Notifications**
   - Email or dashboard notification on new draft

6. **Retry & Failure Handling**
   - n8n built-in retry, plus Code nodes that log to agent_runs with error_message

7. **Integration Health Monitoring**
   - Schedule every hour: Check integration_connections expires_at, if within 7 days → notify "Connection expiring soon"
   - Check last agent_runs for failures → notify

**Provisioning:**
- App does NOT require user to manually construct workflows — provides importable JSON
- Docs explain how to import into n8n, configure Postgres credential (Supabase), HTTP auth, update URLs
- For production, could use n8n API to programmatically create workflows, but manual import is acceptable for MVP

**Triggers:**
- Use real, supported triggers where available: Schedule Trigger (real), Webhook Trigger (real, but LinkedIn personal webhooks not available, so webhook is for manual or future authorized source)
- Do NOT invent LinkedIn triggers

### Agent Engine (Python)

Already detailed in Backend section — key is LLM provider abstraction, policy engine, idempotency.

**Model Provider:**
- Primary: OpenAI gpt-4o-mini (cost-effective, good for drafts)
- Fallback: Mock responses that generate plausible drafts without API key (for demo/testing)
- Future: Anthropic, etc. via abstraction

**Prompts:**
- System prompt: Philip's identity, responsibilities, communication style, rules, desired outcome
- Welcome prompt: Includes contact data, extra context, requirements (warm, natural, reference headline if relevant, max 400 chars, open question)
- Reply prompt: Includes contact, history, incoming message, requirements (understand intent, keep voice, max 600 chars)
- Briefing prompt: Includes contacts list, asks for JSON with summary + items (contact_id, reason, draft, requires_approval, context_summary)

**Policy Engine:**
- Server-side, after LLM generation
- Checks: high-risk phrases (promise, guarantee, contract, confidential, crypto), medium-risk (pricing, proposal), invented history, too long (>1000), generic spam
- Classification: casual_greeting, new_connection_welcome, reply_assistance, reconnection, collaboration_inquiry, job_or_recruiter, sales_or_negotiation, sensitive_or_unclear, potential_hallucination, generic_spam, too_long
- Risk: low, medium, high
- Returns: allowed bool, requires_approval bool, classification, risk_level, reason
- Approval binding: Draft approval must be bound to exact draft_text hash, recipient, purpose, action. Editing after approval invalidates approval (requires new approval)

## Security Architecture

See SECURITY_THREAT_MODEL.md for full threat model.

**Key Controls:**
- OAuth state validation, CSRF protection
- Encrypted tokens at rest (AES-256-GCM)
- Secure cookies (httpOnly, secure, sameSite)
- RLS owner-only
- Rate limiting
- Input validation (Pydantic, Zod)
- Prompt injection protection (delimiters, system instructions that external content cannot override)
- No secrets in Git, no tokens in logs
- Audit logging
- HTTPS-only
- Safe error messages

## Real-Time Requirements

Document per integration actual event delivery model:

- **OAuth login:** Real-time via redirect
- **Profile reading:** On-demand via userinfo API (real-time when token valid)
- **Connections:** Manual intake (not real-time) — unavailable via official API
- **New connection detection:** Manual intake (not real-time) — real-time unavailable for personal
- **Inbox reading:** Manual intake (not real-time) — unavailable
- **Sending DMs:** Manual send via LinkedIn UI (real-time when user clicks) + optional authorized API (disabled by default)
- **Morning briefing:** Scheduled 08:00 Africa/Lagos via Vercel Cron or n8n Schedule Trigger (near real-time, within minutes)
- **Webhooks:** Only for org social actions and lead gen (approved use cases) — not for personal agent MVP

Do NOT label workflow "real-time" simply because it runs frequently.

## Production Deployment

**Docker:**
- Backend Dockerfile: Python 3.11 slim, pip install requirements, copy app, run uvicorn
- Frontend Dockerfile: Node 20, npm install, npm run build, serve via Next.js standalone or nginx
- Docker Compose: frontend, backend, n8n, postgres (or Supabase), with persistent volumes for n8n

**Env Template:** `.env.example` with all required vars and descriptions

**Migrations:** Run via Supabase SQL editor or CLI

**n8n Exports:** JSON in /n8n-workflows/, documented

**Reverse Proxy & HTTPS:** Vercel handles HTTPS automatically, or nginx + Let's Encrypt for self-hosted

**Health Checks:**
- Frontend: /api/health
- Backend: /health
- n8n: /healthz
- Supabase: dashboard

**Logs:** Structured JSON logs, with request id, user id, workflow name, no tokens

**Monitoring:** Vercel analytics, Supabase logs, n8n execution logs, optional Sentry

**Backup:** Supabase daily backups (enabled by default), plus manual pg_dump guidance

**Rollback:** Vercel instant rollback via dashboard, or git revert + redeploy

**Persistent Storage:**
- n8n requires persistent storage for workflows, credentials, executions
- Supabase is managed, persistent
- Python backend may need volume for logs if self-hosted

## Testing

See ACCEPTANCE_TESTS.md

## Acceptance Criteria Mapping

See IMPLEMENTATION_PLAN.md for how each acceptance criterion is met.

## Future Enhancements

- LinkedIn Marketing Developer Platform application for r_1st_connections_size, org features
- Sales Navigator integration if SNAP partner approval obtained (currently closed)
- Email notifications via Resend/SendGrid
- Mobile PWA
- Analytics dashboard
- Multi-user support (currently single-user private)
