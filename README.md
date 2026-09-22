# Philip's Personal LinkedIn AI Agent

> An AI version of your professional self that helps you build relationships, start conversations, and maintain your LinkedIn presence without manually doing everything.

Designed around **mixed autonomy** — AI drafts, you approve and send. No bulk spam, no browser automation, no password storage.

## Architecture

```
LinkedIn Account (OAuth / Manual Intake)
    ↓
n8n Orchestration (Schedules, Webhooks, Routing)
    ↓
Next.js Agent API (/api/agent/*) — LLM + Policy Gate
    ↓
Supabase (Contacts, Interactions, Drafts, Followups)
    ↓
Private Approval Inbox (Dashboard)
```

## Features

### 1. Morning Relationship Briefing (08:00 Africa/Lagos)
- Reviews conversations and identifies people to reconnect with
- Generates personalized reconnection drafts
- Triggered via n8n Schedule or Vercel Cron (`vercel.json`)

### 2. New Connection Welcome
- Detects new connection via authorized event or manual intake form
- Generates personalized welcome based on headline, notes, shared interests
- Idempotency check prevents duplicate drafts
- Policy gate blocks generic spam

### 3. Reply Assistant
- Understands incoming message intent (casual, collaboration, job, sales, sensitive)
- Suggests response in your voice
- Flags commitments, negotiations for review
- Treats incoming messages as untrusted input

### 4. Approval System
- All drafts require approval by default
- Copy draft → Open LinkedIn → Send manually (v1)
- Future: authorized API sending with expiration, duplicate checks, audit logs

## Stack

- **Frontend:** Next.js 14 App Router, Tailwind, TypeScript
- **Backend:** Next.js API Routes (FastAPI-style logic)
- **Database:** Supabase Postgres with RLS
- **AI:** OpenAI GPT-4o-mini (with mock fallback)
- **Automation:** n8n workflows (JSON in `/n8n-workflows`)
- **Hosting:** Vercel
- **Timezone:** Africa/Lagos

## Database Schema

See `migrations/001_initial_schema.sql` — tables:

- `contacts` — people you know, professional context you choose to retain
- `interactions` — conversation events, deduplication via external_event_id
- `drafts` — generated messages, approval state, sending status
- `followups` — when/why to reconnect
- `agent_runs` — workflow execution logs
- `integration_connections` — provider metadata, not raw tokens

Run migration in Supabase SQL Editor, then enable RLS (already in file).

## API Endpoints

| Endpoint | Purpose |
|----------|---------|
| `POST /api/agent/briefing` | Generate morning briefing |
| `GET /api/agent/briefing?user_id=philip` | Cron trigger (Vercel Cron) |
| `POST /api/agent/welcome` | Draft new-connection message |
| `POST /api/agent/reply` | Draft reply to incoming message |
| `POST /api/agent/intake` | Manual contact/message intake |
| `GET /api/health` | Health check |

All endpoints accept `user_id` (default `philip`) for single-user MVP.

### Example: Welcome

```bash
curl -X POST https://your-app.vercel.app/api/agent/welcome \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "Sarah Chen",
    "headline": "AI Infra @ Stripe",
    "profile_url": "https://linkedin.com/in/sarahchen",
    "relationship_notes": "Met at AI conference"
  }'
```

### Example: Briefing

```bash
curl -X POST https://your-app.vercel.app/api/agent/briefing \
  -H "Content-Type: application/json" \
  -d '{"user_id":"philip","timezone":"Africa/Lagos"}'
```

## n8n Workflows

Import JSON files from `/n8n-workflows` into n8n:

1. **workflow-1-morning-briefing.json** — Schedule 08:00 → Fetch contacts → POST /agent/briefing → Save → Email
2. **workflow-2-new-connection.json** — Webhook /new-connection → Validate → Idempotency → POST /agent/welcome → Policy → Save → Notify
3. **workflow-3-reply-assistant.json** — Webhook /incoming-message → Validate → Deduplicate → Fetch context → POST /agent/reply → Classify → Save → Notify

Update `https://your-vercel-app.vercel.app` URL in workflows after deployment.

**Fallback when no LinkedIn API:** Use manual intake form at `/intake` — paste public profile URL and context, agent generates same draft without scraping.

## Local Development

```bash
git clone <your-repo>
cd personal-linkedin-agent
npm install
cp .env.example .env.local
# Fill Supabase and OpenAI keys
npm run dev
```

Open http://localhost:3000

## Deployment

### 1. Supabase Setup

1. Create project at supabase.com
2. SQL Editor → Run `migrations/001_initial_schema.sql`
3. Copy URL, anon key, service_role key to `.env`

### 2. Vercel Deploy

#### Option A: Via GitHub (recommended)

```bash
# Push to GitHub
gh repo create personal-linkedin-agent --public --source=. --remote=origin --push
# Or manually: git remote add origin https://github.com/<you>/personal-linkedin-agent.git
# git push -u origin main
```

Then in Vercel dashboard: Import GitHub repo → Add env vars → Deploy.

#### Option B: Via Vercel CLI (with token)

```bash
npm i -g vercel
vercel --prod --token $VERCEL_TOKEN
# Set env vars in Vercel dashboard or via:
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add OPENAI_API_KEY
```

### 3. Env Vars in Vercel

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
OPENAI_API_KEY (optional - has mock fallback)
NEXT_PUBLIC_APP_URL
```

### 4. Configure Cron

`vercel.json` already sets daily 08:00 UTC cron for briefing. Adjust to Africa/Lagos (08:00 WAT = 07:00 UTC) if needed: `"schedule": "0 7 * * *"`

## Security & Compliance

- No LinkedIn password storage, no browser automation, no scraping
- Manual intake for when API access not granted
- Policy gate: blocks generic spam, sensitive commitments, hallucinations
- Approval required for all external actions
- Incoming messages treated as untrusted input
- Supabase RLS enabled, service_role only in server
- Draft expiration, duplicate checks, audit logs

See LinkedIn API docs: OAuth 2.0, permissions require approval, Connections API limited, messaging restricted.

## Implementation Roadmap

- [x] Phase 1: Supabase schema + Next.js agent API + Dashboard
- [x] Phase 2: Personal memory (contacts, notes, voice profile)
- [x] Phase 3: Manual intake + approval inbox + briefing
- [ ] Phase 4: Authorized LinkedIn API integration (if granted)
- [ ] Phase 5: Email notifications, follow-up automation, analytics

## Testing Checklist

- [ ] Morning workflow runs at 08:00 Lagos time
- [ ] Duplicate connection events don't create duplicate drafts
- [ ] Agent never invents shared interests
- [ ] Incoming messages treated as untrusted
- [ ] Sensitive messages escalated
- [ ] Drafts cannot send without approval
- [ ] Failed API requests logged and retried safely
- [ ] Expired approvals cannot trigger sending
- [ ] DB access restricted to your account
- [ ] Manual intake works without LinkedIn API

## Author

Philip Opeyemi Ogungboye — Mathematics graduate, AI Engineer, Founder of Phoslab Inc.

## License

Private — Personal use for Philip.
