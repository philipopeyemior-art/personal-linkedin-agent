# Research Report — Philip's Personal LinkedIn AI Agent
**Date Checked:** 2026-09-22
**Researcher:** Arena Agent Mode
**Project Owner:** Philip Opeyemi Ogungboye

## Executive Summary

This report documents the official LinkedIn platform capabilities available to a private, single-user application as of September 2026. Research is based exclusively on official LinkedIn/Microsoft Learn documentation, verified live.

**Key Finding:** LinkedIn's official API is heavily gated. Only 3 permissions are self-serve (openid, profile, email, w_member_social). All messaging, connections, inbox reading, and real-time events require partner approval or are closed. Fully automatic personal DM sending is prohibited even for approved partners.

This does NOT block the project — it defines the compliant architecture: OAuth via OpenID Connect for identity, Share API for posting, manual intake fallback for connections/messages, policy gate, and approval-required sending.

## Official Sources Verified

| Source | URL | Status | Date Checked |
|--------|-----|--------|--------------|
| Sign In with LinkedIn using OpenID Connect | https://learn.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/sign-in-with-linkedin-v2 | Live | 2026-09-22 |
| Authorization Code Flow (3-legged) | https://learn.microsoft.com/en-us/linkedin/shared/authentication/authorization-code-flow | Live | 2026-09-22 |
| Getting Access - Permissions Overview | https://learn.microsoft.com/en-us/linkedin/shared/authentication/getting-access | Live | 2026-09-22 |
| Messages API | https://learn.microsoft.com/en-us/linkedin/shared/integrations/communications/messages | Live | 2026-09-22 |
| Compliance Events API | https://learn.microsoft.com/en-us/linkedin/compliance/integrations/compliance-events/ | Live | 2026-09-22 |
| Webhooks Validation | https://learn.microsoft.com/en-us/linkedin/shared/api-guide/webhook-validation | Live | 2026-09-22 |
| OpenID Connect Discovery | https://www.linkedin.com/oauth/.well-known/openid-configuration | Live | 2026-09-22 |
| User Agreement | https://www.linkedin.com/legal/user-agreement | Live | 2026-09-22 |
| Professional Community Policies | https://www.linkedin.com/legal/professional-community-policies | Live | 2026-09-22 |
| Developer Portal | https://developer.linkedin.com/ | Live | 2026-09-22 |

Third-party supplementary (not authoritative):
- https://connectsafely.ai/articles/linkedin-api-complete-guide-2026 — explains Open Permissions vs Partner
- https://gtm-api.com/linkedin-api/ — confirms Messages/Invitations in Compliance closed program
- StackOverflow threads on Connections API approval

## Research Methodology

1. Started from developer.linkedin.com → redirected to learn.microsoft.com/linkedin/
2. Verified OAuth flows via official Authorization Code Flow docs
3. Checked Getting Access page for permission tiers
4. Searched for Messages API, Invitations API, Connections API, Compliance Events API
5. Verified webhook support via Webhook Validation docs
6. Cross-checked with community reports for approval timelines
7. Documented rate limits, token lifetimes, and automation restrictions

## Capability Investigation

### A. OAuth Login and Account Connection

**Verdict: ✅ Available Self-Serve**

- **Product:** Sign In with LinkedIn using OpenID Connect
- **Docs:** https://learn.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/sign-in-with-linkedin-v2
- **Flow:** Authorization Code Flow (3-legged OAuth)
- **Scopes:** `openid`, `profile`, `email`
- **Endpoints:**
  - Authorization: `https://www.linkedin.com/oauth/v2/authorization`
  - Token: `https://www.linkedin.com/oauth/v2/accessToken`
  - UserInfo: `https://api.linkedin.com/v2/userinfo`
  - JWKS: `https://www.linkedin.com/oauth/openid/jwks`
  - Discovery: `https://www.linkedin.com/oauth/.well-known/openid-configuration`
- **Token Lifetime:** Access token 60 days, refresh token 365 days (per docs)
- **Requirements:** Create app in developer portal, add product, configure redirect URIs (exact match, HTTPS required except localhost)
- **Limitations:** Does NOT verify identity, only authentication. Email optional.
- **Implementation:** Standard OAuth with state parameter for CSRF, code exchange, ID token validation.

### B. Reading Authorized Profile Information

**Verdict: ✅ Available Self-Serve (Limited)**

