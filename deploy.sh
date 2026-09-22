#!/bin/bash
set -e

# Philip's Personal LinkedIn AI Agent - Deploy Script
# Usage: ./deploy.sh

echo "=== Philip's Personal LinkedIn Agent - Deploy ==="

# Check env vars
if [ -z "$GITHUB_TOKEN" ]; then
  echo "GITHUB_TOKEN not set - will init git locally only"
fi

if [ -z "$VERCEL_TOKEN" ]; then
  echo "VERCEL_TOKEN not set - manual Vercel import required"
fi

# 1. Init git if not exists
if [ ! -d ".git" ]; then
  git init
  git add .
  git commit -m "feat: initial commit - personal linkedin ai agent"
  echo "Git initialized"
else
  git add .
  git commit -m "feat: update agent" || echo "No changes to commit"
fi

# 2. GitHub push (if token provided)
if [ -n "$GITHUB_TOKEN" ] && [ -n "$GITHUB_REPO" ]; then
  echo "Pushing to GitHub: $GITHUB_REPO"
  git remote remove origin 2>/dev/null || true
  git remote add origin https://oauth2:$GITHUB_TOKEN@github.com/$GITHUB_REPO.git
  git branch -M main
  git push -u origin main --force
  echo "✓ Pushed to GitHub"
else
  echo "Skipping GitHub push - set GITHUB_TOKEN and GITHUB_REPO (e.g. username/personal-linkedin-agent)"
fi

# 3. Vercel deploy (if token provided)
if [ -n "$VERCEL_TOKEN" ]; then
  echo "Deploying to Vercel..."
  npx vercel --prod --token $VERCEL_TOKEN --yes \
    --env NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
    --env NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY \
    --env SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY \
    --env OPENAI_API_KEY=$OPENAI_API_KEY
  
  echo "✓ Deployed to Vercel"
  echo "Don't forget to set env vars in Vercel dashboard if not set via CLI"
else
  echo "Skipping Vercel deploy - set VERCEL_TOKEN"
  echo "Manual deploy: Import GitHub repo in vercel.com/new"
fi

echo "=== Deploy Complete ==="
echo "Next steps:"
echo "1. Run migration in Supabase: migrations/001_initial_schema.sql"
echo "2. Set env vars in Vercel dashboard"
echo "3. Update n8n workflows URLs to your Vercel URL"
echo "4. Test: /api/health"
