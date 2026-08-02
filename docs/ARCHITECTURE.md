# Architecture Document

## 1. Network Topology

Two independently deployed applications, communicating over HTTPS:

```
┌─────────────────────────────┐        ┌───────────────────────────────────────────┐
│   Next.js (TypeScript)      │        │           Telegram Clients                 │
│   Dashboard — Vercel        │        │  (Tenant Bots, Auth Bot, Discovery Bot,    │
│   SSR + CSR                 │        │   Mini Apps embedded per tenant)           │
└──────────────┬───────────────┘        └───────────────────┬─────────────────────┘
               │  HTTPS / REST (JWT)                        │  Bot API + Webhooks
               ▼                                             ▼
        ┌───────────────────────────────────────────────────────────┐
        │              NestJS (TypeScript) — Render/Railway          │
        │  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌────────────┐ │
        │  │ Auth       │ │ Tenants   │ │ Products/ │ │ Telegram   │ │
        │  │ Module     │ │ Module    │ │ Orders    │ │ Bots       │ │
        │  └───────────┘ └───────────┘ └───────────┘ └────────────┘ │
        │  ┌───────────┐ ┌───────────┐                              │
        │  │ AI Module  │ │ Payments  │                              │
        │  │ (STT/NLP)  │ │ Module    │                              │
        │  └───────────┘ └───────────┘                              │
        └──────────┬─────────────────┬────────────────┬──────────────┘
                   │                 │                │
                   ▼                 ▼                ▼
         ┌──────────────────┐ ┌─────────────┐ ┌──────────────────┐
         │ PostgreSQL        │ │ Groq Whisper│ │ Chapa Sandbox /  │
         │ (Prisma ORM)      │ │ + Gemini    │ │ Mock Telebirr    │
         └──────────────────┘ └─────────────┘ └──────────────────┘
```

- The Next.js app never talks to Telegram, Chapa, Groq, or Gemini directly — it only talks to the NestJS API. All external integrations are backend-only.
- Every tenant's Telegram bot, plus the two platform-level bots (Auth Bot, Discovery Bot), point their webhooks at the same NestJS deployment, disambiguated by route (`/webhooks/telegram/tenant/:tenantId`, `/webhooks/telegram/platform/auth`, `/webhooks/telegram/platform/discovery`).

## 2. Multi-Tenancy Model

- **Platform-level bots** (owned by the platform, not any client): the **Auth Bot** (dashboard login only) and the **Discovery Bot** (cross-tenant search).
- **Tenant-level bots**: one per client business, registered independently via `@BotFather`, storing that tenant's storefront, catalog, and orders.
- Tenant isolation is enforced at the service layer: every query that touches `Product`, `Order`, or tenant configuration is scoped by `tenantId`, resolved from the authenticated user's `TenantMembership` (dashboard requests) or from the bot token that received the incoming Telegram update (bot requests) — never from a client-supplied ID alone.
- A `TenantGuard` (NestJS guard) runs on every tenant-scoped route and rejects any request whose resolved `tenantId` doesn't match the resource being accessed.

## 3. Data Fetching Protocol

- **Client ↔ Backend:** RESTful HTTP, JSON payloads, versioned under `/api/v1`.
- **Frontend data layer:** TanStack Query for server-state caching/invalidation (dashboard order lists, product tables), Axios as the underlying HTTP client with a shared instance that attaches the JWT and handles 401 refresh.
- **Real-time order updates on the dashboard:** polling via TanStack Query refetch intervals for v1 (simplest, zero extra infra); a WebSocket/SSE upgrade is a valid future-scale item, not required for MVP.

## 4. Authentication & Session Lifecycle

Two supported login paths, converging on one `User` model:

**Email/Password**
1. Signup: password hashed with bcrypt, `User` created.
2. Login: credentials verified → NestJS issues a short-lived JWT **access token** (~15 min) and a longer-lived **refresh token** (~7 days), refresh token set as an `HttpOnly`, `Secure` cookie.
3. Access token is sent as a `Bearer` header on API requests; a NestJS Guard validates it per-request.
4. On access token expiry, the frontend calls a `/auth/refresh` endpoint using the refresh cookie to obtain a new access token.

**Telegram Login**
1. Dashboard renders Telegram's official Login Widget, bound to the platform's dedicated **Auth Bot** (`/setdomain` configured once, on the platform's own domain — never a tenant's bot).
2. On success, Telegram returns a signed payload (user id, name, auth date, hash) to the frontend.
3. Backend verifies the hash using the Auth Bot's token (per Telegram's documented verification algorithm) and checks `auth_date` freshness.
4. Backend finds an existing `User` by `telegramId`, or creates one, then issues the same access/refresh token pair as the email/password path.

Both paths result in a `User` linked to one or more `Tenant` records via `TenantMembership` (role: `OWNER` or `STAFF`), which is what the `TenantGuard` resolves on every request.

## 5. Global Error Handling Contract

**Backend (NestJS):** a global exception filter catches all thrown errors and normalizes them into:
```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Human-readable explanation",
  "path": "/api/v1/products",
  "timestamp": "2026-08-02T10:00:00.000Z"
}
```
Validation errors (via `class-validator` DTOs) are automatically caught by NestJS's built-in `ValidationPipe` and shaped into this same contract with field-level detail in `message`.

**Frontend (Next.js):** a shared API client wrapper inspects the standardized error shape and:
- Surfaces `message` directly in toast/inline UI for 400/422 (user-fixable) errors.
- Redirects to login on 401 (after a failed refresh attempt).
- Shows a generic fallback + error boundary for 500-class errors, logging details for debugging without exposing internals to the user.

## 6. External Service Integration Points

| Service | Purpose | Called from |
|---|---|---|
| Groq (Whisper large-v3-turbo) | Voice note transcription | AI Module |
| Google Gemini 1.5 Flash | Intent/entity extraction from transcribed or typed text | AI Module |
| Chapa API (sandbox) | Payment checkout link generation, webhook verification | Payments Module |
| Mocked Telebirr endpoint | Simulated payment flow (internal only, clearly labeled as mock) | Payments Module |
| Telegram Bot API | All bot messaging, webhook receipt, Mini App integration | Telegram Module |

All secrets (bot tokens, Chapa keys, Gemini/Groq API keys) are stored as encrypted values in the database (per-tenant) or as environment variables (platform-level keys) — never in source control, never returned in any API response.
