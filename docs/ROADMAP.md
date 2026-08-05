# Build Roadmap — File-by-File, Folder-by-Folder

This is the exact build order for Gebeya Bot. Each phase lists every file to create, in the order to create it, with what goes in it. Do not skip ahead a phase — later phases assume earlier ones compile and run.

**Assumption locked in for this roadmap:** the Telegram Mini App storefront is built as routes inside `client/` (Next.js), not a separate app — Telegram Mini Apps just open a URL, so no third project is needed.

---

## Phase 0 — Repo & Environment Bootstrap

**Goal:** empty repo → both apps installed, Postgres running, both dev servers boot with no errors.

```
project-root/
├── .gitignore
├── README.md                    ← already written
├── docs/                        ← already written (8 files)
├── client/
└── server/
```

1. `git init`, add root `.gitignore` (node_modules, .env, .next, dist, etc.)
2. Copy the 8 finished docs into `docs/`, copy the finished `README.md` to root.
3. `server/`: `npx @nestjs/cli new server --package-manager npm` (or scaffold manually).
4. `client/`: `npx create-next-app@latest client --typescript --tailwind --app`
5. Run local PostgreSQL via Docker (per `SETUP.md`).
6. Create `server/.env` and `client/.env.local` from the variable lists in `SETUP.md`.
7. Commit: `chore: bootstrap repo structure`

**Definition of done:** `npm run start:dev` in `server/` boots the default Nest app on :4000; `npm run dev` in `client/` boots the default Next app on :3000; Docker Postgres container is running and reachable.

---

## Phase 1 — Database Layer (`server/prisma/`)

Build order:

```
server/
├── prisma/
│   ├── schema.prisma            ← 1st: paste full schema from DATABASE.md
│   └── seed.ts                  ← 3rd: demo tenant, user, products, orders
└── src/
    └── prisma/
        ├── prisma.module.ts     ← 4th
        └── prisma.service.ts    ← 4th (extends PrismaClient, handles connect/disconnect lifecycle)
```

1. `schema.prisma` — copy exactly from `DATABASE.md` (all models: `User`, `Tenant`, `TenantMembership`, `Product`, `Order`, `OrderItem`, `Payment`, `VoiceQueryLog`, all enums).
2. Run `npx prisma migrate dev --name init` — 2nd step, generates the migration and applies it.
3. `seed.ts` — one demo tenant, one demo user (`OWNER` membership), ~15 ETB-priced products, 2-3 sample orders across different statuses.
4. `prisma.service.ts` / `prisma.module.ts` — thin wrapper so every other module injects `PrismaService` instead of instantiating `PrismaClient` directly.

**Definition of done:** `npx prisma studio` shows real seeded data across all tables; `PrismaModule` is importable app-wide.

---

## Phase 2 — Backend Core Scaffolding (`server/src/common/`, `config/`)

```
server/src/
├── config/
│   └── env.validation.ts        ← 1st: validates all required env vars on boot, fails fast if missing
├── common/
│   ├── filters/
│   │   └── http-exception.filter.ts   ← 2nd: global error shape from ARCHITECTURE.md
│   ├── interceptors/
│   │   └── logging.interceptor.ts     ← 3rd: request/response logging w/ correlation ID
│   ├── decorators/
│   │   ├── current-user.decorator.ts  ← 4th
│   │   └── current-tenant.decorator.ts← 4th
│   └── pipes/
│       └── (uses Nest's built-in ValidationPipe globally — no custom pipe needed yet)
├── app.module.ts                 ← 5th: wires PrismaModule + config + global filter/interceptor
└── main.ts                       ← 6th: bootstrap, global pipes/filters, CORS, listen on PORT
```

**Definition of done:** hitting any non-existent route returns the standardized error JSON from `ARCHITECTURE.md §5`; app fails to boot with a clear message if a required env var is missing.

---

## Phase 3 — Auth Module (`server/src/modules/auth/`)

This is the highest-priority module — almost everything else depends on `JwtAuthGuard` and `TenantGuard` existing.

