# Deployment Guide — Secure Token Handling

You mentioned you'll provide temporary access tokens for GitHub, Vercel, and Supabase and rotate them later. Here's how to share them securely for deployment.

## Option 1: Paste tokens here (Temporary, will be used only in this session)

I can deploy for you immediately if you provide:

```
GITHUB_TOKEN=ghp_xxx
GITHUB_REPO=yourusername/personal-linkedin-agent
VERCEL_TOKEN=vercel_xxx
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
OPENAI_API_KEY=sk-...
```

I will:
1. Create GitHub repo and push code
2. Deploy to Vercel with env vars
3. Run Supabase migration (if you provide SQL access or I guide you)
4. Return live URL

After deployment, rotate tokens in:
- GitHub: Settings → Developer settings → Personal access tokens
- Vercel: Settings → Tokens
- Supabase: Project → API → Reset keys
- OpenAI: Platform → API keys

## Option 2: Deploy yourself (Most Secure)

### Step 1: Supabase

1. Create project at https://supabase.com
2. Go to SQL Editor → New Query → Paste `migrations/001_initial_schema.sql` → Run
3. Go to Project Settings → API → Copy URL, anon key, service_role key
4. Add to `.env.local` locally and to Vercel env vars later

### Step 2: GitHub

```bash
cd personal-linkedin-agent
git init
git add .
git commit -m "feat: personal linkedin ai agent"
gh repo create personal-linkedin-agent --public --source=. --remote=origin --push
# Or manually create repo on github.com and:
# git remote add origin https://github.com/<you>/personal-linkedin-agent.git
# git push -u origin main
```

### Step 3: Vercel

1. Go to vercel.com/new → Import your GitHub repo
2. Add Environment Variables:
   - NEXT_PUBLIC_SUPABASE_URL
   - NEXT_PUBLIC_SUPABASE_ANON_KEY
   - SUPABASE_SERVICE_ROLE_KEY
   - OPENAI_API_KEY (optional, has mock fallback)
   - NEXT_PUBLIC_APP_URL (your vercel URL after first deploy)
3. Deploy → Copy URL
4. Update `n8n-workflows/*.json` URLs from `your-vercel-app.vercel.app` to your actual URL

### Step 4: n8n (Optional)

- Self-host n8n or use n8n.cloud
- Import workflows from `/n8n-workflows/`
- Configure Postgres credential (Supabase) and HTTP auth
- Update webhook URLs

## Testing Deployment

```bash
curl https://your-app.vercel.app/api/health
curl -X POST https://your-app.vercel.app/api/agent/briefing -H "Content-Type: application/json" -d '{"user_id":"philip"}'
```

## Security Notes

- Never commit `.env` or tokens to GitHub — `.gitignore` already excludes them
- Supabase service_role key must stay server-side only (Vercel env, not NEXT_PUBLIC)
- All agent endpoints currently open for MVP — add `AGENT_API_SECRET` header check in production
- LinkedIn: No password storage, no scraping, manual intake fallback ensures compliance

## What I Built For You

- ✅ Next.js 14 dashboard with approval inbox
- ✅ 5 API routes (briefing, welcome, reply, intake, health)
- ✅ Supabase schema with RLS, indexes, triggers
- ✅ 3 n8n workflows (morning briefing, new connection, reply assistant)
- ✅ Policy gate (blocks generic spam, sensitive commitments)
- ✅ Mock LLM fallback when OpenAI key missing
- ✅ Vercel Cron for 08:00 briefing
- ✅ Full README and deployment scripts

Live preview is running at port 3000 in this sandbox. Download the folder `personal-linkedin-agent` to deploy elsewhere.
