# Product Requirements Document (PRD)

**Project:** Amharic AI Social Commerce Bot for Telegram
**Type:** Multi-tenant SaaS template — one deployment serves many independent client businesses
**Status:** Active build (originally scoped for Venture Meda Hackathon 2026, continuing as a personal/commercial product)

---

## 1. Project Vision

Social commerce in Ethiopia runs largely through Telegram. Thousands of micro-merchants sell entirely through channel posts and direct messages, which creates three recurring problems:

1. **Manual overhead** — merchants answer the same questions ("how much?", "is size 42 available?") over and over, by hand, in text.
2. **Language barrier** — buyers prefer voice notes in Amharic or Afaan Oromo, and existing bots don't understand colloquial speech.
3. **Trust and structure gap** — payment is usually a screenshot of a bank transfer, order status lives in someone's memory, and there is no catalog, cart, or receipt system.

This product turns any merchant's existing Telegram channel into a structured, AI-powered storefront — voice search, a visual Mini App catalog, real checkout, and a management dashboard — without asking the merchant or their buyers to leave Telegram or install anything.

**Business model:** built once as a clean, multi-tenant template, then sold/customized per client. Each client gets their own bot and branded storefront running on shared platform infrastructure.

---

## 2. Target User Personas

| Persona | Description | Access |
|---|---|---|
| **Platform Owner** (you) | Runs the SaaS, onboards new client businesses, owns the two platform-level bots (Auth Bot, Discovery Bot) | Full system access, all tenants |
| **Tenant Owner** | The merchant/business owner who owns a storefront (e.g. a boutique owner) | Dashboard access scoped to their tenant only |
| **Tenant Staff** *(future scope)* | An employee the Tenant Owner grants limited dashboard access to (e.g. order fulfillment only, no financial data) | Dashboard access, permission-limited |
| **End Customer / Buyer** | A Telegram user browsing and buying from a merchant's bot | No dashboard account — identified only by their Telegram user ID, interacts purely through chat/Mini App |

---

## 3. Core Feature Matrix

| Feature | MVP (v1) | Future Scale |
|---|---|---|
| Amharic/Afaan Oromo voice-to-intent search | ⚠️ Working, but real live testing (Phase 10) showed inconsistent transcription accuracy specifically for voice notes recorded and sent through Telegram's own in-app voice recorder — repeated attempts on a real deployed bot returned garbled/unintelligible transcripts more often than not, even for clear speech. A controlled test using a natively-recorded phone voice memo (bypassing Telegram's recording pipeline) transcribed correctly. Root cause not fully isolated — likely Telegram's voice encoding/compression or mic-routing interaction, not a flaw in Whisper generally. **Practical implication: typed text should be treated as the primary, reliable path for launch, not voice.** | Multi-turn conversational refinement ("show me cheaper ones"); investigating Telegram voice encoding accuracy further |
| Typed text search (Amharic script, Latin-script Amharic, English) | ✅ Fully working and reliable in live testing — correctly extracts category/color/size/price even from colloquial, mixed-language, and native Amharic-script input | Full NLP autocomplete-as-you-type |
| Telegram Mini App storefront | ✅ Grid view, filters, cart, product detail | Wishlist, saved carts, personalized recommendations |
| In-chat checkout & payment | ✅ Chapa sandbox + mocked Telebirr flow | Real Telebirr merchant integration, installment/BNPL |
| QR digital receipts | ✅ Generated on payment success, scanned at delivery | Rider app for scan confirmation, GPS delivery tracking |
| Merchant dashboard | ✅ Product CRUD, order status tracker, basic sales analytics | Multi-staff roles, advanced analytics, CSV export |
| Cross-tenant discovery bot | ✅ Basic keyword/attribute search across all onboarded tenants | Ranking by relevance, sponsored placement, price alerts |
| Tenant onboarding | ✅ Manual (platform owner registers new bot, creates tenant record) | Self-serve onboarding flow for new clients |
| Dashboard authentication | ✅ Email/password **and** Telegram login (via dedicated platform Auth Bot) | SSO for larger client organizations |

---

## 4. Step-by-Step System Flows

