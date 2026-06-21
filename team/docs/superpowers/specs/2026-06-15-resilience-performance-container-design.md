# Resilience, Performance, and Container Readiness Design

## Overview

This spec covers a combined improvement package for StepUp AI Learn across backend resilience, frontend performance, and production container readiness.

The package exists to satisfy these goals:

- AI circuit breaker state is visible and non-AI features remain usable when the LLM path is down.
- Recommendation acceptance is idempotent, so rapid duplicate submits do not create duplicate tasks.
- The health endpoint exposes AI breaker state.
- Client and server Dockerfiles are production-ready.
- Homepage performance is measured and improved using Lighthouse/Core Web Vitals evidence.

This spec is intentionally split into three workstreams that can be implemented in order without changing product scope.

## Goals

- Expose AI circuit breaker state through `GET /health`.
- Ensure task, goal, progress, auth, and calendar features remain available when AI provider calls fail.
- Make recommendation acceptance idempotent at the server layer.
- Replace development Dockerfiles with production-safe multi-stage images that run as non-root and include health checks.
- Measure homepage performance under a mobile/4G-like profile and improve it toward a sub-2-second main landing experience.
- Document Lighthouse/Core Web Vitals evidence in the project README/docs.

## Non-Goals

- No new external observability platform.
- No redesign of the product UX beyond performance or accessibility-related polish.
- No distributed idempotency framework or general-purpose request deduplication for every endpoint.
- No migration to a new hosting platform.

## Current State

### Backend resilience

- `team/server/src/services/llm-client.js` already maintains provider cooldown/circuit-breaker-like state for Gemini, Gemini paid, GLM, and OpenRouter.
- `team/server/src/services/ai.service.js` already converts repeated LLM failure into `AI_UNAVAILABLE`.
- `team/server/src/routes/health.js` only reports database health and does not include AI state.

### Recommendation acceptance

- `team/server/src/routes/ai.js` exposes `POST /api/ai/recommendations/:id/accept`.
- `team/server/src/services/ai.service.js` checks recommendation status before creating tasks.
- The current implementation can still race if two accept requests reach the server before the first transaction completes.
- The client disables the accept button while submitting, but UI protection alone is not enough.

### Container state

- `team/server/Dockerfile` and `team/client/Dockerfile` are development-oriented.
- Both install and run in a single stage.
- The client image starts the Vite dev server instead of serving a production build.
- Neither image is explicitly non-root or health-checked.

### Performance evidence

- README already contains accessibility evidence.
- Lighthouse accessibility score `98` was previously captured.
- There is no documented Lighthouse performance/Core Web Vitals result for the homepage under a mobile/4G-like profile.

## Workstream 1: Backend Resilience

### Design

Add a small public status API from the LLM client module so the rest of the server can ask for breaker state without knowing provider internals.

Proposed exported shape:

```js
getCircuitBreakerState()
```

Example returned value:

```json
{
  "status": "open",
  "providers": {
    "gemini": "open",
    "geminiPaid": "closed",
    "glm": "closed",
    "openrouter": "closed"
  }
}
```

Rules:

- `open` means the primary callable provider path is currently blocked due to cooldown/429 protection.
- `closed` means provider calls are allowed.
- Aggregate status is `open` if every configured remote provider path currently rejects due to breaker/cooldown.
- Aggregate status is `closed` if at least one configured provider path is still callable.
- For `LLM_PROVIDER=mock`, report `closed` because the AI path is locally available.

### Health endpoint changes

`GET /health` will continue to report database health, but add:

```json
"ai": {
  "status": "open"
}
```

Response semantics:

- Database health still determines HTTP `200` vs `503`.
- AI breaker state is informational and should not make `/health` fail on its own.
- If database is healthy and AI breaker is open, response remains successful but indicates degraded AI availability in payload.

### Non-AI continuity expectation

This requirement will be validated as:

- Task CRUD endpoints still respond normally.
- Goal endpoints still respond normally.
- Calendar/progress/dashboard data endpoints still respond normally.
- AI-specific endpoints fail fast and clearly with `AI_UNAVAILABLE` when the breaker is open.

No fake AI fallback response will be added to plan suggestion. The product should be honest about AI unavailability while keeping non-AI workflows alive.

## Workstream 2: Idempotent Recommendation Acceptance

### Problem

The current flow checks `rec.status !== 'pending'` before task creation, but this is vulnerable to concurrent accept calls.

### Design

Move idempotency enforcement into the transaction boundary:

1. Lock the recommendation row with `FOR UPDATE`.
2. Re-check status inside the transaction.
3. If status is `accepted`, return the already-created tasks for that recommendation instead of creating new ones.
4. If status is `pending`, create tasks once, mark recommendation as accepted, and write the audit log once.

### Data linkage

