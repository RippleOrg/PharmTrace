# PharmTrace

> **Scan any pill — know in 3 seconds if it's real or fake.**

PharmTrace is an open-source pharmaceutical supply chain authentication platform that combines **Hedera Blockchain**, **AWS KMS cryptographic signing**, **AI anomaly detection**, and **IPFS decentralised storage** to create an end-to-end, tamper-proof drug traceability system. Every batch mints an NFT, every handoff is recorded immutably on the Hedera Consensus Service, and any consumer can verify authenticity by scanning a QR code — with no login required.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](#license)
[![Node.js 20+](https://img.shields.io/badge/Node.js-20%2B-green.svg)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org)
[![Hedera](https://img.shields.io/badge/Hedera-Testnet%20%7C%20Mainnet-8B5CF6.svg)](https://hedera.com)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED.svg)](https://docs.docker.com/compose/)

---

## Table of Contents

1. [Overview](#overview)
2. [Key Features](#key-features)
3. [Architecture](#architecture)
4. [Tech Stack](#tech-stack)
5. [Project Structure](#project-structure)
6. [Prerequisites](#prerequisites)
7. [Getting Started](#getting-started)
   - [Clone & Install](#1-clone--install)
   - [Environment Configuration](#2-environment-configuration)
   - [Initialise Hedera Topics](#3-initialise-hedera-topics)
   - [Database Setup](#4-database-setup)
   - [Run in Development Mode](#5-run-in-development-mode)
   - [Run with Docker Compose](#6-run-with-docker-compose)
8. [API Reference](#api-reference)
9. [Smart Contracts](#smart-contracts)
10. [Database Schema](#database-schema)
11. [Security Model](#security-model)
12. [Testing](#testing)
13. [Deployment](#deployment)
14. [Contributing](#contributing)
15. [License](#license)

---

## Overview

Counterfeit pharmaceuticals kill an estimated **1 million people per year** globally. Traditional paper-based supply chains are slow, opaque, and easy to forge. PharmTrace solves this by anchoring every step of the supply chain — from factory floor to pharmacy shelf — onto the **Hedera public ledger**, which provides:

- **Finality in seconds** — consensus is reached in 3–5 seconds, far faster than Ethereum.
- **Low, predictable fees** — fractions of a cent per transaction, suitable for high-volume supply chains.
- **Energy efficiency** — Hedera's hashgraph consensus is carbon-negative.
- **DSCSA compliance** — the platform is designed to meet the US Drug Supply Chain Security Act requirements for electronic traceability.

### Core Workflows

```
Manufacturer             Distributor              Pharmacy / Hospital         Consumer
     │                        │                          │                       │
     │  Create Batch          │                          │                       │
     │  ──────────────────►   │                          │                       │
     │  • Mint HTS NFT        │                          │                       │
     │  • Upload IPFS meta    │  Record Handoff          │                       │
     │  • HCS genesis msg     │  ──────────────────────► │                       │
     │  • KMS sign            │  • KMS sign              │  Scan QR Code         │
     │                        │  • HCS message           │  ─────────────────────►
     │                        │  • NFT transfer          │  • Mirror Node verify  │
     │                        │  • Status update         │  • Chain integrity chk │
     │                        │                          │  • Return result ◄───── │
```

---

## Key Features

| Feature | Description |
|---|---|
| 🔗 **NFT-backed Batches** | Every drug batch mints a unique NFT on Hedera Token Service (HTS), creating a cryptographically unique identifier. |
| 📜 **Immutable Audit Trail** | All custody handoffs are published to Hedera Consensus Service (HCS) — they cannot be altered or deleted after submission. |
| 🔐 **AWS KMS Signing** | Every handoff message is signed with ECDSA_SHA_256 via AWS KMS, ensuring non-repudiation across the supply chain. |
| 🌐 **IPFS Metadata** | Batch metadata (drug details, NDC codes, lot numbers) is stored on IPFS via Pinata, with the hash embedded in the NFT. |
| 🤖 **AI Anomaly Detection** | An autonomous AI agent scans every batch every 30 seconds for chain breaks, temperature excursions, expiry risk, and counterfeit indicators, using OpenAI first and OpenRouter Gemini 2.5 Flash Lite as fallback when configured. |
| 📱 **Public QR Verification** | Anyone can scan a QR code to instantly verify a drug's authenticity — no account, no login, no app installation required. |
| ⛓️ **Smart Contracts** | Solidity contracts on the Hedera EVM provide on-chain batch registration and recall management. |
| 🚨 **Alert Dashboard** | A real-time dashboard shows active anomalies with severity levels (LOW → CRITICAL) and supports manual resolution. |
| 🐳 **Docker-ready** | The entire stack (API, Web, Postgres) can be launched with a single `docker compose up`. |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                             │
│  ┌──────────────────────┐    ┌──────────────────────────────┐  │
│  │   Next.js 15 Web App │    │  Mobile / 3rd-Party Client   │  │
│  │  (Tailwind CSS, QR)  │    │      (REST / QR Scan)        │  │
│  └──────────┬───────────┘    └──────────────┬───────────────┘  │
└─────────────┼───────────────────────────────┼───────────────────┘
              │ HTTP/REST                      │ HTTP/REST
┌─────────────▼───────────────────────────────▼───────────────────┐
│                        API LAYER (Port 4000)                    │
│               Express.js + TypeScript + Prisma ORM              │
│  ┌──────────┐ ┌───────────┐ ┌──────────┐ ┌───────────────────┐ │
│  │ /batches │ │ /handoffs │ │ /verify  │ │     /alerts       │ │
│  └──────────┘ └───────────┘ └──────────┘ └───────────────────┘ │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                     SERVICE LAYER                           ││
│  │  HederaService │ KMSService │ IPFSService │ AIAgentService  ││
│  └────────┬───────┴─────┬──────┴──────┬──────┴───────┬─────────┘│
└───────────┼─────────────┼────────────┼──────────────┼───────────┘
            │             │            │              │
   ┌────────▼──────┐ ┌────▼───┐ ┌─────▼──────┐ ┌───▼────────────┐
  │    Hedera     │ │AWS KMS │ │   Pinata   │ │ OpenAI/OpenRouter │
   │  Testnet /    │ │ (Sign) │ │   (IPFS)   │ │  (Anomaly Det) │
   │  Mainnet      │ └────────┘ └────────────┘ └────────────────┘
   │  ┌──────────┐ │
   │  │ HTS NFTs │ │
   │  │ HCS Msgs │ │
   │  │ EVM Ctrs │ │
   │  └──────────┘ │
   └───────┬───────┘
           │
   ┌───────▼────────────────────┐
   │   PostgreSQL 16 (Prisma)   │
   │  Batches │ Handoffs │ Alerts│
   └────────────────────────────┘
```

---

## Tech Stack

### Backend (`apps/api`)

| Layer | Technology |
|---|---|
| Runtime | Node.js 20 |
| Language | TypeScript 5 |
| Framework | Express.js 4.19 |
| ORM | Prisma 5.12 |
| Database | PostgreSQL 16 |
| Blockchain | `@hashgraph/sdk` 2.81 (HCS + HTS) |
| EVM | Ethers.js |
| Cryptography | AWS SDK KMS — ECDSA_SHA_256 |
| AI/LLM | LangChain 1.2 + OpenAI GPT-4o with OpenRouter Gemini 2.5 Flash Lite fallback |
| Storage | Pinata IPFS |
| Auth | JWT (`jsonwebtoken` 9.0) |
| Validation | Zod |
| Security | Helmet.js, CORS |
| Testing | Jest 29.7, ts-jest |

### Frontend (`apps/web`)

| Layer | Technology |
|---|---|
| Framework | Next.js 15.2 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 3.4 |
| QR Scanning | html5-qrcode 2.3, react-qr-code 2.0 |
| Auth | next-auth 4.24 |

### Smart Contracts (`packages/contracts`)

| Layer | Technology |
|---|---|
| Language | Solidity 0.8.20 |
| Framework | Hardhat 2.22 |
| Target Networks | Hedera Testnet (chainId 296), Hedera Mainnet (chainId 295) |

### Infrastructure

| Component | Technology |
|---|---|
| Containerisation | Docker (multi-stage builds) |
| Orchestration | Docker Compose v3.9 |
| Package Manager | npm workspaces |

---

## Project Structure

```
PharmTrace/
├── apps/
│   ├── api/                          # Express.js backend
│   │   ├── src/
│   │   │   ├── index.ts              # App entry point & server setup
│   │   │   ├── routes/
│   │   │   │   ├── batches.ts        # Batch CRUD, NFT minting, genesis HCS events
│   │   │   │   ├── handoffs.ts       # Handoff recording, KMS signing, NFT transfer
│   │   │   │   ├── verify.ts         # Public verification (unauthenticated)
│   │   │   │   └── alerts.ts         # AI alert management
│   │   │   ├── services/
│   │   │   │   ├── HederaService.ts  # HCS, HTS, NFT, Mirror Node integration
│   │   │   │   ├── AIAgentService.ts # AI anomaly detection loop with provider fallback
│   │   │   │   ├── KMSService.ts     # AWS KMS signing & verification
│   │   │   │   ├── IPFSService.ts    # Pinata IPFS upload/retrieval
│   │   │   │   └── MirrorService.ts  # Hedera Mirror Node queries
│   │   │   ├── middleware/
│   │   │   │   └── auth.ts           # JWT Bearer token middleware
│   │   │   ├── lib/
│   │   │   │   └── prisma.ts         # Prisma client singleton
│   │   │   └── __tests__/
│   │   │       └── KMSService.test.ts
│   │   ├── prisma/
│   │   │   └── schema.prisma         # Database schema
│   │   ├── Dockerfile
│   │   ├── jest.config.json
│   │   └── package.json
│   │
│   └── web/                          # Next.js 15 frontend
│       ├── app/
│       │   ├── page.tsx              # Landing page
│       │   ├── scan/page.tsx         # QR code scanner
│       │   ├── verify/[batchId]/page.tsx  # Public verification results
│       │   ├── dashboard/
│       │   │   ├── batches/page.tsx  # Batch management table
│       │   │   ├── handoffs/page.tsx # Handoff history
│       │   │   └── alerts/page.tsx   # Alert dashboard
│       │   ├── monitor/page.tsx      # Real-time HCS alert feed
│       │   └── (auth)/login/page.tsx # Login
│       ├── components/
│       │   ├── QRScanner.tsx         # Camera-based QR scanning
│       │   ├── VerificationResult.tsx
│       │   └── ChainTimeline.tsx     # Custody chain visualisation
│       └── package.json
│
├── packages/
│   ├── shared/                       # Shared TypeScript types
│   │   └── types/index.ts
│   └── contracts/                    # Solidity smart contracts
│       ├── contracts/
│       │   ├── BatchRegistry.sol     # On-chain batch registry & recall
│       │   └── RecallManager.sol     # Standalone recall management
│       ├── scripts/deploy.ts
│       ├── test/BatchRegistry.test.ts
│       └── hardhat.config.ts
│
├── scripts/
│   └── setup-hedera.ts               # One-time HCS topic initialisation
├── docker-compose.yml
├── .env.example
└── package.json                      # Root npm workspace config
```

---

## Prerequisites

Before you begin, make sure you have the following accounts and tools set up:

| Requirement | Details |
|---|---|
| **Node.js 20+** | [nodejs.org](https://nodejs.org) — npm is included |
| **Docker & Docker Compose** | [docs.docker.com](https://docs.docker.com/get-docker/) |
| **Hedera Account** | Free testnet account at [portal.hedera.com](https://portal.hedera.com) — you need an operator Account ID and private key |
| **AWS Account** | An IAM user with `kms:Sign`, `kms:Verify`, `kms:CreateKey`, `kms:CreateAlias` permissions. KMS keys are created automatically at manufacturer onboarding. |
| **Pinata Account** | Free tier at [pinata.cloud](https://pinata.cloud) — for IPFS metadata storage |
| **OpenAI or OpenRouter API Key** | [platform.openai.com](https://platform.openai.com) or [openrouter.ai](https://openrouter.ai) — at least one provider is required for AI anomaly detection |

---

## Getting Started

### 1. Clone & Install

```bash
git clone https://github.com/RippleOrg/PharmTrace.git
cd PharmTrace
npm install        # Installs all workspace dependencies (api, web, contracts, shared)
```

### 2. Environment Configuration

Copy the example environment file and fill in your credentials:

```bash
cp .env.example .env
```

Open `.env` and configure every value:

```env
# ── Hedera ─────────────────────────────────────────────────────────
HEDERA_OPERATOR_ID=0.0.XXXXX           # Your Hedera account ID
HEDERA_OPERATOR_KEY=302e...            # Private key (ED25519 or ECDSA, DER-encoded)
HEDERA_NETWORK=testnet                 # "testnet" or "mainnet"
HEDERA_SUPPLY_CHAIN_TOPIC_ID=0.0.8351042
HEDERA_ALERTS_TOPIC_ID=0.0.8351043
HEDERA_CONTRACT_ID=0x99E649c8a79C23B949b6fEBe734980590cf7F21C
HEDERA_BATCH_REGISTRY_ADDRESS=0x99E649c8a79C23B949b6fEBe734980590cf7F21C
HEDERA_RECALL_MANAGER_ADDRESS=0xA5c6be9555523779AaE828848b7c87FCE957DBA4

# ── AWS KMS ────────────────────────────────────────────────────────
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...

# ── PostgreSQL ─────────────────────────────────────────────────────
POSTGRES_PASSWORD=change_me_in_production
DATABASE_URL=postgresql://pharmtrace:change_me_in_production@localhost:5432/pharmtrace

# ── AI Providers ───────────────────────────────────────────────────
OPENAI_API_KEY=sk-...                  # Primary provider (optional if OpenRouter is set)
OPENAI_MODEL=gpt-4o                    # Optional override
OPENROUTER_API_KEY=sk-or-v1-...        # Fallback provider (optional if OpenAI is set)
OPENROUTER_MODEL=google/gemini-2.5-flash-lite
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_SITE_URL=http://localhost:3000
OPENROUTER_APP_NAME=PharmTrace

# ── Pinata IPFS ────────────────────────────────────────────────────
PINATA_API_KEY=...
PINATA_SECRET_API_KEY=...

# ── Frontend / Auth ────────────────────────────────────────────────
NEXT_PUBLIC_URL=http://localhost:3000  # Public URL (used for QR code generation)
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXTAUTH_SECRET=generate_a_random_32_char_string
JWT_SECRET=generate_another_random_32_char_string
```

> **Tip:** Generate secure secrets with `openssl rand -hex 32`.

### 3. Initialise Hedera Topics

This one-time script creates the two HCS topics (supply chain + alerts) and prints their IDs. Copy the output into your `.env`.

```bash
npm run setup:hedera
# Output:
#   Supply Chain Topic: 0.0.8351042 → set HEDERA_SUPPLY_CHAIN_TOPIC_ID
#   Alerts Topic:       0.0.8351043 → set HEDERA_ALERTS_TOPIC_ID
```

### 4. Database Setup

Start PostgreSQL (if not using Docker Compose for everything) and run the Prisma migrations:

```bash
# Start only the database container
docker compose up postgres -d

# Run migrations and generate the Prisma client
npm run prisma:migrate --workspace=apps/api
```

### 5. Run in Development Mode

This starts the API (port 4000) and Web (port 3000) concurrently with hot-reload:

```bash
npm run dev
```

| Service | URL |
|---|---|
| API | `http://localhost:4000` |
| Web | `http://localhost:3000` |
| Health check | `http://localhost:4000/health` |

### 6. Run with Docker Compose

To run the full stack (Postgres + API + Web) in containers:

```bash
docker compose up --build
```

Services are exposed on the same ports (`3000` and `4000`) as development mode. Data is persisted in a named Docker volume (`pgdata`).

To stop and remove containers:

```bash
docker compose down
```

---

## API Reference

All protected endpoints require a JWT Bearer token in the `Authorization` header:

```
Authorization: Bearer <your-jwt-token>
```

### Health

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/health` | ❌ Public | Returns `{ status: "ok", timestamp: "..." }` |

---

### Batches — `POST /api/batches`

**Auth:** JWT required

**Request Body:**

```json
{
  "drugName": "Aspirin",
  "genericName": "Acetylsalicylic Acid",
  "ndcCode": "0363-0132-01",
  "lotNumber": "LOT-2024-001",
  "manufacturerId": "cuid_of_manufacturer",
  "manufactureDate": "2024-01-01T00:00:00Z",
  "expiryDate": "2026-01-01T00:00:00Z",
  "quantity": 10000,
  "strengthMg": 500.0
}
```

**What happens internally:**
1. Uploads batch metadata to IPFS via Pinata.
2. Creates (or reuses) an HTS NFT collection for the manufacturer.
3. Mints one NFT (serial #1) with the IPFS URI.
4. Signs the genesis event with AWS KMS (ECDSA_SHA_256).
5. Submits a `MANUFACTURED` message to the HCS supply chain topic.
6. Persists the batch and genesis handoff in PostgreSQL.

**Response `201`:**

```json
{
  "batch": {
    "id": "clxxxxxx",
    "batchNumber": "PT-1711234567890",
    "drugName": "Aspirin",
    "htsTokenId": "0.0.12345",
    "htsSerialNumber": 1,
    "ipfsHash": "Qm...",
    "status": "MANUFACTURED"
  },
  "qrUrl": "https://your-domain.com/verify/clxxxxxx"
}
```

---

### Batches — `GET /api/batches`

**Auth:** JWT required

Returns all batches ordered by creation date (newest first), including manufacturer info and counts of handoffs and alerts.

---

### Batches — `GET /api/batches/:id`

**Auth:** JWT required

Returns a single batch with full manufacturer details, ordered handoff history, and all alerts.

---

### Batches — `GET /api/batches/:id/verify`

**Auth:** ❌ Public (no token required)

Verifies chain integrity by cross-referencing the database handoff records with the Hedera Mirror Node. Used as the QR code scan target.

**Response:**

```json
{
  "verified": true,
  "reason": "VERIFIED",
  "batch": {
    "id": "clxxxxxx",
    "batchNumber": "PT-1711234567890",
    "drugName": "Aspirin",
    "manufacturer": "Manufacturer Inc.",
    "htsTokenId": "0.0.12345",
    "htsSerialNumber": 1
  },
  "chain": [
    {
      "sequenceNumber": 1,
      "timestamp": "2024-01-01T10:00:00Z",
      "message": { "event": "MANUFACTURED", "..." : "..." }
    }
  ],
  "handoffCount": 3,
  "activeAlerts": 0,
  "mirrorNodeUrl": "https://hashscan.io/{testnet|mainnet}/token/0.0.12345/1"
}
```

---

### Handoffs — `POST /api/handoffs`

**Auth:** JWT required

Records a custody transfer. Signs the event with KMS, publishes it to HCS, optionally transfers the HTS NFT, and updates the batch status.

**Request Body:**

```json
{
  "batchId": "clxxxxxx",
  "fromParty": "Manufacturer Inc.",
  "fromPartyType": "MANUFACTURER",
  "toParty": "Distributor LLC",
  "toPartyType": "DISTRIBUTOR",
  "fromAccountId": "0.0.xxxxx",
  "toAccountId": "0.0.yyyyy",
  "temperature": 20.5,
  "location": "Chicago, IL",
  "fromPrivateKey": "302e..."
}
```

> `fromPrivateKey` is optional. When provided, it triggers an on-chain HTS NFT transfer in addition to the HCS message.

**Batch status after handoff:**

| `toPartyType` | New `BatchStatus` |
|---|---|
| `DISTRIBUTOR` | `DISTRIBUTED` |
| `PHARMACY` | `AT_PHARMACY` |
| `HOSPITAL` | `AT_PHARMACY` |
| Other | `IN_TRANSIT` |

**Response `201`:**

```json
{
  "handoff": { "id": "...", "hcsMessageId": "42", "..." : "..." },
  "hcsSequenceNumber": "42"
}
```

---

### Handoffs — `GET /api/handoffs`

**Auth:** JWT required

Lists handoffs. Pass `?batchId=clxxxxxx` to filter by batch.

---

### Verify — `GET /api/verify/:batchId`

**Auth:** ❌ Public

Standalone public verification endpoint (same logic as `GET /api/batches/:id/verify`). This is the URL embedded in QR codes.

---

### Alerts — `GET /api/alerts`

**Auth:** JWT required

Lists AI-generated anomaly alerts.

**Query parameters:**

| Parameter | Type | Description |
|---|---|---|
| `batchId` | string | Filter by batch ID |
| `resolved` | boolean | `true` / `false` |
| `severity` | string | `LOW`, `MEDIUM`, `HIGH`, `CRITICAL` |

---

### Alerts — `GET /api/alerts/:id`

**Auth:** JWT required

Returns a single alert with the related batch's full handoff history.

---

### Alerts — `PATCH /api/alerts/:id/resolve`

**Auth:** JWT required

Marks an alert as resolved.

---

## Smart Contracts

Smart contracts are located in `packages/contracts/contracts/`.

### `BatchRegistry.sol`

Provides on-chain registration and recall capabilities:

- `registerBatch(string batchId, string htsTokenId, uint256 serialNumber, string ipfsHash)` — links a batch to its HTS NFT.
- `authorizeManufacturer(address mfr)` / `revokeManufacturer(address mfr)` — access control for who can register batches.
- `recallBatch(string batchId)` — emits an on-chain recall event and updates the batch's recall status.
- `getBatch(string batchId)` — returns on-chain batch record.

### `RecallManager.sol`

Standalone recall state machine:

- Recall statuses: `PENDING → ACTIVE → COMPLETED / CANCELLED`
- `initiateRecall(string[] affectedLots, string reason)` — creates a new recall record.
- `updateRecallStatus(uint256 recallId, RecallStatus newStatus)` — transitions recall state.
- `getActiveRecalls()` — returns all non-completed recalls.

### Deploying Contracts

```bash
# Configure HEDERA_EVM_PRIVATE_KEY in your .env first
cd packages/contracts
npx hardhat run scripts/deploy.ts --network hedera_testnet
```

Network configs are defined in `hardhat.config.ts`:

```typescript
networks: {
  hedera_testnet: { url: "https://testnet.hashio.io/api", chainId: 296 },
  hedera_mainnet: { url: "https://mainnet.hashio.io/api", chainId: 295 },
}
```

---

## Database Schema

PharmTrace uses PostgreSQL managed through Prisma. The schema is defined in `apps/api/prisma/schema.prisma`.

### Tables

**`Manufacturer`**

| Column | Type | Notes |
|---|---|---|
| `id` | String (cuid) | Primary key |
| `name` | String | Company name |
| `licenseNumber` | String | Unique license identifier |
| `hederaAccountId` | String | Hedera account (e.g. `0.0.xxxxx`) |
| `kmsKeyId` | String | AWS KMS key ARN |
| `kmsKeyAlias` | String | KMS key alias |
| `htsTokenId` | String? | Assigned HTS token for NFT minting |

**`Batch`**

| Column | Type | Notes |
|---|---|---|
| `id` | String (cuid) | Primary key |
| `batchNumber` | String | `PT-{timestamp}`, unique |
| `drugName` | String | Brand name |
| `genericName` | String | INN / generic name |
| `ndcCode` | String | National Drug Code |
| `lotNumber` | String | Manufacturer lot |
| `status` | `BatchStatus` | See enum below |
| `htsTokenId` | String? | Hedera HTS token ID |
| `htsSerialNumber` | Int? | NFT serial number |
| `ipfsHash` | String? | Pinata IPFS CID |

**`Handoff`**

| Column | Type | Notes |
|---|---|---|
| `id` | String (cuid) | Primary key |
| `batchId` | String | Foreign key → `Batch` |
| `fromParty` / `toParty` | String | Party names |
| `fromPartyType` / `toPartyType` | `PartyType` | See enum below |
| `fromAccountId` / `toAccountId` | String | Hedera account IDs |
| `hcsMessageId` | String? | HCS sequence number |
| `hcsTopicId` | String | HCS topic ID |
| `kmsSignature` | String? | Base64 ECDSA signature |
| `temperature` | Float? | °C at time of transfer |
| `location` | String? | Free-text location |

**`Alert`**

| Column | Type | Notes |
|---|---|---|
| `id` | String (cuid) | Primary key |
| `batchId` | String | Foreign key → `Batch` |
| `alertType` | `AlertType` | See enum below |
| `severity` | `Severity` | See enum below |
| `description` | String | Human-readable description |
| `aiAnalysis` | String? | Raw AI analysis output |
| `resolved` | Boolean | Default `false` |

### Enums

```
BatchStatus:  MANUFACTURED | DISTRIBUTED | IN_TRANSIT | AT_PHARMACY | DISPENSED | RECALLED | FLAGGED
PartyType:    MANUFACTURER | DISTRIBUTOR | PHARMACY | HOSPITAL | REGULATOR
AlertType:    CHAIN_BREAK | TEMPERATURE_EXCURSION | EXPIRY_RISK | COUNTERFEIT_SUSPECTED | RECALL
Severity:     LOW | MEDIUM | HIGH | CRITICAL
```

---

## Security Model

PharmTrace uses a defence-in-depth approach:

| Control | Implementation |
|---|---|
| **Non-repudiation** | Every handoff is signed with AWS KMS ECDSA_SHA_256. The signature and key ID are stored with the handoff record and embedded in the HCS message. |
| **Immutability** | HCS messages are write-once and sequenced by Hedera consensus nodes. They cannot be modified or deleted after submission. |
| **API Authentication** | Protected endpoints require a valid JWT Bearer token. Tokens are signed with the `JWT_SECRET` environment variable. |
| **Input Validation** | All request bodies are validated at the route layer with Zod schemas before any processing occurs. |
| **Security Headers** | Helmet.js sets recommended HTTP security headers (CSP, HSTS, X-Frame-Options, etc.). |
| **CORS** | The API only accepts cross-origin requests from the configured `NEXT_PUBLIC_URL`. |
| **Secrets Management** | No secrets are stored in the codebase. All credentials are injected via environment variables. |
| **NFT Ownership** | HTS NFT transfers require the sender's private key, ensuring on-chain custody is enforced by Hedera's consensus mechanism. |

> ⚠️ **Never commit your `.env` file or any private keys to version control.**

---

## Testing

```bash
# Run all tests (API unit tests + contract tests)
npm test

# Run API tests only
npm test --workspace=apps/api

# Run contract tests only
npm test --workspace=packages/contracts

# Run API tests in watch mode
cd apps/api && npx jest --watch
```

The API test suite uses Jest with `ts-jest` and is located in `apps/api/src/__tests__/`. Contract tests use Hardhat's built-in Mocha/Chai runner in `packages/contracts/test/`.

---

## Deployment

### Environment Variables for Production

When deploying to production, ensure the following are changed from their defaults:

- `HEDERA_NETWORK=mainnet`
- Strong, randomly generated `JWT_SECRET` and `NEXTAUTH_SECRET`
- Strong `POSTGRES_PASSWORD`
- `NEXT_PUBLIC_URL` set to your actual domain

### Docker Compose (Self-hosted)

```bash
# Build and start all services
docker compose up --build -d

# View logs
docker compose logs -f api
docker compose logs -f web

# Scale the API (optional)
docker compose up --scale api=2 -d
```

### Deploying the Frontend to Vercel

```bash
cd apps/web
npx vercel --prod
```

Set all `NEXT_PUBLIC_*` variables in the Vercel dashboard under **Project → Settings → Environment Variables**.

### Database Migrations in Production

```bash
# Apply pending migrations without resetting data
DATABASE_URL=<prod-url> npx prisma migrate deploy --schema=apps/api/prisma/schema.prisma
```

---

## Contributing

Contributions are welcome! Please follow these steps:

1. **Fork** the repository and create a new branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**, following the existing code style (TypeScript strict mode, ESLint).

3. **Run lint and tests** before pushing:
   ```bash
   npm run lint
   npm test
   ```

4. **Open a Pull Request** against the `main` branch. Describe what your PR does and reference any relevant issues.

### Code Style

- TypeScript strict mode is enforced across all packages.
- ESLint is configured for both `apps/api` and `apps/web`.
- Run `npm run lint` to check for issues before submitting a PR.

---

## License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

*Built with ❤️ by the RippleOrg team to make pharmaceutical supply chains safer for everyone.*
