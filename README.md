# WEV — Mini-App Platform

A production-style mono-repo demonstrating a mobile "super-app" kernel
(Host Shell + Mini-App Registry + typed Bridge SDK + permissions + fault
isolation) on top of a full Node/Express/Prisma/PostgreSQL backend with
JWT auth, RBAC, offline-first sync, and deterministic geo-privacy.

## Folder structure

```
/backend       Express + Prisma + PostgreSQL API
/mobile
  /app         Expo Router file-based routes (Host Shell screens + mini-app routes)
  /kernel      Registry, Bridge SDK, permissions, error boundaries, namespaced storage
  /mini-apps   sports/ care/ events/ — each isolated, communicating only via the bridge
  /shared      design tokens, offline queue, http client, auth store, UI primitives
  /types       shared TypeScript contracts (API DTOs, navigation, bridge events)
docker-compose.yml
SDK.md
ARCHITECTURE.md
```

## Prerequisites

- Docker + Docker Compose
- Node.js 20+
- npm
- Expo Go app on your phone, or an iOS/Android simulator

## 1. Start the backend (zero manual steps)

```bash
docker compose up --build
```

This single command:
1. Starts PostgreSQL and waits for its health check to pass.
2. Builds and starts the backend image.
3. The backend entrypoint automatically runs `prisma migrate deploy`,
   then runs the idempotent seed script, then starts the API.

No `docker exec`, no manual migration command, no manual seed command.

Verify it's up:

```bash
curl http://localhost:4000/health
```

Seeded demo accounts (password for all: `Password123!`):

| Email            | Role  |
|------------------|-------|
| admin@wev.dev    | ADMIN |
| host@wev.dev     | HOST  |
| user@wev.dev     | USER  |

## 2. Run the mobile app

```bash
cd mobile
npm install
npx expo start
```

Scan the QR code with Expo Go (or press `i` / `a` for a simulator). By
default the app points at `http://localhost:4000` (see `mobile/.env`). If
you're testing on a physical device on the same network, change
`EXPO_PUBLIC_API_URL` in `mobile/.env` to your machine's LAN IP.

## 3. What to try

- **Register / log in** — JWT access + refresh token rotation, stored in
  Expo Secure Store. Kill the app and reopen it; the session persists.
- **Sports → book a 2-hour session** — after confirmation, switch to the
  **Care** tab: a "Need childcare during this session?" banner appears,
  driven entirely by a typed event over the kernel bridge (no direct
  import between the two mini-apps). Tap it to deep-link into Care's
  booking screen with the time slot prefilled.
- **Sports → "Debug: Crash Sports"** — throws inside the Sports mini-app.
  Its `MiniAppErrorBoundary` catches it and shows a remount screen; Care
  and Events remain fully functional the entire time (fault isolation).
- **Offline booking** — turn on airplane mode, book a session. It's queued
  locally (FIFO) with state `QUEUED`; turn connectivity back on and it
  syncs automatically. Book the exact same slot from two clients to see a
  simulated `409` conflict roll back the optimistic UI.
- **Care provider list** — coordinates returned by `/providers` are always
  the deterministically-obfuscated ones (see `ARCHITECTURE.md#geo-privacy`);
  real coordinates never leave the backend process.

## Environment variables

See `backend/.env.example` and `mobile/.env.example`. Working defaults are
already checked in as `backend/.env` and `mobile/.env` for local
development — **never use these secrets in production.**

## Linting / formatting / type-checking

```bash
# backend
cd backend && npm run lint && npm run build

# mobile
cd mobile && npm run lint && npm run typecheck
```

## Documentation

- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — kernel design, registry, bridge,
  permissions, RBAC, offline queue, geo-obfuscation, repository pattern,
  trade-offs, future improvements.
- [`SDK.md`](./SDK.md) — full `wev` Bridge SDK reference with examples.

## Screenshots

_Add screenshots here after running the app:_

- `docs/screenshots/host-shell.png` — mini-app launcher grid
- `docs/screenshots/sports-booking.png` — booking flow with duration presets
- `docs/screenshots/care-suggestion-banner.png` — cross-app suggestion banner
- `docs/screenshots/offline-queue.png` — offline booking state
