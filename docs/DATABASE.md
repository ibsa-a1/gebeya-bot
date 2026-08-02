# Database Document — PostgreSQL & Prisma

## 1. Entity-Relationship Overview

```
User ──< TenantMembership >── Tenant ──< Product
  │                              │           │
  │                              │           └──< OrderItem >── Order ──< Payment
  │                              │                                 │
  │                              └──< VoiceQueryLog                └── (customerTelegramId, not a User)
```

- A `User` can belong to multiple `Tenant`s via `TenantMembership` (many-to-many with a role attached).
- A `Tenant` owns many `Product`s and many `Order`s (one-to-many).
- An `Order` has many `OrderItem`s (one-to-many) and one `Payment` record (one-to-one, though re-attempted payments create new rows referencing the same order).
- End customers (buyers) are **not** `User` records — they're identified purely by `customerTelegramId` on the `Order`, since buyers never authenticate into the dashboard.

## 2. Prisma Schema (`server/src/prisma/schema.prisma`)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum TenantRole {
  OWNER
  STAFF
}

enum OrderStatus {
  PENDING
  PAID
  DISPATCHED
  COMPLETED
  CANCELLED
}

enum PaymentProvider {
  CHAPA
  TELEBIRR_MOCK
}

enum PaymentStatus {
  INITIATED
  SUCCESS
  FAILED
}

model User {
  id            String             @id @default(cuid())
  email         String?            @unique
  passwordHash  String?
  telegramId    String?            @unique
  name          String
  createdAt     DateTime           @default(now())
  updatedAt     DateTime           @updatedAt
  memberships   TenantMembership[]
}

model Tenant {
  id                String             @id @default(cuid())
  name              String
  slug              String             @unique
  botToken          String             // stored encrypted at the application layer
  botUsername       String             @unique
  currency          String             @default("ETB")
  discoverable      Boolean            @default(true)   // opt-in to cross-tenant Discovery Bot
  chapaPublicKey    String?
  chapaSecretKey    String?            // stored encrypted at the application layer
  createdAt         DateTime           @default(now())
  updatedAt         DateTime           @updatedAt
  memberships       TenantMembership[]
  products          Product[]
  orders            Order[]
  voiceQueryLogs    VoiceQueryLog[]
}

model TenantMembership {
  id        String     @id @default(cuid())
  userId    String
  tenantId  String
  role      TenantRole @default(OWNER)
  user      User       @relation(fields: [userId], references: [id])
  tenant    Tenant     @relation(fields: [tenantId], references: [id])
  createdAt DateTime   @default(now())

  @@unique([userId, tenantId])
  @@index([tenantId])
}

model Product {
  id          String       @id @default(cuid())
  tenantId    String
  tenant      Tenant       @relation(fields: [tenantId], references: [id])
  name        String
  description String?
  category    String
  price       Decimal      @db.Decimal(10, 2)
  stock       Int          @default(0)
  images      String[]     // URLs
  variants    Json?        // e.g. { "sizes": [40,41,42], "colors": ["black","brown"] }
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
  orderItems  OrderItem[]

  @@index([tenantId])
  @@index([tenantId, category])
}

model Order {
  id                 String       @id @default(cuid())
  tenantId           String
  tenant             Tenant       @relation(fields: [tenantId], references: [id])
  customerTelegramId String
  status             OrderStatus  @default(PENDING)
  totalAmount        Decimal      @db.Decimal(10, 2)
  qrCode             String?      // single-use delivery verification code
  items              OrderItem[]
  payments           Payment[]
  createdAt          DateTime     @default(now())
  updatedAt          DateTime     @updatedAt

  @@index([tenantId])
  @@index([tenantId, status])
  @@index([customerTelegramId])
}

model OrderItem {
  id               String   @id @default(cuid())
  orderId          String
  order            Order    @relation(fields: [orderId], references: [id])
  productId        String
  product          Product  @relation(fields: [productId], references: [id])
  quantity         Int
  priceAtPurchase  Decimal  @db.Decimal(10, 2)
  variant          Json?    // selected size/color at time of purchase

  @@index([orderId])
}

model Payment {
  id            String          @id @default(cuid())
  orderId       String
  order         Order           @relation(fields: [orderId], references: [id])
  provider      PaymentProvider
  status        PaymentStatus   @default(INITIATED)
  amount        Decimal         @db.Decimal(10, 2)
  txRef         String          @unique   // idempotency key from provider or generated for mock
  webhookPayload Json?
  createdAt     DateTime        @default(now())
  updatedAt     DateTime        @updatedAt

  @@index([orderId])
}

model VoiceQueryLog {
  id                 String   @id @default(cuid())
  tenantId           String
  tenant             Tenant   @relation(fields: [tenantId], references: [id])
  customerTelegramId String
  transcript         String
  extractedIntent    Json
  createdAt          DateTime @default(now())

  @@index([tenantId])
}
```

## 3. Notes on Key Constraints & Design Choices

- **`txRef` uniqueness on `Payment`** is what makes webhook handling idempotent — a duplicate webhook delivery for the same transaction reference is rejected/no-ops instead of double-processing.
- **`variants` and `extractedIntent` as `Json`** rather than rigid columns — product attributes vary a lot (shoes have size/color, electronics don't), and this avoids constant migrations for attribute changes while still living in a relational, constrained schema overall.
- **`discoverable` flag on `Tenant`** is the mechanism that lets a merchant opt out of the cross-tenant Discovery Bot without needing a separate table.
- **No `User` record for buyers** is intentional — keeps the auth system scoped to people who actually need dashboard access, and avoids creating throwaway accounts for anonymous Telegram shoppers.

## 4. Seeding & Migration Pipeline

**Migrations:**
```bash
npx prisma migrate dev --name init        # local dev — creates + applies migration
npx prisma migrate deploy                 # production — applies existing migrations only
```

**Seeding** (`server/prisma/seed.ts`, run via `npx prisma db seed`):
- Create one demo `Tenant` with a real test bot token.
- Create a demo `User` (email/password) with an `OWNER` `TenantMembership`.
- Insert ~15 realistic Ethiopian e-commerce products (shoes, clothes, electronics) with ETB pricing, mirroring the original spec's demo-data plan.
- Insert 2–3 sample `Order`s across different statuses so the dashboard has something to render on first run.