### 4.1 Buyer Journey — Voice Search to Delivery
1. Buyer sends an Amharic or Afaan Oromo voice note to a merchant's Telegram bot.
2. Backend downloads the `.ogg` voice file via the Telegram Bot API.
3. Groq Whisper transcribes the voice note to text.
4. Gemini 3.6 Flash extracts structured intent (category, size, color, price ceiling) as JSON.
5. Backend queries that tenant's product catalog in PostgreSQL for matches.
6. Bot replies with product cards and an "Open Store" button that launches the Telegram Mini App.
7. Buyer browses/filters in the Mini App, adds to cart, taps **Buy Now**.
8. Backend creates an `Order` (status `PENDING`) and generates a Chapa sandbox checkout link (or triggers the mocked Telebirr flow).
9. Buyer completes payment in the sandbox.
10. Payment provider (or mock) fires a webhook → backend verifies it → `Order` status becomes `PAID`.
11. Bot pushes a QR-coded digital receipt to the buyer (order ID, items, total, single-use delivery-verification QR).
12. On delivery, the rider (or merchant) scans the QR → `Order` status becomes `COMPLETED`.

### 4.2 Merchant Journey — Onboarding to Fulfillment
1. Platform Owner registers a new Telegram bot for the client via `@BotFather` and creates a `Tenant` record (bot token stored encrypted).
2. Tenant Owner logs into the dashboard (email/password or "Login with Telegram" via the platform Auth Bot).
3. Tenant Owner adds products (name, price, stock, images, variants).
4. Product data is immediately queryable by that tenant's bot and visible in their Mini App — no separate "publish" step.
5. Orders appear on the dashboard in real time with status badges (`PENDING → PAID → DISPATCHED → COMPLETED`).
6. Tenant Owner marks orders as dispatched; fulfillment is confirmed via QR scan at delivery.
7. Dashboard analytics tab shows daily revenue, top products, and customer count for that tenant only.

### 4.3 Cross-Tenant Discovery Flow
1. A buyer messages the platform's central Discovery Bot (separate from any single merchant's bot).
2. Buyer asks a natural-language question (e.g. "brown leather jacket under 3,500 birr in Addis").
3. Backend runs the same voice/text → intent pipeline, then queries **across all tenants** that have opted into discoverability.
4. Bot returns matching product cards from multiple merchants, each with a direct link into that specific merchant's bot/Mini App to complete the purchase.

### 4.4 Dual Authentication Flow (Dashboard)
- **Email/Password:** standard signup/login, password hashed (bcrypt), JWT issued on success.
- **Telegram Login:** buyer/merchant clicks "Login with Telegram" → Telegram's official Login Widget (bound to the platform's dedicated Auth Bot, not any tenant's business bot) → backend verifies the signed payload → finds or creates a `User` linked by `telegramId` → JWT issued.
- Both paths converge on the same `User` and `TenantMembership` model — a user can have a password, a linked Telegram identity, or both.

---

## 5. Explicit Edge Cases & Boundaries

The system must **not**:
- Allow any API request to read or modify another tenant's products, orders, or configuration — tenant isolation is enforced at the data-access layer, not just the UI.
- Treat a failed or low-confidence voice transcription as a valid search — below a confidence/parse threshold, the bot must fall back to asking the buyer to type their request or pick from categories.
- Silently return an unfiltered full catalog when no usable intent was extracted (a real bug caught in live testing) — the bot must say it didn't understand rather than implying it found a match. Similarly, when a result only partially matches what was asked (e.g. right category, wrong color/size), the bot must say so honestly rather than presenting a partial match as exact.
- Process a payment webhook more than once for the same transaction (idempotency required — duplicate webhook deliveries are a real occurrence with payment providers).
- Allow checkout to succeed against stock that has since sold out — stock must be re-validated at payment confirmation, not just at cart-add time.
- Represent the mocked Telebirr flow as a real Telebirr integration anywhere in the product-facing UI or documentation — it must be clearly a simulated flow until a genuine Telebirr merchant integration exists.
- Store any tenant's bot token, Chapa keys, or other secrets in plaintext in the database.
- Require a buyer (end customer) to create any dashboard account — buyers only ever interact via Telegram identity.