# API Capability Matrix — Philip's Personal LinkedIn AI Agent
**Date:** 2026-09-22
**Source Verification:** All official URLs checked live on 2026-09-22

## Legend
- ✅ = Available self-serve (no approval)
- ⚠️ = Requires partner approval / verification
- ❌ = Closed / Not available to general developers
- UNKNOWN = Cannot verify, needs further testing or BD contact

## Matrix

| Capability | API/Product Name | Official Doc URL | OAuth Scopes | Available to Ordinary Dev? | Approval Required? | Personal Account? | Read/Write | Rate Limits | App Config Required | Limitations | Implementation / Fallback |
|------------|------------------|------------------|--------------|----------------------------|--------------------|-------------------|------------|-------------|---------------------|-------------|---------------------------|
| **A. OAuth login** | Sign In with LinkedIn using OpenID Connect | https://learn.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/sign-in-with-linkedin-v2 | openid, profile, email | ✅ Yes | No | Yes | Read (identity) | 100k/day/app | Create app, add product, configure redirect URI exact match HTTPS | Does not verify identity, email optional | Implement Auth Code Flow + state + PKCE, validate ID token via JWKS |
| **B. Read authorized profile** | UserInfo API | https://learn.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/sign-in-with-linkedin-v2 + https://api.linkedin.com/v2/userinfo | profile, email | ✅ Yes | No | Yes | Read | Low | Same as A | Only lite profile: sub, name, given_name, family_name, picture, locale, email. No headline, experience | Call GET /v2/userinfo with Bearer token, store sub as member identifier |
| **C. First-degree connections list** | Connections API / Compliance API | https://learn.microsoft.com/en-us/linkedin/shared/authentication/getting-access (Compliance Closed) + https://learn.microsoft.com/en-us/linkedin/compliance/integrations/compliance-events/ | r_compliance (closed) or r_1st_connections_size (MDP) | ❌ No | Yes, closed or MDP approval | Yes but restricted | Read | 10/query, 1/hour recommended | Need partner agreement, FINRA/SEC for compliance | No self-serve. Fallback: manual intake form storing profile_url, full_name, headline in Supabase contacts |
| **D. Detect new connections** | Invitations API + Compliance Events | https://learn.microsoft.com/en-us/linkedin/shared/integrations/communications/messages (invitations mentioned) | r_compliance or w_compliance | ❌ No | Closed | Yes but restricted | Read | 28-30 day window only | MemberComplianceAuthorizations opt-in | No real-time detection self-serve. Fallback: manual intake + webhook endpoint for future authorized source |
| **E. Real-time connection events / webhooks** | Webhooks API | https://learn.microsoft.com/en-us/linkedin/shared/api-guide/webhook-validation | Varies | ❌ No for personal | Approved use case required | No (org & lead gen only) | Read (events) | Must respond 2xx in 3s, re-validate every 2h, batch up to 10 | HTTPS endpoint, HMAC-SHA256 signature validation | Only ORGANIZATION_SOCIAL_ACTION_NOTIFICATIONS, LEAD_GEN, APPLY_CONNECT. Document as manual intake, not real-time |
| **F. Read personal inbox** | Messages API (create only) + Compliance Events API (read) | https://learn.microsoft.com/en-us/linkedin/shared/integrations/communications/messages + https://learn.microsoft.com/en-us/linkedin/compliance/integrations/compliance-events/ | r_compliance | ❌ No | Closed, private paid partnership | Yes but restricted | Read | count=10 recommended, 28-day window | memberComplianceAuthorizations | Messages API only creates, not reads. Compliance Events is only read surface but closed. Fallback: manual intake pasted message (untrusted input) |
| **G. Incoming-message events / webhooks** | Compliance Events API (polling) | Same as F | r_compliance | ❌ No | Closed | Yes but restricted | Read | Polling 1/hour/member | Same as F | No webhook for personal inbox. Compliance Events is polling changelog, not webhook. Fallback: manual intake |
| **H. Send personal DMs** | Messages API | https://learn.microsoft.com/en-us/linkedin/shared/integrations/communications/messages | w_member_social? Actually w_compliance? Docs say restricted to approved partners | ⚠️ Requires approved partner + strict rules | Yes, partner + API agreement | Yes, first-degree only | Write | 100-150/day/member best practice, 30-50 new conv/day | Must have specific member action, opt-in, editable draft, affirmative action, no automation | Even if approved, cannot automate/schedule. Implement approval-required draft + manual send via LinkedIn UI. Authorized API send disabled by default with policy gate |
| **I. Read conversation history** | Compliance Events API (siblingActivities) + Conversation Events API (Talent) | https://learn.microsoft.com/en-us/linkedin/compliance/integrations/compliance-events/ (siblingActivities up to 10) + https://learn.microsoft.com/en-us/linkedin/talent/recruiter-system-connect/recruiter-prospect-interactions/inmail-history | r_compliance or r_talent | ❌ No | Closed or Talent partner | Yes but restricted | Read | 12h range per call for conversationEvents | RSC partner | No self-serve. Fallback: store interactions from manual intake in Supabase |
| **J. Publish content as member** | Share on LinkedIn / Posts API | https://learn.microsoft.com/en-us/linkedin/marketing/integrations/community-management/shares/posts-api (or /v2/ugcPosts) | w_member_social | ✅ Yes | No (self-serve) | Yes | Write | ~100/day/member | Add Share on LinkedIn product | Can post, comment, like as member. Not required for MVP but implement as optional. Must not contain HTML for messages, but posts allow |
| **K. Token refresh / revocation / disconnect** | OAuth Token Endpoint | https://learn.microsoft.com/en-us/linkedin/shared/authentication/authorization-code-flow (Step 3) | N/A | ✅ Yes | No | Yes | Write | 60-day access, 365-day refresh | client_id, client_secret, redirect_uri | Refresh via grant_type=refresh_token. Revocation via user settings + app deletion of stored tokens. No official revocation endpoint for OIDC? Handle 401 as expired. Implement disconnect that deletes integration_connections and tokens |

