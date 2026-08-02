# Conventions Document — Code Style & Quality Standards

This document is written to be fed directly to AI coding tools (Claude, Cursor, ChatGPT) to keep generated code aligned with the rest of the codebase. Any code — human or AI-written — should follow these rules without exception.

## 1. Frontend Rules (Next.js)

- Default to **React Server Components**; add `'use client'` only when a file genuinely needs state, effects, or browser APIs (forms, interactive tables, the Telegram Login widget).
- Style exclusively with **Tailwind CSS utility classes** — no separate CSS files, no inline `style` props, no CSS-in-JS libraries.
- Functional components only — no class components.
- Data fetching on the server where possible (Server Components fetching directly); use TanStack Query only for client-side interactive data (mutations, polling, optimistic updates).
- No direct `fetch()` calls scattered across components — always go through the shared `lib/api-client.ts` instance.

## 2. Backend Rules (NestJS)

- **Controllers stay thin** — route definition, DTO validation, and delegation to a service. No business logic, no direct Prisma calls in a controller.
- **All incoming payloads validated via DTOs** using `class-validator` decorators + the global `ValidationPipe` — no manual `if (!body.x)` checks.
- **Database access is service-layer only** — controllers never import `PrismaService` directly.
- **Every tenant-scoped route passes through `TenantGuard`** — no exceptions, even for "obviously safe" reads.
- **Secrets (bot tokens, Chapa keys) are encrypted/decrypted only inside a dedicated `CryptoService`** — never inline `crypto` calls scattered through business logic.

## 3. TypeScript Strict Mode Guidelines

- `any` is banned. Use `unknown` with proper narrowing if a type is genuinely not known ahead of time.
- Explicit return types on all exported functions and service methods — no relying on inference for public APIs.
- Prefer Prisma's generated model types over hand-written interfaces for anything that maps to the database.
- No non-null assertions (`!`) as a substitute for proper null checks — handle the `null`/`undefined` case explicitly.

## 4. Git Lifecycle Standards

**Branch naming:**
```
feat/<short-description>       e.g. feat/telegram-login
fix/<short-description>        e.g. fix/webhook-idempotency
chore/<short-description>      e.g. chore/update-prisma-schema
```

**Commit messages** — semantic/conventional commits:
```
feat(auth): add telegram login widget verification
fix(payments): prevent duplicate webhook processing
chore(prisma): add index on order status
docs(api): document mini-app checkout endpoint
```

## 5. General AI-Prompting Guardrails

When directing an AI tool to generate code against this project, always include:
- "Follow `CONVENTIONS.md` exactly — thin controllers, DTO validation, no `any`, Tailwind-only styling."
- "This is a multi-tenant system — every tenant-scoped operation must be scoped by `tenantId` resolved from the authenticated context, never trusted from client input."
- "Reference `DATABASE.md` for the exact Prisma schema — do not invent fields or relations."
