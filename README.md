# Qubic Refund Console

Modernized Next.js app for mirroring CFB/QXMR swaps with a hardened backend and a streamlined dashboard.

## Highlights

- **Backend-first engine** – All monitoring and refund logic lives inside `app/api/refunds`, so seeds never reach the browser.
- **Adaptive UI** – Glassmorphic dashboard with live stats, auto-monitor toggle, and contextual guidance.
- **Audit trail** – In-memory ledger keeps a rolling history of recent refunds (success, skipped, failed).
- **Lean codebase** – Shared Qubic helper (`lib/qubic.ts`) powers both decoding and broadcast flows with minimal duplication.

## Getting Started

```bash
npm install
npm run dev
# visit http://localhost:3000
```

### Required environment

Create `.env.local` (never commit secrets):

```
QUBIC_RPC_URL=https://rpc.qubic.org
QUBIC_ACCOUNT_ID=YOUR_PUBLIC_ID
QUBIC_ACCOUNT_SEED=YOUR_55_CHAR_SEED
QUBIC_QXMR_ASSET_ISSUER=QXMRTKAIIGLUREPIQPCMHCKWSIPDTUYFCFNYXQLTECSUJVYEMMDELBMDOEYB
QUBIC_QXMR_ASSET_NAME=QXMR
QUBIC_CFB_ASSET_ISSUER=CFBMEMZOIDEXQAUXYYSZIURADQLAPWPMNJXQSNVQZAHYVOPYUKKJBJUCTVJL
QUBIC_CFB_ASSET_NAME=CFB
QUBIC_REFUND_RATE=100
```

Override issuers, asset names, or the rate (CFB units per QXMR) as needed.

## Architecture

- `lib/qubic.ts` – Typed helpers for ticks, payload decoding, and QX asset transfers.
- `lib/refund-runner.ts` – Stateful worker that scans ticks, enforces swap profiles, and logs history.
- `app/api/refunds/route.ts` – GET returns state, POST triggers a processing cycle.
- `app/page.tsx` – Client dashboard that polls status, triggers cycles, and visualizes history.

## Deployment Notes

- Deploy anywhere Next.js App Router is supported (Vercel, Node server).
- Ensure env vars are configured per environment; backend refuses to run without them.
- For persistent history, swap the in-memory state with a database or KV store.

## Scripts

| Command      | Description                |
|--------------|----------------------------|
| `npm run dev`   | Start local dev server    |
| `npm run build` | Production build          |
| `npm start`     | Run production server     |
| `npm run lint`  | ESLint check              |
