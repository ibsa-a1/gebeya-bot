# API Document — Endpoint Contracts

## 1. Global Server Config

- **Base URL (dev):** `http://localhost:4000/api/v1`
- **Base URL (prod):** `https://api.yourdomain.com/api/v1`
- **Auth header:** `Authorization: Bearer <accessToken>`
- **Content type:** `application/json` for all non-webhook, non-file endpoints
- **Correlation:** every request may include `X-Correlation-ID`; the backend generates one if absent and echoes it in the response for tracing

## 2. Security & Guard Enforcement

| Access Level | Meaning |
|---|---|
| **Public** | No auth required |
| **Authenticated** | Valid JWT required (`JwtAuthGuard`) |
| **Tenant-scoped** | Valid JWT + resolved `TenantMembership` for the requested tenant (`TenantGuard`) |
| **Webhook** | No user auth — verified instead via provider signature (Chapa) or internal secret (mock Telebirr, Telegram webhook secret token) |

## 3. Endpoint Catalog

### Auth (`/auth`)

| Method | Route | Access | Input | Output |
|---|---|---|---|---|
| POST | `/auth/signup` | Public | `{ email, password, name }` | `201` → `{ user, accessToken }` (+ refresh cookie) |
| POST | `/auth/login` | Public | `{ email, password }` | `200` → `{ user, accessToken }` / `401` invalid credentials |
| POST | `/auth/telegram` | Public | `{ id, first_name, username?, auth_date, hash }` (Telegram widget payload) | `200` → `{ user, accessToken }` / `401` invalid hash |
| POST | `/auth/refresh` | Public (refresh cookie) | — | `200` → `{ accessToken }` / `401` expired/invalid |
| POST | `/auth/logout` | Authenticated | — | `204` |

### Users (`/users`)

| Method | Route | Access | Input | Output |
|---|---|---|---|---|
| GET | `/users/me` | Authenticated | — | `200` → `{ id, email, name, telegramId, tenants: [...] }` |
| PATCH | `/users/me` | Authenticated | `{ name?, email? }` | `200` → updated user |

### Tenants (`/tenants`)

| Method | Route | Access | Input | Output |
|---|---|---|---|---|
| POST | `/tenants` | Authenticated (platform owner only) | `{ name, botToken, botUsername, currency? }` | `201` → tenant record |
| GET | `/tenants/:tenantId` | Tenant-scoped | — | `200` → tenant config (secrets masked) |
| PATCH | `/tenants/:tenantId` | Tenant-scoped (`OWNER`) | `{ name?, discoverable?, chapaPublicKey?, chapaSecretKey? }` | `200` → updated tenant |

### Products (`/tenants/:tenantId/products`)

| Method | Route | Access | Input | Output |
|---|---|---|---|---|
| GET | `/tenants/:tenantId/products` | Tenant-scoped | Query: `category?`, `search?`, `page?` | `200` → `{ items: Product[], total }` |
| POST | `/tenants/:tenantId/products` | Tenant-scoped | `{ name, description?, category, price, stock, images[], variants? }` | `201` → created product |
| GET | `/tenants/:tenantId/products/:productId` | Tenant-scoped | — | `200` → product |
| PATCH | `/tenants/:tenantId/products/:productId` | Tenant-scoped | Partial product fields | `200` → updated product |
| DELETE | `/tenants/:tenantId/products/:productId` | Tenant-scoped | — | `204` |

### Orders (`/tenants/:tenantId/orders`)

| Method | Route | Access | Input | Output |
|---|---|---|---|---|
| GET | `/tenants/:tenantId/orders` | Tenant-scoped | Query: `status?`, `page?` | `200` → `{ items: Order[], total }` |
| GET | `/tenants/:tenantId/orders/:orderId` | Tenant-scoped | — | `200` → order + items + payment |
| PATCH | `/tenants/:tenantId/orders/:orderId/status` | Tenant-scoped | `{ status }` | `200` → updated order |

### Payments (`/payments`)

| Method | Route | Access | Input | Output |
|---|---|---|---|---|
| POST | `/payments/chapa/initialize` | Tenant-scoped (called by bot/Mini App flow) | `{ orderId }` | `200` → `{ checkoutUrl, txRef }` |
| POST | `/payments/webhook/chapa` | Webhook (Chapa signature verified) | Chapa payload | `200` → acknowledged, updates `Order`/`Payment` |
| POST | `/payments/mock-telebirr/initialize` | Tenant-scoped | `{ orderId }` | `200` → `{ mockCheckoutRef }` |
| POST | `/payments/webhook/telebirr-mock` | Internal (simulated) | `{ mockCheckoutRef }` | `200` → acknowledged, updates `Order`/`Payment` after simulated delay |

### Telegram & Mini App (`/telegram`, `/mini-app`)

| Method | Route | Access | Input | Output |
|---|---|---|---|---|
| POST | `/telegram/webhook/tenant/:tenantId` | Webhook (Telegram secret token) | Telegram Update object | `200` |
| POST | `/telegram/webhook/platform/auth` | Webhook | Telegram Update object | `200` |
| POST | `/telegram/webhook/platform/discovery` | Webhook | Telegram Update object | `200` |
| GET | `/mini-app/tenants/:tenantId/products` | Public (Mini App context) | Query: filters | `200` → product list for storefront rendering |
| POST | `/mini-app/tenants/:tenantId/checkout` | Public (Mini App context) | `{ items: [{ productId, quantity, variant }], customerTelegramId }` | `201` → `{ orderId, checkoutUrl }` |

### AI Pipeline (`/ai`) — internal, called by the Telegram module

| Method | Route | Access | Input | Output |
|---|---|---|---|---|
| POST | `/ai/transcribe` | Internal | `{ fileUrl }` (Telegram file URL) | `200` → `{ transcript }` |
| POST | `/ai/extract-intent` | Internal | `{ text, tenantId }` | `200` → `{ category, size?, color?, maxPrice?, intent }` |

## 4. Standard Response Shapes

**Success (list):**
```json
{ "items": [ /* ... */ ], "total": 42, "page": 1 }
```

**Error (all failure cases):**
```json
{
  "statusCode": 422,
  "error": "Unprocessable Entity",
  "message": "price must be a positive number",
  "path": "/api/v1/tenants/abc123/products",
  "timestamp": "2026-08-02T10:00:00.000Z"
}
```