```
server/src/modules/auth/
├── dto/
│   ├── signup.dto.ts             ← 1st
│   ├── login.dto.ts              ← 1st
│   └── telegram-auth.dto.ts      ← 1st (id, first_name, username?, auth_date, hash)
├── strategies/
│   ├── jwt.strategy.ts           ← 2nd (validates access token, attaches user to request)
│   └── telegram.strategy.ts      ← 3rd (verifies Telegram widget hash per their doc'd algorithm)
├── guards/
│   ├── jwt-auth.guard.ts         ← 4th
│   └── tenant.guard.ts           ← 5th (resolves tenantId from route + TenantMembership, rejects mismatch)
├── crypto/
│   └── crypto.service.ts         ← 6th (AES encrypt/decrypt for bot tokens & Chapa keys — build before tenants module needs it)
├── auth.service.ts               ← 7th (signup, login, telegram login, refresh, logout logic)
├── auth.controller.ts            ← 8th (routes from API.md §3 Auth section)
└── auth.module.ts                ← 9th
```

1. DTOs first — nothing else compiles without them.
2. `jwt.strategy.ts` — standard Passport JWT strategy reading `JWT_ACCESS_SECRET`.
3. `telegram.strategy.ts` — implements Telegram's documented hash-verification (HMAC-SHA256 using bot token as key), checks `auth_date` freshness.
4. `jwt-auth.guard.ts` — wraps the JWT strategy for use on protected routes.
5. `tenant.guard.ts` — the multi-tenancy enforcement point; write this carefully, with unit tests, before building any tenant-scoped module.
6. `crypto.service.ts` — needed here because `auth.service.ts` doesn't use it directly, but `tenants.service.ts` (Phase 5) will, and it belongs conceptually with security code.
7. `auth.service.ts` — bcrypt hashing, JWT signing (access + refresh), the four flows from `ARCHITECTURE.md §4`.
8. `auth.controller.ts` — wire up `/auth/signup`, `/auth/login`, `/auth/telegram`, `/auth/refresh`, `/auth/logout`.
9. `auth.module.ts` — register Passport, JwtModule, export guards for use by other modules.

**Tests to write now (`auth.service.spec.ts`, `tenant.guard.spec.ts`):** invalid password rejected, expired refresh token rejected, invalid Telegram hash rejected, `TenantGuard` denies mismatched tenant.

**Definition of done:** can signup, login, and receive a working JWT via Postman/curl; a protected test route correctly rejects requests without a valid token.

---

## Phase 4 — Users Module (`server/src/modules/users/`)

```
server/src/modules/users/
├── dto/
│   └── update-user.dto.ts        ← 1st
├── users.service.ts               ← 2nd
├── users.controller.ts            ← 3rd (GET /users/me, PATCH /users/me)
└── users.module.ts                ← 4th
```

**Definition of done:** authenticated `GET /users/me` returns the logged-in user plus their tenant memberships.

---

## Phase 5 — Tenants Module (`server/src/modules/tenants/`)

```
server/src/modules/tenants/
├── dto/
│   ├── create-tenant.dto.ts      ← 1st
│   └── update-tenant.dto.ts      ← 1st
├── tenants.service.ts             ← 2nd (uses CryptoService to encrypt botToken/chapaSecretKey before save, decrypt on internal use, always mask on API output)
├── tenants.controller.ts          ← 3rd (routes from API.md §3 Tenants section, guarded by TenantGuard)
└── tenants.module.ts              ← 4th
```

**Definition of done:** platform owner can create a tenant via API, secrets are stored encrypted in Postgres (verify by inspecting the raw DB row), `GET /tenants/:id` never returns raw secrets.

---

## Phase 6 — Products Module (`server/src/modules/products/`)

```
server/src/modules/products/
├── dto/
│   ├── create-product.dto.ts     ← 1st
│   ├── update-product.dto.ts     ← 1st
│   └── query-products.dto.ts     ← 1st (category, search, page)
├── products.service.ts            ← 2nd
├── products.controller.ts         ← 3rd (all routes tenant-scoped)
└── products.module.ts             ← 4th
```

**Definition of done:** full CRUD works via API; a request scoped to Tenant A can never read/write Tenant B's products (write the integration test for this now).

---

## Phase 7 — Orders Module (`server/src/modules/orders/`)

```
server/src/modules/orders/
├── dto/
│   ├── create-order.dto.ts       ← 1st (used internally by Mini App checkout, not exposed raw)
│   ├── update-order-status.dto.ts← 1st
│   └── query-orders.dto.ts       ← 1st
├── orders.service.ts              ← 2nd (stock re-validation on order creation — see edge case in PRD §5)
├── orders.controller.ts           ← 3rd
└── orders.module.ts               ← 4th
```

