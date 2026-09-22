# Platform Limitations — Philip's Personal LinkedIn AI Agent
**Date:** 2026-09-22
**Official Sources:** All URLs verified live

## Summary

LinkedIn's API is intentionally restricted. This document lists what is NOT possible for a general developer, what requires approval, and what is closed, with official evidence.

## 1. Connections Access

**Limitation:** Cannot retrieve full first-degree connections list via self-serve.

**Official Evidence:**
- Getting Access page: https://learn.microsoft.com/en-us/linkedin/shared/authentication/getting-access — Compliance permissions listed as "Closed — access is not currently open to new applicants"
- StackOverflow (LinkedIn Developer Support): "Unfortunately we cannot grant access to the connections API, this endpoint is part of our compliance API, which is only granted to partners who are helping Regulated LinkedIn Members and Customers facilitate regulatory compliant usage of Social Media. (i.e.- it exists solely for monitoring and auditing activity where such monitoring/auditing is legally required by the SEC)."
- gtm-api.com: "A Messages API, an Invitations API and a Connections API all exist in LinkedIn's documentation. All three sit under Compliance, whose access page lists its permissions for reference only and states that access may not be requested"

**Impact:** App cannot auto-populate contacts from LinkedIn. Must use manual intake.

**Workaround:** Manual intake form storing profile_url, full_name, headline, relationship_notes in Supabase contacts table. Clearly labeled as manually provided, not API data.

## 2. Real-Time Connection Detection

**Limitation:** No webhook or real-time event for new personal connections.

**Official Evidence:**
- Webhooks docs: https://learn.microsoft.com/en-us/linkedin/shared/api-guide/webhook-validation — "This functionality is only available for applications with an approved use case for webhooks" and only for ORGANIZATION_SOCIAL_ACTION_NOTIFICATIONS, Lead Gen, etc.
- Compliance Events API: https://learn.microsoft.com/en-us/linkedin/compliance/integrations/compliance-events/ — requires opt-in via POST /memberComplianceAuthorizations, only captures activities after opt-in, 28-30 day window, closed program
- Invitations API: POST /v2/invitations documented but restricted to approved partners

**Impact:** Cannot trigger welcome workflow instantly when someone connects.

**Workaround:** Manual intake form + webhook placeholder endpoint that returns 501 for personal events. Document as "Manual intake (real-time unavailable)" in UI.

## 3. Reading Personal Inbox

**Limitation:** Cannot read personal LinkedIn inbox via official API as general developer.

**Official Evidence:**
- Messages API docs: https://learn.microsoft.com/en-us/linkedin/shared/integrations/communications/messages — "Usage of this API is restricted to approved partners, subject to limitations via API agreement" and only describes POST to create messages, not GET to read
- ConnectSafely article: "Sending vs. Reading: The Split Nobody Explains — Send a message: Messages API — POST https://api.linkedin.com/v2/messages — Restricted to approved partners; Read a member's inbox: Compliance Events API — not the Messages API — Closed. Private, paid partner program; not accepting new applicants"
- Compliance Events API: Only surface that archives messages, but closed, requires FINRA/SEC, paid private partnership, 28-day window

**Impact:** App cannot monitor inbox or auto-detect incoming messages.

**Workaround:** Manual intake where user pastes message content. Treat as untrusted input, classify, generate draft. Store in interactions table.

## 4. Real-Time Incoming Message Webhooks

**Limitation:** No webhook for personal incoming messages.

**Official Evidence:**
- Same as above — Compliance Events is polling, not webhook, and closed
- Webhooks docs only list org social actions, lead gen, apply connect — no personal messaging
- ConnectSafely: "Is there a LinkedIn API webhook for incoming messages? Not one available to general developers. Incoming message data is exposed only through the Compliance Events changelog for members explicitly registered as regulated"

**Impact:** Cannot push notification instantly on new message.

**Workaround:** Manual intake + configurable polling placeholder (but polling not supported either, so manual is primary). Document clearly.

## 5. Sending Personal DMs — Automation Prohibited

**Limitation:** Even for approved partners, automated/scheduled sending is prohibited. Must have specific member action, opt-in, editable draft, affirmative action.

**Official Evidence:**
- Messages API docs: https://learn.microsoft.com/en-us/linkedin/shared/integrations/communications/messages — Requirements section:
  - "A message must be associated with a specific member action. Member actions do not include an automated or scheduled event."
  - "Members must opt in to sending a message, as opposed to opting out"
  - "If you choose to present the member with a pre-prepared message, you must provide the member with a proposed draft of the pre-prepared message, including the subject, body, and attachments. The member must be able to edit the content"
  - "A message must be posted at, or around the time the member took action to send the message"
  - "An application must not offer any direct or indirect incentive"
  - "Messages posted on LinkedIn must not contain any HTML"
- Swarmhit: "LinkedIn prohibits automated or scheduled sending through it"
- LinkedAPI: "LinkedIn requires each message to follow 'a specific member action' and states that those 'do not include an automated or scheduled event'"

**Impact:** Cannot implement fully automatic messaging, even if partner approval obtained.

