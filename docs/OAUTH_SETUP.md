# OAuth Setup Guide — Philip's Personal LinkedIn AI Agent
**Date:** 2026-09-22
**Official Docs:** https://learn.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/sign-in-with-linkedin-v2 and https://learn.microsoft.com/en-us/linkedin/shared/authentication/authorization-code-flow

## Overview

This app uses **Sign In with LinkedIn using OpenID Connect** (OIDC) — the current, self-serve, officially supported product for personal account authentication. It replaces deprecated r_liteprofile / r_emailaddress.

## Step 1: Create LinkedIn Developer App

1. Go to https://developer.linkedin.com/
2. Click **Create App**
3. Fill:
   - **App name:** `Philip's Personal LinkedIn AI Agent` (or your choice)
   - **LinkedIn Page:** Select your company page (Phoslab Inc page or personal). Required for verification. If you don't have a company page, create one first at linkedin.com/company/setup/new/
   - **Privacy policy URL:** `https://personal-linkedin-agent.vercel.app/privacy` (create a simple privacy page — required)
   - **App logo:** Upload Phoslab logo or personal photo
   - **Legal agreement:** Accept
4. Click **Create app**

## Step 2: Add Products

In your app dashboard:

1. Go to **Products** tab
2. Find **Sign In with LinkedIn using OpenID Connect** → Click **Request access** → It should be auto-approved within seconds (self-serve)
3. (Optional) Find **Share on LinkedIn** → Request access → Auto-approved — gives `w_member_social` for posting
4. **Do NOT request Marketing Developer Platform, Sales Navigator, etc.** unless you have a live product, verified page, and want to go through 4-12 week approval

After adding, go to **Auth** tab → Scroll to **OAuth 2.0 scopes** → You should see:
- `openid`
- `profile`
- `email`
- (If Share added) `w_member_social`

## Step 3: Configure Redirect URIs

In **Auth** tab → **OAuth 2.0 settings** → **Authorized redirect URLs for your app**:

Add these exact URLs (must match exactly, including https, no trailing slash mismatch):

For production:
```
https://personal-linkedin-agent.vercel.app/api/auth/linkedin/callback
```

For local development:
```
http://localhost:3000/api/auth/linkedin/callback
```

For preview deployments (Vercel):
```
https://personal-linkedin-agent-*.vercel.app/api/auth/linkedin/callback
```
Note: LinkedIn requires exact match, wildcards not supported. Add each preview URL manually if needed, or use only production + localhost for MVP.