- **Scopes:** `profile` gives name, given_name, family_name, picture, sub (subject identifier)
- **Email:** `email` gives primary email if verified
- **Endpoint:** `GET https://api.linkedin.com/v2/userinfo` with Bearer token
- **Response:** sub, name, given_name, family_name, picture, locale, email, email_verified
- **Not Available:** Full profile (headline, experience, education) requires r_basicprofile or other partner scopes
- **Source:** Same as A, plus StackOverflow confirming /v2/me deprecated, use /v2/userinfo

### C. Access to First-Degree Connections

**Verdict: ❌ Closed / Partner Approval Required**

- **Official Docs:** Getting Access page lists Compliance permissions as "Closed — access is not currently open to new applicants"
- **Connections API:** Documented as part of Compliance, requires `r_compliance`, only for regulated members (FINRA/SEC) for archiving
- **Alternative:** Marketing Developer Platform offers `r_1st_connections_size` (only count, not list) after approval
- **Community Evidence:** StackOverflow: "Unfortunately we cannot grant access to the connections API, this endpoint is part of our compliance API, which is only granted to partners who are helping Regulated LinkedIn Members"
- **Practical:** Cannot fetch full connections list via self-serve. Must use manual intake fallback.

### D. Detecting Newly Accepted Connections

**Verdict: ❌ No Self-Serve Real-Time Detection**

- **Official:** No webhook for personal connections
- **Compliance Events API:** Captures connection invitations sent/received, but only for regulated members opted in via `POST /memberComplianceAuthorizations`, and only past 28-30 days, and closed to new partners
- **Invitations API:** `POST /v2/invitations` documented but restricted to approved partners
- **Fallback:** Manual intake form where user provides public profile URL and context. Compliant and useful.

### E. Real-Time Connection Events / Webhooks

**Verdict: ❌ Limited to Organization & Lead Gen, Not Personal**

- **Official Webhooks:** Only for approved use cases: ORGANIZATION_SOCIAL_ACTION_NOTIFICATIONS (likes, comments, shares on org page), Lead Gen Form submissions, Apply Connect
- **Docs:** https://learn.microsoft.com/en-us/linkedin/shared/api-guide/webhook-validation — "This functionality is only available for applications with an approved use case for webhooks"
- **Validation:** HMAC-SHA256 with clientSecret, challenge-response within 3 seconds, re-validation every 2 hours, blocked after 3 failures
- **Personal:** No webhook for personal connection or message events for general developers
- **Implementation:** Cannot claim real-time for personal. Document as polling/manual.

### F. Reading Personal LinkedIn Inbox Messages

**Verdict: ❌ Closed**

- **Messages API:** Only for creating messages, not reading inbox. Docs: "Usage of this API is restricted to approved partners, subject to limitations via API agreement"
- **Compliance Events API:** Only API that archives messages, but closed, requires regulated member opt-in, 28-day window, paid private partnership
- **Community:** Multiple sources confirm reading inbox via official API not available to general developers
- **Fallback:** Manual intake where user pastes message content (treated as untrusted input)

### G. Receiving Incoming-Message Events / Webhooks

**Verdict: ❌ No Webhook for Personal Inbox**

- **Official:** No self-serve webhook for personal messages
- **Compliance Events API** is only surface that captures messages, but closed and not real-time webhook — it's polling-based changelog
- **Lead Gen Webhooks:** Only for lead forms, not personal DMs
- **Conclusion:** Must document as manual intake or user-provided notification

### H. Sending Personal LinkedIn Direct Messages

**Verdict: ⚠️ Restricted to Approved Partners + Strict Rules (No Automation)**

- **Endpoint:** `POST https://api.linkedin.com/v2/messages`
- **Docs:** https://learn.microsoft.com/en-us/linkedin/shared/integrations/communications/messages
- **Requirements:**
  - Approved partner status required
  - Recipients must be first-degree connections
  - Message must be associated with specific member action (not automated/scheduled)
  - Member must opt-in to sending, be shown draft, be able to edit subject/body/attachments, take affirmative action
  - Must be posted at/around time member took action
  - No incentives, no HTML
- **Schema:** recipients (Person URN[]), subject, body, messageType=MEMBER_TO_MEMBER, thread, attachments
- **Practical:** Even if approved, cannot automate bulk or scheduled sends. For MVP, implement approval-required draft + manual send via LinkedIn UI. Authorized API sending disabled by default.

### I. Reading Conversation History

**Verdict: ❌ Closed (Same as F)**

- **Compliance Events API** captures siblingActivities (up to 10 previous messages) but closed
- **Conversation Events API** (`GET /v2/conversationEvents`) is part of Talent/Recruiter System Connect, requires partner approval, for seat holders and prospects, not personal
- **Fallback:** Store conversation history from manual intake in Supabase `interactions` table

