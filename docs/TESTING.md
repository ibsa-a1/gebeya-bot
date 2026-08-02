# Testing Document — Quality Assurance Blueprint

## 1. Testing Philosophy & Stack

| Layer | Tool | Scope |
|---|---|---|
| Backend unit tests | Jest | Individual service methods, isolated with mocked dependencies |
| Backend integration tests | Jest + a real test Postgres instance | Full request → controller → service → Prisma → test DB round trip |
| Frontend E2E | Playwright | Full browser flows against a running dev/staging stack |

Coverage expectation for MVP: every service method that touches money (`Payments`, `Orders`) or tenant isolation (`TenantGuard`, any tenant-scoped service) must have tests before being considered done — this is non-negotiable given both are the two categories of bug that would actually damage trust with resale clients.

## 2. Unit Testing Strategy (NestJS)

- Each service is tested in isolation using Jest's module-testing utilities, with `PrismaService` and external providers (Chapa, Groq, Gemini, Telegram) mocked.
- Example targets:
  - `ProductsService.create()` — rejects negative price/stock.
  - `PaymentsService.handleChapaWebhook()` — is idempotent given the same `txRef` twice.
  - `AuthService.verifyTelegramPayload()` — rejects a payload with an invalid hash or stale `auth_date`.
  - `TenantGuard` — denies access when a resolved `tenantId` doesn't match the requested resource.

## 3. Integration Testing Lifecycle

- NestJS's testing module spins up the real Nest application context against a **dedicated test PostgreSQL database** (separate from dev), migrated fresh before each test run.
- Verifies actual Prisma queries succeed against real constraints (unique indexes, foreign keys) — this catches schema-level bugs that mocked unit tests can't.
- Example: create a tenant → create a product under it → attempt to fetch that product using a *different* tenant's auth context → expect `403`/`404`, never the product data.
- Webhook idempotency is tested here specifically by POSTing the same mocked Chapa payload twice and asserting the `Order` only transitions once.

## 4. End-to-End Flow Controls (Playwright)

Core flows to automate, mirroring the PRD's step-by-step journeys:
1. **Merchant signup → login → add product → product appears in a mocked Mini App fetch.**
2. **Full buyer journey (mocked voice input via a pre-recorded sample transcript, not live audio in CI)** → product search → cart → checkout → mocked payment webhook fires → order status updates on the dashboard in real time.
3. **Dual login** — verify both the email/password path and a mocked Telegram Login payload both result in a valid authenticated session.
4. **Tenant isolation** — log in as Tenant A, confirm Tenant B's orders/products are never visible or fetchable, even via direct URL manipulation.

## 5. Testing the AI Pipeline

Live Groq/Gemini calls are **not** run in CI (cost, latency, and flakiness) — instead:
- Unit tests mock the `STTService`/`IntentService` responses with fixed sample outputs.
- A small, separate manual/local test script (not part of CI) runs against real sample Amharic voice notes periodically to sanity-check real-world transcription and intent-extraction quality — this is a manual QA step given the accuracy risk already flagged in the product plan, not something automatable meaningfully in CI.

## 6. CI Recommendation

GitHub Actions (free for public/private repos within generous limits) running:
- `server`: lint → unit tests → integration tests (against a spun-up Postgres service container) on every PR.
- `client`: lint → type-check → (Playwright E2E optionally on a schedule, since full E2E runs are slower — not required on every PR for MVP).