**Rules:**
- Must be absolute URL (https://...)
- No URL fragments (#)
- Parameters ignored (https://example.com/callback?id=1 → treated as https://example.com/callback)
- HTTPS required for production, http://localhost allowed for dev

## Step 4: Get Credentials

In **Auth** tab → **Application credentials**:

- **Client ID:** e.g., `78abc123def...` — copy
- **Client Secret:** Click show, copy — keep secure, never expose to frontend

Also note:
- **Client ID** is public-ish (used in frontend redirect, but okay)
- **Client Secret** must stay server-side only

## Step 5: Configure Environment Variables

In your app (local `.env.local` and Vercel env vars):

```env
# LinkedIn OAuth
LINKEDIN_CLIENT_ID=78abc123def...
LINKEDIN_CLIENT_SECRET=your_secret_here
LINKEDIN_REDIRECT_URI=https://personal-linkedin-agent.vercel.app/api/auth/linkedin/callback
# For local dev, use http://localhost:3000/api/auth/linkedin/callback

# Optional: Share on LinkedIn
# Same credentials, but scope includes w_member_social

# App URL
NEXT_PUBLIC_APP_URL=https://personal-linkedin-agent.vercel.app

# Supabase (for token storage)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# OpenAI (for drafts)
OPENAI_API_KEY=sk-...

# Security: random 32-char string for encrypting tokens at rest
ENCRYPTION_KEY=your-random-32-char-key
AGENT_API_SECRET=your-random-secret-for-internal-api
```

In Vercel dashboard: Project → Settings → Environment Variables → Add each → Save → Redeploy

## Step 6: OAuth Flow Implementation (Already in App)

The app implements full Authorization Code Flow:

### 1. Generate Authorization URL (Frontend → Backend)

**Backend endpoint:** `GET /api/auth/linkedin`

- Generates `state` = random 32-char string + timestamp + HMAC
- Stores state in httpOnly, secure, sameSite=lax cookie (or Supabase session)
- Generates `code_verifier` + `code_challenge` for PKCE (optional but recommended)
- Redirects to:
  ```
  https://www.linkedin.com/oauth/v2/authorization?
    response_type=code
    &client_id=LINKEDIN_CLIENT_ID
    &redirect_uri=LINKEDIN_REDIRECT_URI
    &scope=openid%20profile%20email
    &state=STATE
  ```

### 2. User Authenticates on LinkedIn

- User sees LinkedIn login (or Google/Apple/passkey if enable_extended_login=true)
- User sees consent screen: "Philip's Personal LinkedIn AI Agent wants to access your name, photo, email"
- User approves

### 3. Callback (LinkedIn → Your App)

**Endpoint:** `GET /api/auth/linkedin/callback?code=...&state=...`

- Validate state matches cookie (CSRF protection) — reject if mismatch
- Check for error: `?error=access_denied&error_description=...` → Show user denied
- Exchange code for tokens:
  ```
  POST https://www.linkedin.com/oauth/v2/accessToken
  Content-Type: application/x-www-form-urlencoded

  grant_type=authorization_code
  code=CODE_FROM_CALLBACK
  client_id=LINKEDIN_CLIENT_ID
  client_secret=LINKEDIN_CLIENT_SECRET
  redirect_uri=LINKEDIN_REDIRECT_URI
  ```

- Response:
  ```json
  {
    "access_token": "AQV8...",
    "expires_in": 5184000,
    "refresh_token": "AQV9...",
    "refresh_token_expires_in": 31536000,
    "scope": "openid,profile,email",
    "id_token": "eyJ..."
  }
  ```

### 4. Validate ID Token & Get UserInfo

- Validate id_token JWT via `https://www.linkedin.com/oauth/openid/jwks` (RS256)
- Check iss=https://www.linkedin.com, aud=client_id, exp not expired
- Call UserInfo:
  ```
  GET https://api.linkedin.com/v2/userinfo
  Authorization: Bearer ACCESS_TOKEN
  ```
- Response:
  ```json
  {
    "sub": "782bbtaQ",
    "name": "Philip Opeyemi Ogungboye",
    "given_name": "Philip",
    "family_name": "Ogungboye",
    "picture": "https://media.licdn.com/...",
    "email": "philip@phoslab.ai",
    "email_verified": true,
    "locale": "en-US"
  }
  ```

### 5. Store Connection

- Encrypt access_token + refresh_token with ENCRYPTION_KEY (AES-256-GCM)
- Store in Supabase `integration_connections`:
  - user_id = your app user id (owner)
  - provider = 'linkedin_oidc'
  - linkedin_sub = sub
  - scopes = ['openid','profile','email']
  - connection_status = 'connected'
  - access_token_encrypted, refresh_token_encrypted, expires_at, refresh_expires_at
  - profile data: name, email, picture
- Create audit log

### 6. Display Status

UI shows:
- Connected as Philip Opeyemi Ogungboye
- Email: philip@phoslab.ai
- Granted: openid, profile, email
- Token expires: 60 days from now
- Connection health: healthy

## Step 7: Token Refresh

**Endpoint:** Internal cron or on-demand when API returns 401

```
POST https://www.linkedin.com/oauth/v2/accessToken
Content-Type: application/x-www-form-urlencoded

grant_type=refresh_token
refresh_token=REFRESH_TOKEN
client_id=LINKEDIN_CLIENT_ID
client_secret=LINKEDIN_CLIENT_SECRET
```

- If success: update encrypted tokens + expires_at
- If fails (refresh expired, revoked): mark as expired, prompt re-auth

**Note:** Some docs report OIDC may not always return refresh_token. Test with real credentials. If no refresh, implement re-auth flow.

## Step 8: Disconnection / Revocation

**Endpoint:** `POST /api/auth/linkedin/disconnect`

- Delete encrypted tokens from DB
- Update integration_connections status = 'disconnected'
- (If compliance opted in) Call `DELETE https://api.linkedin.com/v2/memberComplianceAuthorizations` or de-auth
- Clear session cookies
- Audit log
- UI shows "Not connected" + Connect button

User can also revoke via LinkedIn → Settings → Data Privacy → Permitted services → Remove app

## Step 9: Error Handling

| Error | Cause | UI Message |
|-------|-------|------------|
| `redirect_uri_mismatch` | Redirect URI not registered exactly | "Redirect URI mismatch — check LinkedIn app Auth tab" |
| `invalid_scope` | Scope not provisioned | "Scope not allowed — add product in Developer Portal" |
| `access_denied` | User denied consent | "You denied access — you can try again" |
| `invalid_state` | CSRF mismatch | "Invalid state — please try again, don't refresh callback" |
| 401 from userinfo | Token expired/revoked | "Connection expired — please reconnect" |
| 403 from userinfo | Not enough permissions | "Missing permissions — re-auth with correct scopes" |

## Security Checklist

- [ ] State generated securely (crypto.randomBytes 32)
- [ ] State validated on callback
- [ ] Redirect URI exact match
- [ ] Client secret never exposed to frontend
- [ ] Tokens encrypted at rest (AES-256-GCM)
- [ ] Tokens never in logs
- [ ] Secure cookies: httpOnly, secure (HTTPS), sameSite=lax, maxAge short for state
- [ ] PKCE implemented (code_challenge)
- [ ] ID token validated via JWKS
- [ ] No LinkedIn password requested
- [ ] No browser cookies/session extraction

## Testing OAuth

1. **Valid flow:** Click Connect LinkedIn → Approve → See connected status + profile
2. **Invalid state:** Manually change state param in callback URL → Should reject with CSRF error
3. **Denied:** Click Deny on LinkedIn consent → Should show "access denied" message, not crash
4. **Expired:** Manually set expires_at in past → Next API call should trigger refresh or re-auth prompt
5. **Disconnect:** Click Disconnect → Tokens deleted, status not connected, can reconnect

## Redirect URI Template for Vercel

For Vercel, you need to add both production and preview URLs. Since LinkedIn doesn't support wildcards, add:

- https://personal-linkedin-agent.vercel.app/api/auth/linkedin/callback (production)
- https://personal-linkedin-agent-git-main-phoslab.vercel.app/api/auth/linkedin/callback (if using git branch deploys)
- http://localhost:3000/api/auth/linkedin/callback (local)

Or use only production + localhost for MVP and test preview via production.

## Environment Variable Template (Copy to .env.local)

See `.env.example` in repo — includes all required vars with descriptions.