## Detailed Capability Notes

### A. OAuth Login — IMPLEMENTED
- **Flow:** Authorization Code Flow (3-legged)
- **Steps:**
  1. Generate state (CSRF), store in secure cookie/session
  2. Redirect to `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=...&redirect_uri=...&scope=openid%20profile%20email&state=...`
  3. User authenticates on LinkedIn domain
  4. Callback receives `code` + `state`, validate state
  5. POST to `https://www.linkedin.com/oauth/v2/accessToken` with `grant_type=authorization_code`, code, client_id, client_secret, redirect_uri
  6. Receive access_token (60 days), refresh_token (365 days), id_token (JWT), expires_in, scope
  7. Validate id_token via `https://www.linkedin.com/oauth/openid/jwks`
  8. Call `GET https://api.linkedin.com/v2/userinfo` with Bearer token
- **Security:** State validation, exact redirect URI match, HTTPS, secure storage

### B. Profile Reading — IMPLEMENTED
- Endpoint: `GET https://api.linkedin.com/v2/userinfo`
- Headers: `Authorization: Bearer {access_token}`
- Returns: sub, name, given_name, family_name, picture, email, email_verified, locale
- Use sub as LinkedIn member ID (pairwise subject)
- Store in integration_connections and contacts? Actually owner profile in separate table

### C. Connections — NOT IMPLEMENTED (Fallback)
- **Official Endpoint:** `GET https://api.linkedin.com/v2/connections?q=viewer&count=...` — but requires r_compliance or partner
- **Error if attempted without approval:** `ACCESS_DENIED` or `not enough permissions`
- **Fallback Implementation:**
  - Manual intake form: full_name, headline, profile_url, relationship_notes
  - Supabase `contacts` table with user_id ownership
  - Idempotency via profile_url + user_id unique check
  - UI clearly labels as manually provided, not LinkedIn API data

### D/E. New Connection Detection — NOT REAL-TIME
- **Compliance Events Query:** `GET https://api.linkedin.com/v2/complianceEvents?q=memberAndApplication&projection=(elements*(...))` with startTime, count
- **Opt-in Required:** `POST https://api.linkedin.com/v2/memberComplianceAuthorizations` with {}
- **Limitation:** 28-30 days, only after opt-in, closed program
- **Webhook Alternative:** No personal webhook, only org social actions
- **Implementation:** Webhook endpoint `/api/webhooks/linkedin` exists for future, but currently returns 501 Not Implemented for personal events. Manual intake is primary.