Accepted tasks must be queryable by recommendation identity. The smallest safe change is:

- add a nullable `recommendation_id` reference on tasks, or
- persist recommendation linkage in task metadata if the schema already supports structured metadata.

Recommendation:

- Prefer an explicit nullable `recommendation_id` column on `tasks` if migration cost is reasonable.
- If schema expansion is too invasive for the current sprint, use a structured metadata/source reference only if the repository layer already handles JSON metadata consistently.

The final implementation must guarantee deterministic lookup of tasks produced by one accepted recommendation.

### Response semantics

For duplicate accepts:

- the endpoint should still return `200`,
- response should include the same created tasks,
- no duplicate rows should be inserted,
- no second audit record should be created.

This is deliberately different from the current `409 Recommendation already processed` behavior.

## Workstream 3: Production-Ready Dockerfiles

### Server image

Requirements:

- multi-stage build,
- production dependency install only in runtime stage,
- non-root runtime user,
- `HEALTHCHECK` against `/health`,
- production start command using app entrypoint rather than dev tooling.

Recommended direction:

- builder stage installs dependencies,
- runtime stage copies only required app files and production dependencies,
- use `node:22-alpine`,
- switch to a non-root user such as `node`,
- expose `3000`.

### Client image

Requirements:

- multi-stage build,
- build static assets in one stage,
- serve production assets in runtime stage,
- non-root where supported,
- health check for HTTP serving process,
- no Vite dev server in production image.

Recommended direction:

- build with Node stage,
- serve with `nginx:alpine` or another lightweight static server,
- expose `80` or a configured static port,
- include a simple HTTP health check.

Recommendation:

- use `nginx:alpine` because it is conventional and simple for Vite output.

## Workstream 4: Homepage Performance and Core Web Vitals

### Measurement approach

Use Lighthouse in a mobile-style throttled run against a production build preview.

Metrics to capture:

- Performance score
- LCP
- CLS
- INP if available from the installed Lighthouse version
- TBT as a lab proxy when INP/FID is not directly available

Note:

- FID is not a reliable lab metric in modern Lighthouse runs. The evidence section will explain that INP/TBT is used as the practical replacement in local audits.

### Performance target

The requirement "homepage latency < 2 detik di koneksi 4G" will be interpreted as:

- the landing homepage should feel loaded within about 2 seconds under Lighthouse mobile/4G-style throttling,
- with LCP ideally in the "Good" range and major blocking work reduced.

Because this is lab-style measurement, the final documentation should present the exact measured numbers rather than claim a generic promise.

### Likely improvement levers

- reduce initial JavaScript on the homepage,
- avoid pulling heavy route code into the initial entry if not needed,
- optimize screenshot/hero media loading,
- set image sizing to avoid layout shift,
- prefer above-the-fold priority for the primary visual,
- reduce render-blocking work and unnecessary effects on first load.

### Acceptance

The final docs should include:

- Lighthouse score summary,
- LCP/CLS/INP or TBT values,
- what was improved,
- whether each measured metric is in the "Good" threshold.

## Testing Strategy

### Backend

- Unit tests for circuit breaker status helper.
- Health route tests covering:
  - DB healthy + AI closed
  - DB healthy + AI open
  - DB unhealthy
- Integration or service tests for duplicate accept requests:
  - first accept creates tasks,
  - second immediate accept returns same tasks,
  - task count remains stable,
  - audit row count remains one.

### Containers

- Build both images successfully.
- Run containers locally and verify health checks succeed.
- Confirm runtime user is not root where applicable.

### Frontend performance

- Run Lighthouse against production preview build.
- Record score and metrics before/after if changes are needed.

## Risks and Trade-Offs

- Adding explicit recommendation linkage to tasks may require a migration and test fixture updates.
- Returning `200` for repeated accept changes API semantics; this is appropriate for idempotency but must be reflected in tests.
- A sub-2-second homepage target may require trimming non-essential initial content or changing asset strategy.
- Client containerization choice affects hosting assumptions. `nginx` is simplest, but if the deployment stack expects a Node process, we may need a different runtime image.

## Recommended Implementation Order

1. Add breaker status helper and update `/health`.
2. Make accept recommendation idempotent with transactional locking and deterministic task lookup.
3. Add/update tests for resilience and idempotency.
4. Replace server Dockerfile with production-ready version.
5. Replace client Dockerfile with production-ready static-serving version.
6. Measure Lighthouse/Core Web Vitals on homepage.
7. Apply homepage optimizations as needed.
8. Update README/docs with final evidence.

## Expected Deliverables

- Updated health payload with AI breaker state.
- Idempotent recommendation accept behavior.
- New/updated backend tests.
- Production-ready client and server Dockerfiles.
- Lighthouse/Core Web Vitals evidence in docs.
- README updates covering resilience, performance, and container readiness.
