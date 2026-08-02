<div align="center">

# 🛍️ Gebeya Bot

### Amharic AI Social Commerce Engine for Telegram

Turn any Telegram channel into a fully structured, AI-powered storefront — voice search in Amharic & Afaan Oromo, an embedded Mini App catalog, real checkout, QR receipts, and a merchant dashboard. Zero app installs. Zero friction.

[![Status](https://img.shields.io/badge/status-active--development-yellow)]()
[![Node](https://img.shields.io/badge/node-20.x-339933?logo=node.js&logoColor=white)]()
[![Next.js](https://img.shields.io/badge/Next.js-TypeScript-black?logo=next.js)]()
[![NestJS](https://img.shields.io/badge/NestJS-TypeScript-E0234E?logo=nestjs&logoColor=white)]()
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Prisma-336791?logo=postgresql&logoColor=white)]()
[![License](https://img.shields.io/badge/license-Proprietary-lightgrey)]()

[Overview](#-overview) • [Features](#-features) • [Architecture](#-architecture) • [Tech Stack](#-tech-stack) • [Getting Started](#-getting-started) • [Documentation](#-full-documentation) • [Roadmap](#-roadmap)

</div>

---

## 📖 Overview

Social commerce in Ethiopia runs almost entirely through Telegram — thousands of micro-merchants sell through channel posts and DMs, with no catalog, no cart, no structured checkout, and constant manual back-and-forth answering "how much?" and "is this in stock?"

**Gebeya Bot** replaces that manual overhead with an AI-driven layer that sits directly inside Telegram:

- 🎙️ Buyers **speak** in Amharic or Afaan Oromo — the bot understands them.
- 🛒 A native-feeling **Mini App storefront** replaces endless scrolling.
- 💳 **Real checkout**, sandboxed payments, instant QR receipts.
- 📊 Merchants get a **dashboard** — inventory, orders, sales, all in one place.
- 🏢 Built **multi-tenant from day one** — one platform, many independent client storefronts, each with their own bot and brand.

This isn't a single-shop app. It's a template designed to be onboarded per client and resold.

---

## ✨ Features

| | Feature | Description |
|---|---|---|
| 🎙️ | **Amharic Voice-to-Intent Search** | Voice notes transcribed (Groq Whisper) and parsed into structured product queries (Gemini 1.5 Flash) |
| ⌨️ | **Multilingual Text Fallback** | Ge'ez script, Latin-script Amharic, and English all supported |
| 🖼️ | **Telegram Mini App Storefront** | Rich product grid, filters, cart — embedded natively inside Telegram |
| 💳 | **In-Chat Checkout** | Chapa sandbox payments + simulated Telebirr flow, webhook-verified |
| 🧾 | **QR Digital Receipts** | Instant, scannable, single-use delivery verification |
| 🏬 | **Multi-Tenant Merchant Dashboard** | Inventory, order fulfillment tracking, sales analytics — scoped per client |
| 🔎 | **Cross-Tenant Discovery Bot** | One search hub across every onboarded merchant's catalog |
| 🔐 | **Dual Authentication** | Email/password **or** Login with Telegram — merchant's choice |

---

## 🏗️ Architecture

```
 Telegram Clients                         Next.js Dashboard
 (Tenant Bots, Auth Bot,                  (Vercel)
  Discovery Bot, Mini Apps)                     │
        │                                       │  REST + JWT
        ▼                                       ▼
 ┌─────────────────────────────────────────────────────────┐
 │                NestJS API (Render/Railway)                │
 │   Auth · Tenants · Products · Orders · Payments · AI      │
 └───────────┬───────────────┬───────────────┬───────────────┘
             ▼               ▼               ▼
       PostgreSQL        Groq + Gemini    Chapa Sandbox /
       (Prisma)          (Voice + NLP)     Mock Telebirr
```

Every tenant runs on their **own Telegram bot**, isolated at the data layer via tenant-scoped guards — no client can ever see another client's products, orders, or configuration. Full breakdown in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

---

## 🧰 Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js (TypeScript), Tailwind CSS, TanStack Query |
| **Backend** | NestJS (TypeScript), class-validator DTOs |
| **Database** | PostgreSQL + Prisma ORM |
| **Voice AI** | Groq (Whisper large-v3-turbo) |
| **Language AI** | Google Gemini 1.5 Flash |
| **Payments** | Chapa API (sandbox) + simulated Telebirr flow |
| **Messaging** | Telegram Bot API + Telegram Mini Apps (TMA) |
| **Hosting** | Vercel (frontend) · Render/Railway (backend) |

---

## 🚀 Getting Started

```bash
# Clone
git clone https://github.com/<your-username>/gebeya-bot.git
cd gebeya-bot

# Backend
cd server && npm install && cp .env.example .env
npx prisma migrate dev --name init && npx prisma db seed
npm run start:dev

# Frontend (new terminal)
cd client && npm install && cp .env.example .env.local
npm run dev

# Expose backend for Telegram/Chapa webhooks (new terminal)
ngrok http 4000
```

Full environment variables, bot registration steps, and Docker setup are in [`docs/SETUP.md`](docs/SETUP.md).

---

## 📂 Project Structure

```
project-root/
├── client/     # Next.js dashboard — deployed to Vercel
├── server/     # NestJS API — deployed to Render/Railway
├── docs/       # Full technical documentation (see below)
└── README.md   # You are here
```

No monorepo tooling (Turborepo/Nx) — `client/` and `server/` are fully independent apps with no shared package, deployed and versioned separately.

---

## 📚 Full Documentation

This README is the front door. Everything needed to actually build, extend, or onboard a new client lives in `/docs`:

| Document | What's inside |
|---|---|
| [`PRODUCT_REQUIREMENTS.md`](docs/PRODUCT_REQUIREMENTS.md) | Vision, personas, feature matrix, step-by-step user flows, edge cases |
| [`ARCHITECTURE.md`](docs/ARCHITECTURE.md) | System topology, multi-tenancy model, auth lifecycle, error contract |
| [`STRUCTURE.md`](docs/STRUCTURE.md) | Full folder/file tree for both apps |
| [`API.md`](docs/API.md) | Every endpoint — method, input, output, access level |
| [`DATABASE.md`](docs/DATABASE.md) | Full Prisma schema, relationships, seeding strategy |
| [`SETUP.md`](docs/SETUP.md) | Local dev onboarding, env vars, bot registration |
| [`CONVENTIONS.md`](docs/CONVENTIONS.md) | Code style rules — feed directly to AI coding tools |
| [`TESTING.md`](docs/TESTING.md) | Unit, integration, and E2E testing strategy |

---

## 🗺️ Roadmap

- [x] Multi-tenant architecture & documentation
- [ ] Core bot + voice/intent pipeline (MVP)
- [ ] Telegram Mini App storefront
- [ ] Chapa sandbox + mocked Telebirr checkout
- [ ] Merchant dashboard (v1)
- [ ] Cross-tenant Discovery Bot
- [ ] Self-serve client onboarding flow
- [ ] Real Telebirr merchant integration

---

<div align="center">

Built in Addis Ababa 🇪🇹

</div>