### F/G/I. Inbox Reading — NOT IMPLEMENTED (Fallback)
- **Messages API:** Only POST to create, not GET to read
- **Compliance Events:** Only way to read, but closed
- **Implementation:** 
  - Manual intake: user pastes incoming message content
  - Treated as untrusted input (prompt injection protection)
  - Classification via LLM, but policy engine ensures no instruction override
  - Stored in `interactions` table kind=incoming_message

### H. Sending DMs — RESTRICTED
- **Endpoint:** `POST https://api.linkedin.com/v2/messages`
- **Body:** `{recipients: ["urn:li:person:..."], subject, body, messageType: "MEMBER_TO_MEMBER", thread?, attachments?}`
- **Rules (from docs):**
  - Must be specific member action, not automated/scheduled
  - Member must opt-in, see draft, be able to edit, take affirmative action
  - Must be posted at/around time of action
  - No incentives, no HTML
- **Implementation for MVP:**
  - Policy engine: `requires_approval=true` by default for all DM sends
  - UI: Approval inbox with Copy draft + Open LinkedIn buttons
  - No auto-send. If authorized API access granted in future, add separate send action with:
    - Fresh approval check
    - Expiration (e.g., 15 min)
    - Duplicate check
    - Audit log
    - Bound to exact draft text hash

### J. Publishing as Member — OPTIONAL SELF-SERVE
- **Endpoint:** `POST https://api.linkedin.com/rest/posts` (versioned) or `/v2/ugcPosts`
- **Headers:** `X-Restli-Protocol-Version: 2.0.0`, `Linkedin-Version: 202411`, `Authorization: Bearer`
- **Body:** `{author: "urn:li:person:{sub}", lifecycleState: "PUBLISHED", specificContent: {com.linkedin.ugc.ShareContent: {shareCommentary: {text: "..."}, shareMediaCategory: "NONE"}}}`
- **Scope:** w_member_social
- **Implementation:** Optional feature flag, approval required, not core to relationship agent

### K. Token Management — IMPLEMENTED
- **Refresh:** `POST https://www.linkedin.com/oauth/v2/accessToken` with `grant_type=refresh_token`, refresh_token, client_id, client_secret
- **Storage:** Encrypted at rest in Supabase `integration_connections` (or separate vault), never in frontend, never in logs
- **Expiration Handling:** On 401 from userinfo or other API, mark connection as expired, prompt re-auth
- **Disconnection:** Delete tokens, call de-authorization if compliance opted in, clear related cache, audit log
- **Security:** State validation, secure cookies (httpOnly, secure, sameSite), CSRF protection

## Rate Limits & Best Practices

| API | Limit | Best Practice |
|-----|-------|---------------|
| UserInfo | Not documented strict | Cache, don't call on every request |
| Messages (if approved) | 100-150/day/member, 30-50 new conv/day | Implement pacing, backoff on 429 |
| Compliance Events | count 1-50, recommended 10, 1/hour/member | Use latest processedAt as startTime for next poll |
| Webhooks | 3s response required, 10/batch, retry 5min/8h | Async processing, return 2xx immediately, verify X-LI-Signature |
| Posts (w_member_social) | ~100/day/member | Queue, avoid spam |

## Implementation Status Mapping

| Capability | Status in App | UI Label |
|------------|---------------|----------|
| A. OAuth login | ✅ Implemented (OIDC) | Real LinkedIn OAuth |
| B. Profile reading | ✅ Implemented via userinfo | Real data from LinkedIn |
| C. Connections list | ❌ Fallback: manual intake | Manually provided (not LinkedIn API) |
| D. New connection detection | ❌ Fallback: manual intake + webhook placeholder | Manual intake (real-time unavailable) |
| E. Connection webhooks | ❌ Not available for personal | Documented as unavailable |
| F. Read inbox | ❌ Fallback: manual intake | Manually pasted (not API) |
| G. Message webhooks | ❌ Not available | Documented as unavailable |
| H. Send DMs | ⚠️ Restricted + approval required | Draft + manual send (API disabled by default) |
| I. Conversation history | ❌ Fallback: stored interactions | From manual intake history |
| J. Publish as member | ✅ Optional (self-serve) | Real API if enabled |
| K. Token refresh/disconnect | ✅ Implemented | Real OAuth management |

## Sources Checked Date

All official URLs verified 2026-09-22. If LinkedIn updates docs, re-check.
