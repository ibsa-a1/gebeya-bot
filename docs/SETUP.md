# Setup Document — Local Development Onboarding

## 1. Prerequisite Matrix

| Tool | Version | Notes |
|---|---|---|
| Node.js | LTS (20.x+) | Required for both `client/` and `server/` |
| Docker Engine | Latest | Runs local PostgreSQL container |
| PostgreSQL | 16.x (via Docker) | No local native install needed |
| ngrok (or localtunnel) | Latest | Exposes local `server/` for Telegram/Chapa webhooks during dev |
| Telegram account | — | To register bots via `@BotFather` |

## 2. Environment Variables

### `server/.env`
```bash
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/telegram_commerce_dev"

# Auth
JWT_ACCESS_SECRET="replace-with-a-long-random-string"
JWT_REFRESH_SECRET="replace-with-a-different-long-random-string"
JWT_ACCESS_EXPIRY="15m"
JWT_REFRESH_EXPIRY="7d"

# Platform-level Telegram bots (yours, not any tenant's)
PLATFORM_AUTH_BOT_TOKEN="123456:ABC-your-auth-bot-token"
PLATFORM_AUTH_BOT_USERNAME="YourAppAuthBot"
PLATFORM_DISCOVERY_BOT_TOKEN="123456:ABC-your-discovery-bot-token"

# AI services (free tier)
GROQ_API_KEY="gsk_..."
GEMINI_API_KEY="AQ...."  # Google's newer "auth key" format (prefix AQ.), replacing the older AIza... format for keys issued from mid-2026 onward

# Payments (sandbox)
CHAPA_SECRET_KEY_DEFAULT="CHASECK_TEST-..."

# Secrets encryption (for per-tenant bot tokens / Chapa keys stored in DB)
ENCRYPTION_KEY="32-byte-random-string-for-aes-256"

# Misc
PORT=4000
NODE_ENV=development
```

### `client/.env.local`
```bash
NEXT_PUBLIC_API_BASE_URL="http://localhost:4000/api/v1"
NEXT_PUBLIC_PLATFORM_AUTH_BOT_USERNAME="YourAppAuthBot"
```

> All values above are structural placeholders — never commit real secrets. Use `.env.example` files (committed) mirroring these keys with empty/placeholder values, and keep real `.env` files gitignored.

## 3. Initialization Sequence

```bash
# 1. Clone and enter the repo
git clone <repo-url>
cd project-root

# 2. Start local PostgreSQL via Docker
docker run --name telegram-commerce-db \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=telegram_commerce_dev \
  -p 5432:5432 -d postgres:16

# 3. Backend setup
cd server
npm install
cp .env.example .env        # then fill in real values
npx prisma migrate dev --name init
npx prisma db seed
npm run start:dev           # NestJS dev server on :4000

# 4. Frontend setup (separate terminal)
cd ../client
npm install
cp .env.example .env.local  # then fill in real values
npm run dev                 # Next.js dev server on :3000

# 5. Expose backend for Telegram/Chapa webhooks (separate terminal)
ngrok http 4000
# Copy the resulting HTTPS URL and set it as each bot's webhook:
#   https://api.telegram.org/bot<TOKEN>/setWebhook?url=<ngrok-url>/api/v1/telegram/webhook/...
```

## 4. Registering Bots (One-Time, Per Environment)

1. Message `@BotFather` on Telegram.
2. `/newbot` → follow prompts → copy the token into `PLATFORM_AUTH_BOT_TOKEN` (create a second bot the same way for `PLATFORM_DISCOVERY_BOT_TOKEN`).
3. For the Auth Bot only: `/setdomain` → point it at your dashboard's domain (or the ngrok URL during local dev) so the Telegram Login Widget works.
4. For each new tenant: repeat `/newbot`, store the resulting token via the `POST /tenants` endpoint (encrypted at rest), no `/setdomain` needed since tenant bots don't use the login widget.