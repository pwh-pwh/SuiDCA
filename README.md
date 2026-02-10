# Cetus DCA Studio (Sui)

[中文文档](./README.zh-CN.md)

## Project Overview

Cetus DCA Studio is a premium DCA strategy console on Sui. It focuses on strategy design, execution, and portfolio-level control.

## Key Features

- Strategy templates (Conservative / Balanced / Aggressive)
- Multi-strategy management (save / load / delete)
- ROI visualization (average cost curve + price band estimate)
- DCA order management (open / withdraw / close)
- Network-aware UI (testnet / mainnet)

> Note: Creating a DCA order requires a valid `signature` + `timestamp` issued by the Cetus signer service. The official signer endpoint is not publicly documented, so this project currently expects manual input for signature fields.

## Quick Start

```bash
pnpm install
pnpm dev
```

Open the app and use the DCA dashboard:

- Choose a strategy template or fill parameters manually.
- Fill `signature` + `timestamp` if you want to create orders.
- Manage orders in the “My DCA Orders” section.

## Environment

Set the network package ID in `packages/frontend/.env.local`:

```
NEXT_PUBLIC_TESTNET_CONTRACT_PACKAGE_ID=...
```

## Monorepo Structure

- `packages/frontend`: Next.js app (App Router)
- `packages/backend`: Move package + Suibase helpers

## Backend (Move) deployment

The backend is a Move package. Deploying it writes the package id into `packages/frontend/.env.local`.

### Localnet (optional)

```bash
pnpm localnet:start
pnpm localnet:deploy
```

### Devnet / Testnet / Mainnet

```bash
pnpm devnet:deploy
# or: pnpm testnet:deploy
# or: pnpm mainnet:deploy
```

Notes:

- Mainnet has no faucet; you need a funded address.
- Useful helpers: `pnpm devnet:address` / `pnpm testnet:address` / `pnpm mainnet:address` and `pnpm devnet:links` / `pnpm testnet:links` / `pnpm mainnet:links`.
- If you run into dependency verification issues, there are `*:deploy:no-dependency-check` scripts (use with care).
