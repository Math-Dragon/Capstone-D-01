# Production Auth, AI, ICS, and Webhooks Design

## Goal

Stabilize the production deployment shape for StepUp with:

- frontend hosted on Vercel
- backend hosted on Render
- JWT access token plus refresh token cookie auth flow working end-to-end
- AI suggest working with production API keys
- environment secrets managed through deployment configuration rather than hardcoded values
- iCalendar export for scheduled user tasks
- webhook registration endpoint for selected user events

This design intentionally keeps the existing architecture and extends it conservatively.

## Scope

### In scope

- Production-safe frontend/backend configuration for Vercel to Render deployment
- Auth cookie/CORS/env behavior needed for cross-origin production auth
- Production AI provider configuration and validation
- Cleanup of hardcoded production-sensitive config assumptions
- Export scheduled tasks to `.ics`
- Register webhook callbacks for:
  - `task.completed`
  - `ai.recommendation.accepted`

### Out of scope

- Full auth redesign
- Google Calendar API integration
- Apple Calendar direct sync
- General-purpose event bus
- Complex webhook retry queue or delivery worker farm
- Broad webhook event catalog beyond the initial two events

## Architecture Summary

The system remains a split deployment:

- Vercel hosts the React frontend
- Render hosts the Express backend

The frontend uses `VITE_API_URL` to call the backend. The backend uses environment-driven origin allowlists, production cookie flags, and provider keys. New calendar export and webhook registration capabilities live in the backend because they depend on authenticated user data and should not expose signing or delivery logic to the browser.

## Approach Options Considered

### Option 1: Pragmatic production hardening

Keep the current auth and AI architecture, then harden configuration and add the new capabilities in backend services and routes.

Pros:

- Lowest regression risk
- Fastest path to production readiness
- Fits the current codebase

Cons:

- Some existing architectural rough edges remain
- Webhook delivery remains intentionally simple in v1

### Option 2: Add abstraction layers first

Introduce a broader configuration service, event dispatch layer, and calendar abstraction before feature delivery.

Pros:

- Cleaner long-term extensibility

Cons:

- Higher complexity
- More files and more review surface
- Slower path to production readiness

### Option 3: Ship features first, harden later

Add `.ics` and webhooks quickly while only minimally adjusting production auth and secrets.

Pros:

- Short-term visible feature gain

Cons:

- Risks an unstable production deployment
- Harder to debug once deployed

### Recommended option

Option 1. It fits the current repo and produces the most useful outcome with the least disruption.

## Production Auth Design

### Current direction

The project already uses JWT access tokens plus refresh token flow. We will preserve that.

### Production behavior

- Access token continues to be used by the client for authenticated API requests
- Refresh token remains in an `httpOnly` cookie
- Frontend on Vercel calls backend on Render through the configured API base URL

### Required backend behavior

- CORS must allow the production Vercel origin from environment configuration
- Credentialed requests must remain enabled for refresh and session continuity
- Refresh cookie must use production-safe settings:
  - `httpOnly: true`
  - `secure: true` in production
  - `sameSite: 'none'` for cross-site Vercel to Render requests
- Cookie domain behavior should avoid unnecessary hardcoding unless the deployment shape strictly requires it

### Required frontend behavior

- Frontend must use `VITE_API_URL` in production
- Anonymous public routes must not trigger unnecessary refresh attempts
- Protected flows must still restore session when a valid refresh cookie exists

### Success criteria

- Login works in production
- Page refresh on protected routes can recover session through refresh token flow
- Logout clears session correctly
- Public homepage/login/register do not create noisy auth refresh traffic

## Production AI Design

### Configuration

AI suggest must run using production environment variables supplied by Render, not hardcoded keys or local-only assumptions.

Expected environment shape includes:

- provider selection
- provider API key
- provider model selection where applicable
- optional fallback provider keys if already supported by the current backend architecture

### Validation

Backend startup/config validation should distinguish between:

- local development using mock or non-production settings
- production deployment requiring a valid configured provider

If production AI configuration is missing or invalid:

- backend should fail clearly or mark AI unavailable in a way that is operationally obvious
- non-AI endpoints should not silently pretend AI is healthy

### Runtime behavior

- AI suggest route should use the configured production provider
- errors from missing keys, quota, or upstream failure must surface as clear operational errors
- observability should continue to record provider, token, latency, and cost information where that capability already exists

### Success criteria

- AI suggest returns real provider-backed recommendations in production
- provider secrets are only supplied via environment
- operational failures are diagnosable

## Secrets Management Design

### Principle

