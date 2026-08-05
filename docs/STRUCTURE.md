# Structure Document — Folder & File Tree

## 1. Repository Blueprint

Single GitHub repository, plain folders (no monorepo tooling — no Turborepo/Nx, since frontend and backend share no code and deploy independently):

```
project-root/
├── client/           <- Next.js (TypeScript) — deployed to Vercel
├── server/           <- NestJS (TypeScript) — deployed to Render/Railway
├── docs/             <- This documentation set
└── README.md         <- Entry point, links to /docs
```

Each of `client/` and `server/` has its own `package.json`, `.env`, `tsconfig.json`, and lockfile — they are built, tested, and deployed as fully separate projects that happen to live in one repo for convenience.

## 2. `client/` — Next.js App Router Structure

```
client/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx              <- auth-guarded shell (sidebar, tenant switcher)
│   │   ├── products/
│   │   │   ├── page.tsx            <- product list/table
│   │   │   └── [productId]/page.tsx
│   │   ├── orders/
│   │   │   ├── page.tsx
│   │   │   └── [orderId]/page.tsx
│   │   ├── analytics/page.tsx
│   │   └── settings/page.tsx       <- tenant config, bot token, Chapa keys
│   ├── layout.tsx                   <- root layout
│   └── page.tsx                     <- marketing/landing page
├── components/
│   ├── ui/                          <- shared primitives (button, input, table, badge)
│   ├── products/
│   ├── orders/
│   └── auth/
├── hooks/                            <- custom hooks (useAuth, useTenant, useProducts)
├── lib/
│   ├── api-client.ts                 <- Axios instance + interceptors (JWT attach, 401 refresh)
│   ├── query-client.ts               <- TanStack Query setup
│   └── utils.ts
├── types/                            <- local TypeScript interfaces mirroring API contracts
├── .env.local
├── package.json
└── tsconfig.json
```

**Convention:** Server Components by default; a file only gets `'use client'` when it needs interactivity, state, or browser APIs (forms, tables with client-side sort/filter, the Telegram Login widget embed).

## 3. `server/` — NestJS Modular Domain Layout

```
server/
├── src/
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.module.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── strategies/           <- JWT strategy, Telegram verification logic
│   │   │   ├── guards/               <- JwtAuthGuard, TenantGuard
│   │   │   └── dto/
│   │   ├── users/
│   │   │   ├── users.module.ts
│   │   │   ├── users.controller.ts
│   │   │   ├── users.service.ts
│   │   │   └── dto/
│   │   ├── tenants/
│   │   │   ├── tenants.module.ts
│   │   │   ├── tenants.controller.ts
│   │   │   ├── tenants.service.ts
│   │   │   └── dto/
│   │   ├── products/
│   │   │   ├── products.module.ts
│   │   │   ├── products.controller.ts
│   │   │   ├── products.service.ts
│   │   │   └── dto/
│   │   ├── orders/
│   │   │   ├── orders.module.ts
│   │   │   ├── orders.controller.ts
│   │   │   ├── orders.service.ts
│   │   │   └── dto/
│   │   ├── payments/
│   │   │   ├── payments.module.ts
│   │   │   ├── payments.controller.ts     <- webhook endpoints
│   │   │   ├── payments.service.ts
│   │   │   ├── chapa.provider.ts
│   │   │   ├── mock-telebirr.provider.ts
│   │   │   └── dto/
│   │   ├── telegram/
│   │   │   ├── telegram.module.ts
│   │   │   ├── telegram.controller.ts     <- webhook receivers (per tenant, auth bot, discovery bot)
│   │   │   ├── telegram-bot.service.ts    <- shared bot-command logic
│   │   │   ├── mini-app.controller.ts     <- endpoints the Mini App frontend calls
│   │   │   └── qr-receipt.service.ts
│   │   └── ai/
│   │       ├── ai.module.ts
│   │       ├── stt.service.ts              <- Groq Whisper integration
│   │       ├── intent.service.ts           <- Gemini 3.6 Flash integration
│   │       └── dto/
│   ├── common/
│   │   ├── filters/                        <- global exception filter
│   │   ├── interceptors/
│   │   ├── decorators/                     <- e.g. @CurrentTenant(), @CurrentUser()
│   │   └── pipes/
│   ├── prisma/
│   │   ├── prisma.module.ts
│   │   ├── prisma.service.ts
│   │   └── schema.prisma
│   ├── config/                             <- typed config loading (env validation)
│   ├── app.module.ts
│   └── main.ts
├── test/                                    <- e2e test suites
├── .env
├── package.json
└── tsconfig.json
```

**Convention:** every module keeps controllers thin (route + validation only), all business logic lives in the service layer, and every incoming payload is typed and validated through a DTO — no untyped `req.body` access anywhere.

## 4. Shared Type Contracts

Since `client/` and `server/` deliberately don't share a package, API response/request shapes are kept in sync manually via `docs/API.md` as the source of truth, mirrored into `client/types/` by hand (or regenerated later via an OpenAPI spec if the project grows — not required for MVP).