**Definition of done:** creating an order decrements stock atomically; attempting to order more than available stock fails cleanly with a 422.

---

## Phase 8 — Payments Module (`server/src/modules/payments/`)

```
server/src/modules/payments/
├── dto/
│   ├── initialize-payment.dto.ts ← 1st
│   └── chapa-webhook.dto.ts      ← 1st
├── providers/
│   ├── chapa.provider.ts         ← 2nd (calls Chapa's initialize endpoint, returns checkout URL)
│   └── mock-telebirr.provider.ts ← 3rd (2-second delayed self-invoked webhook, clearly labeled as mock in code comments)
├── payments.service.ts            ← 4th (idempotency check on txRef before processing any webhook)
├── payments.controller.ts         ← 5th (initialize + webhook routes from API.md §3 Payments section)
└── payments.module.ts             ← 6th
```

**Test to write now:** POST the same mocked Chapa webhook payload twice — assert the order only transitions from `PENDING` to `PAID` once.

**Definition of done:** a test order can be paid end-to-end via Chapa sandbox, webhook flips status correctly, duplicate webhook delivery is a safe no-op.

---

## Phase 9 — AI Module (`server/src/modules/ai/`)

```
server/src/modules/ai/
├── dto/
│   ├── transcribe.dto.ts         ← 1st
│   └── extract-intent.dto.ts     ← 1st
├── stt.service.ts                 ← 2nd (Groq Whisper call, takes a Telegram file URL, returns transcript)
├── intent.service.ts              ← 3rd (Gemini 3.6 Flash call w/ Ethiopian-commerce-tuned system prompt, returns structured JSON)
└── ai.module.ts                    ← 4th
```

**Manual QA step now (not automatable in CI):** run 10 real sample Amharic voice notes through `stt.service.ts` and `intent.service.ts` together, log accuracy — this is the highest-risk piece, validate it early per our earlier discussion, not at the end.

**Definition of done:** given a real voice file URL, the pipeline returns clean structured JSON (category/size/color/price/intent) for at least 8/10 varied test samples.

---

## Phase 10 — Telegram Module (`server/src/modules/telegram/`)

The largest module — this is where everything else gets wired together into the actual bot experience.

```
server/src/modules/telegram/
├── dto/
│   └── mini-app-checkout.dto.ts  ← 1st
├── telegram-bot.service.ts        ← 2nd (shared command handlers: /start, /shop, /help, voice-note routing)
├── qr-receipt.service.ts          ← 3rd (generates + sends QR receipt on payment success, using `qrcode` npm package)
├── telegram.controller.ts         ← 4th (webhook receivers: per-tenant, platform auth bot, platform discovery bot)
├── mini-app.controller.ts         ← 5th (endpoints the Mini App frontend calls: product list, checkout)
├── discovery.service.ts           ← 6th (cross-tenant search logic — queries all `discoverable: true` tenants)
└── telegram.module.ts             ← 7th
```

1. `telegram-bot.service.ts` — the core router: receives an Update, determines if it's a command, text search, or voice note, calls AI module for voice/text, calls Products service, replies with cards + Mini App button.
2. `qr-receipt.service.ts` — triggered by `PaymentsService` on successful payment (via an event or direct call — decide based on how tightly coupled you want these two).
3. `telegram.controller.ts` — three webhook routes, each resolving which tenant (or which platform bot) the update belongs to before handing off to the bot service.
4. `mini-app.controller.ts` — public-facing endpoints the embedded Next.js Mini App route calls directly (product list with filters, checkout submission).
5. `discovery.service.ts` — separate from the per-tenant bot logic; queries across all tenants at once.

**Definition of done:** sending `/start` to a real test tenant bot gets a reply; sending a voice note returns matching product cards; tapping "Open Store" launches the Mini App.

---

## Phase 11 — Frontend: Dashboard (`client/`)