### J. Publishing Content as Member

**Verdict: ✅ Available Self-Serve (w_member_social)**

- **Product:** Share on LinkedIn
- **Scope:** `w_member_social`
- **Endpoint:** `POST https://api.linkedin.com/v2/ugcPosts` or `/v2/posts` (versioned: `/rest/posts`)
- **Docs:** Self-serve via Products tab, no approval required
- **Rate Limits:** ~100 calls/day/member reported
- **Use Case:** Could publish posts as member, but not required for relationship agent MVP. Implement as optional.

### K. Token Refresh, Expiration, Revocation, Disconnection

**Verdict: ✅ Standard OAuth with Refresh**

- **Access Token Lifetime:** 60 days (per Authorization Code Flow docs)
- **Refresh Token Lifetime:** 365 days (1 year)
- **Refresh Flow:** `grant_type=refresh_token` to `https://www.linkedin.com/oauth/v2/accessToken`
- **Revocation:** User can revoke via LinkedIn settings, app should handle 401 and trigger re-auth
- **Disconnection:** App should delete stored tokens, call compliance de-authorization if applicable, and clear integration_connections
- **Security:** Store encrypted, never in frontend, never in logs

## Rate Limits & Restrictions Summary

- **Self-Serve Calls:** 100k calls/day/app (reported), but specific endpoints lower
- **Messages API:** 100-150/day/member (if approved), 30-50 new conversations/day best practice
- **UserInfo:** Not heavily rate-limited
- **Webhooks:** Must respond 2xx within 3 seconds, batch up to 10, retry every 5 min for 8 hours
- **Compliance Events:** Recommended count=10, query each member once per hour, 28-30 day window

## Automation Restrictions (Critical)

From Messages API docs and User Agreement:
- Automated or scheduled events are NOT considered specific member action
- Must have member opt-in and ability to edit draft
- No incentives for sending/receiving
- Must not use unauthorized automation (browser bots, scraping, cookie extraction) — violates Professional Community Policies and User Agreement Section 8.2
- Compliance API access requires FINRA/SEC regulated use case

## Open vs Partner vs Closed

| Tier | Products | Access | Example Scopes |
|------|----------|--------|----------------|
| Open (Self-Serve) | Sign In with LinkedIn (OIDC), Share on LinkedIn | Instant via Developer Portal Products tab | openid, profile, email, w_member_social |
| Partner Approval | Marketing Developer Platform, Sales Navigator (SNAP), Talent Solutions, Learning | Apply via Developer Portal, 4-12 weeks, requires live product, verified company page, privacy policy | r_ads, rw_ads, r_organization_social, w_organization_social, r_sales_nav_* |
| Closed | Compliance Events, Compliance Snapshot, Messages, Invitations, Connections | Not accepting new partners, private paid partnership, FINRA/SEC required | r_compliance, w_compliance |

## Unresolved Questions (Marked UNKNOWN)

1. **Exact approval criteria for Messages API** — Docs say "approved partners, subject to API agreement" but don't list public application form. Marked UNKNOWN, need to contact Business Development.
2. **Future of Connections API** — Some sources mention Marketing Developer Platform grants r_1st_connections_size after approval, but full list still compliance-only. Marked UNKNOWN until MDP approval attempted.
3. **Token refresh for OIDC** — Docs mention refresh_token returned, but some implementations report no refresh for OIDC. Need to test with real credentials. Marked UNKNOWN.

## Recommendations for Implementation

1. Implement OIDC OAuth flow immediately (self-serve) for identity and connection status
2. Implement w_member_social as optional for posting (self-serve)
3. For connections/messages: Build manual intake + Supabase storage + draft generation — this is compliant and useful without partner approval
4. Design policy engine to disable bulk and automated sending by default
5. Document capability matrix clearly in UI — show what is real vs simulated
6. Build disconnection and data deletion flows
7. Prepare partner application materials for Marketing Developer Platform if Philip wants to pursue r_1st_connections_size and org features later

## Conclusion

Full automation of personal LinkedIn DMs via official API is NOT achievable for a general developer without partner approval, and even with approval, automated/scheduled sending is prohibited. However, a valuable, compliant personal relationship assistant IS achievable: OAuth identity, manual intake, AI draft generation, approval inbox, morning briefing, follow-ups, and optional Share API.

The research phase is complete. Proceed to capability matrix and architecture.