**Workaround:** Policy engine with approval required by default. UI shows draft + Copy + Open LinkedIn. Authorized API sending disabled by default. If approval obtained, implement with safeguards: bound to exact draft text hash, expiration, audit log, duplicate check.

## 6. Bulk Outreach

**Limitation:** Prohibited.

**Official Evidence:**
- Professional Community Policies: https://www.linkedin.com/legal/professional-community-policies — prohibits spam, bulk, automated invitations/messages
- User Agreement Section 8.2: Prohibits scraping, bots, browser extensions that scrape or automate
- Messages API rules above also prohibit bulk

**Impact:** App must not allow bulk messaging.

**Implementation:** Policy engine: bulk disabled, rate limiting, no bulk UI.

## 7. Browser Automation / Scraping / Cookie Extraction

**Limitation:** Prohibited, risks account restriction.

**Official Evidence:**
- User Agreement: Prohibits unauthorized software, bots, scrapers, browser extensions that scrape
- Professional Community Policies: Prohibits automation that bypasses controls
- Microsoft Learn: LinkedIn Help docs state "LinkedIn explicitly prohibits unauthorized third-party software that scrapes or automates activity on its website, including sending messages through unauthorized automation"

**Impact:** Must not implement browser bot that stores LinkedIn password, extracts session cookies, watches connections page.

**Implementation:** No password storage, no cookie extraction, no scraping. Use official OAuth + manual intake only.

## 8. Webhooks for Personal Use Cases

**Limitation:** Only for approved org/lead use cases.

**Official Evidence:**
- Webhooks docs: https://learn.microsoft.com/en-us/linkedin/shared/api-guide/webhook-validation — "This functionality is only available for applications with an approved use case for webhooks"
- Supported events: ORGANIZATION_SOCIAL_ACTION_NOTIFICATIONS, Lead Gen (r_marketing_leadgen_automation), Apply Connect
- Validation: HMAC-SHA256, challenge-response within 3 seconds, re-validation every 2 hours, blocked after 3 failures
- No personal connection/message events

**Impact:** Cannot claim real-time for personal agent.

**Implementation:** Document actual event delivery model per integration: official webhook (not available), supported polling (not available for personal), manual intake (available), unavailable.

## 9. Token Refresh Uncertainty

**Limitation:** OIDC may not always return refresh token, or refresh may fail.

**Official Evidence:**
- Authorization Code Flow docs mention refresh_token returned, expires_in 60 days, refresh_token_expires_in 1 year
- Some community reports (StackOverflow, Reddit) report no refresh token for OIDC in some cases
- Supabase docs also note LinkedIn OIDC migration

**Impact:** App must handle case where refresh not available.

**Implementation:** If refresh fails or not present, mark connection as expired, prompt re-auth with clear UI: "Connection expired — please reconnect". Implement reconnection flow.

## 10. Profile Data Limited Self-Serve

**Limitation:** Self-serve only gives lite profile (sub, name, picture, email). No headline, experience, etc.

**Official Evidence:**
- OIDC docs: claims_supported = iss, aud, iat, exp, sub, name, given_name, family_name, picture, email, email_verified, locale
- No headline, no vanityName, no positions
- r_basicprofile requires partner approval

**Impact:** Cannot auto-fill headline from OAuth.

**Workaround:** Allow user to manually add headline in contacts, or request w_member_social? Actually w_member_social is for posting, not profile reading. So manual entry.

## 11. Rate Limits & Data Retention

**Limitations:**
- Messages API: 100-150/day/member best practice, 30-50 new conv/day
- Compliance Events: 28-30 day window only, nothing before opt-in, count 1-50 recommended 10, 1/hour/member
- Webhooks: Must respond 2xx in 3s, batch up to 10, retry 5min for 8h, retention 60 days via pull API
- UserInfo: Not strict but cache

**Impact:** Design polling intervals within limits, handle 429 with backoff.

## 12. Partner Approval Reality

**Limitation:** Approval takes 4-12 weeks, often rejected, requires live product, verified company page, privacy policy, demo.

**Official Evidence:**
- Getting Access: Marketing, Sales, Talent require approval
- Community: Evaboot, Phyllo, ConnectSafely all report 4-8 weeks fast path, 3-4 months typical, 6+ months or never for edge cases
- Requirements: Live product with real users (no prototypes), verified company page, clear use case that fits partner track, data protection policies, business relationship helpful

**Impact:** Cannot rely on partner approval for MVP. Build self-serve features first, document what requires approval as BLOCKED BY EXTERNAL ACCESS.

## Summary of What Is Possible Today (Self-Serve)

✅ OAuth login via OIDC (openid, profile, email)
✅ Read lite profile via userinfo
✅ Post as member via w_member_social (optional)
✅ Manual intake for connections/messages
✅ AI draft generation
✅ Approval inbox
✅ Morning briefing with saved context
✅ Follow-ups
✅ Token refresh/disconnect
✅ Policy engine

❌ Full connections list
❌ Real-time connection detection
❌ Real-time message webhooks
❌ Reading inbox via API
❌ Automated DM sending
❌ Bulk outreach
❌ Browser automation/scraping

All limitations documented with official sources. App UI must clearly distinguish real vs manually provided data and must not claim unsupported capabilities.