Production-sensitive values must come from environment configuration, not from committed source defaults that could be mistaken for deploy-ready configuration.

### What we want

- frontend production API URL managed via Vercel env
- backend secrets managed via Render env
- no hardcoded production callback URLs, provider keys, JWT secrets, or webhook secrets in tracked files

### Acceptable local development behavior

Local `.env` files may still exist for development, but code paths should not rely on development defaults in a way that masks missing production configuration.

### Success criteria

- deployment docs and runtime config clearly separate local dev from production
- secrets are not embedded in frontend bundles except public client-safe values that are intentionally public

## iCalendar Export Design

### Endpoint

Add an authenticated backend endpoint:

- `GET /api/calendar/export.ics`

### Data source

The export uses all scheduled tasks for the authenticated user that have a `planned_date`.

### Event mapping

Each scheduled task becomes one VEVENT:

- `SUMMARY`: task title
- `DESCRIPTION`: task description, related goal title if available, rationale if available
- `DTSTART`
- `DTEND`
- unique identifier for stable calendar import behavior

### Time mapping

If the task already has enough schedule detail, use it directly. If not, compute a fallback start time from `planned_slot`:

- morning -> fixed morning start
- afternoon -> fixed afternoon start
- evening -> fixed evening start

`duration_estimate` determines event end time. If duration is absent, use a conservative fallback duration.

### Response

- `Content-Type: text/calendar`
- response should be downloadable as an `.ics` attachment

### Success criteria

- user can download a valid `.ics` file
- file imports into Google Calendar and Apple Calendar
- only the authenticated user's scheduled tasks are exported

## Webhook Registration Design

### Endpoint

Add an authenticated backend endpoint:

- `POST /api/webhooks/register`

### Initial payload shape

```json
{
  "url": "https://example.com/webhooks/stepup",
  "events": ["task.completed", "ai.recommendation.accepted"],
  "secret": "optional-signing-secret"
}
```

### Validation rules

- URL must be valid HTTPS
- `events` must be a non-empty array
- all events must come from the supported allowlist
- duplicate equivalent registrations should be prevented or updated deterministically

### Persistence model

Store per-user webhook subscriptions with:

- target URL
- subscribed events
- optional signing secret
- active/inactive state
- last delivery result summary
- last error summary if any

### Delivery behavior

For v1, event delivery should be simple and observable:

- send POST requests from backend when supported events occur
- JSON payload includes event name, timestamp, user-owned entity identifiers, and event-specific data
- if a secret exists, sign the payload and send a signature header

### Initial supported events

- `task.completed`
- `ai.recommendation.accepted`

### Failure handling

For v1:

- log delivery attempt result
- store basic last status and last error
- do not build a full retry engine yet

### Success criteria

- user can register a webhook URL for allowed events
- backend sends callbacks when those events occur
- invalid URLs or unsupported events are rejected clearly

## Data and Storage Impact

### New or changed backend data

- webhook subscriptions table or equivalent persistence
- optional lightweight delivery metadata fields
- no major auth schema change is required for the production auth hardening itself

### Existing data reused

- tasks for calendar export
- AI recommendation acceptance flow for webhook trigger
- existing user identity/auth model

## Error Handling

### Auth

- invalid CORS/cookie situations should fail clearly and be diagnosable
- refresh failures on protected routes should lead to normal session-expired behavior

### AI

- missing production key should surface a clear configuration error
- provider outage/quota should surface as AI unavailable rather than ambiguous failure

### ICS export

- if the user has no scheduled tasks, return a valid empty calendar or a documented no-data behavior
- malformed schedule fields should fall back deterministically rather than crash export

### Webhooks

- invalid registration payload returns validation errors
- failed deliveries are logged and stored in lightweight status fields

## Testing Strategy

### Backend tests

- auth/cookie/CORS configuration by environment
- AI config validation behavior
- ICS export response type and event generation
- webhook registration validation and persistence
- webhook dispatch on:
  - task completion
  - AI recommendation acceptance

### Frontend tests

- production API base URL usage
- public route behavior avoids unnecessary refresh calls
- export action wiring if the frontend adds an export button in this implementation slice

### Manual verification

- login on deployed Vercel frontend against Render backend
- refresh protected route with valid refresh cookie
- run AI suggest with production provider key
- download and import `.ics`
- register a test webhook and confirm callback delivery

## Rollout Notes

Recommended implementation order:

1. production auth and env hardening
2. production AI config validation
3. `.ics` export
4. webhook registration and delivery

This order reduces debugging complexity because the deployment foundation is stabilized before new integrations are layered on top.