```
client/
├── lib/
│   ├── api-client.ts              ← 1st (Axios instance, JWT attach, 401 refresh interceptor)
│   └── query-client.ts            ← 1st (TanStack Query provider setup)
├── types/
│   └── (mirror API.md request/response shapes as they're built, module by module)
├── hooks/
│   ├── useAuth.ts                 ← 2nd
│   └── useTenant.ts               ← 2nd
├── components/
│   ├── ui/                        ← 3rd (button, input, table, badge — build as needed, not all upfront)
│   └── auth/
│       └── TelegramLoginButton.tsx← 3rd (embeds the official widget, bound to the Auth Bot)
├── app/
│   ├── layout.tsx                 ← 4th (root layout)
│   ├── page.tsx                   ← 4th (marketing/landing page)
│   ├── (auth)/
│   │   ├── login/page.tsx         ← 5th
│   │   └── signup/page.tsx        ← 5th
│   └── (dashboard)/
│       ├── layout.tsx             ← 6th (auth-guarded shell, sidebar, tenant switcher)
│       ├── products/
│       │   ├── page.tsx           ← 7th
│       │   └── [productId]/page.tsx ← 7th
│       ├── orders/
│       │   ├── page.tsx           ← 8th
│       │   └── [orderId]/page.tsx ← 8th
│       ├── analytics/page.tsx     ← 9th
│       └── settings/page.tsx      ← 9th (tenant config, bot token, Chapa keys)
```

**Build order logic:** data layer (`lib/`, `hooks/`) before any page that needs it; auth pages before dashboard pages (dashboard layout assumes a logged-in user); products/orders before analytics (analytics reads data the other two produce).

**Definition of done:** can sign up, log in (both email/password and Telegram), see the dashboard shell, add a product, see it appear in the products table, see a seeded order.

---

## Phase 12 — Frontend: Telegram Mini App Routes (`client/app/mini-app/`)

```
client/app/mini-app/
└── [tenantId]/
    ├── layout.tsx                 ← 1st (loads @twa-dev/sdk, initializes Telegram WebApp context)
    ├── page.tsx                   ← 2nd (product grid, filters, cart — reads from Mini App API)
    └── checkout/page.tsx          ← 3rd (cart review, triggers checkout via mini-app.controller.ts)
```

**Definition of done:** opening the Mini App link inside a real Telegram chat renders the storefront correctly inside Telegram's embedded browser, cart state persists during the session, checkout creates a real order.

---

## Phase 13 — End-to-End Wiring & Manual QA

No new files — this phase is running the full flows from `PRODUCT_REQUIREMENTS.md §4` against the real system:

1. Voice search → bot reply → Mini App → checkout → Chapa sandbox payment → webhook → QR receipt.
2. Merchant dashboard product add → instantly reflected in Mini App and bot search.
3. Cross-tenant discovery search returning results from multiple test tenants.
4. Dual login (email/password and Telegram) both reaching the same dashboard.
5. Tenant isolation — confirm Tenant A cannot see Tenant B's data anywhere, including via direct API calls with a mismatched tenant ID.

---

## Phase 14 — Testing Pass (formalize what was written inline)

Go back through every module and ensure the tests flagged in earlier phases actually exist and pass, per `TESTING.md`:
- `auth.service.spec.ts`, `tenant.guard.spec.ts`
- `products.service.spec.ts` (tenant isolation integration test)
- `payments.service.spec.ts` (webhook idempotency)
- `orders.service.spec.ts` (stock re-validation race condition)
- At least the 4 core Playwright E2E flows from `TESTING.md §4`

---

## Phase 15 — Deployment

1. `server/` → Render or Railway: set all production env vars, run `prisma migrate deploy`, point real bot webhooks at the production URL.
2. `client/` → Vercel: set `NEXT_PUBLIC_API_BASE_URL` to the production API, set the Telegram Auth Bot's `/setdomain` to the production dashboard domain.
3. Register production Telegram bots separately from dev/test bots (never reuse a dev bot token in production).
4. Smoke-test all Phase 13 flows again against production before onboarding the first real client.

---

## Quick Reference — What Depends on What

```
Phase 1 (DB) 
   └─▶ Phase 2 (core) 
          └─▶ Phase 3 (auth) ─── everything below needs JwtAuthGuard + TenantGuard
                 ├─▶ Phase 4 (users)
                 ├─▶ Phase 5 (tenants)
                 │      └─▶ Phase 6 (products)
                 │             └─▶ Phase 7 (orders)
                 │                    └─▶ Phase 8 (payments)
                 ├─▶ Phase 9 (AI) ──────────────┐
                 └─▶ Phase 10 (telegram) ◀──────┘ (needs products, orders, payments, AI all ready)
                        │
                        ├─▶ Phase 11 (dashboard frontend)
                        └─▶ Phase 12 (mini app frontend) ◀── needs Phase 10's mini-app.controller.ts

Phase 13 (E2E QA) ◀── needs everything above
Phase 14 (testing pass)
Phase 15 (deployment)
```