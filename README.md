# WEV — Mini-App Platform

A production-style monorepo demonstrating a mobile super-app architecture (Host Shell + Mini-App Registry + typed Bridge SDK + permissions + fault isolation), built on a Node.js/Express/Prisma/PostgreSQL backend with JWT authentication, role-based access control (RBAC), offline-first sync, and deterministic geo-privacy.

## Folder Structure

```text
/backend       Express + Prisma + PostgreSQL API
/mobile
  /app         Expo Router file-based routes (Host Shell + mini-app routes)
  /kernel      Registry, Bridge SDK, permissions, error boundaries, namespaced storage
  /mini-apps   sports/, care/, events/ — isolated mini-apps
  /shared      Design tokens, offline queue, HTTP client, auth store, UI primitives
  /types       Shared TypeScript contracts (API DTOs, navigation, bridge events)
docker-compose.yml
SDK.md
ARCHITECTURE.md
```

## Prerequisites

- Docker and Docker Compose
- Node.js 20+
- npm
- Expo Go on your phone, or an iOS/Android simulator

## 1. Start the Backend

From the project root, run:

```bash
docker compose up --build
```

This single command:

1. Starts PostgreSQL and waits for its health check.
2. Builds and starts the backend container.
3. Runs `prisma migrate deploy`, executes the idempotent seed script, and starts the API.

No manual database migration or seed commands are required.

Verify that the API is running:

```bash
curl http://localhost:4000/health
```

### Seeded Demo Accounts

All demo accounts use the password `Password123!`.

| Email | Role |
|---|---|
| admin@wev.dev | ADMIN |
| host@wev.dev | HOST |
| user@wev.dev | USER |

**Security note:** These are development-only demo credentials. Never use them in production.

## 2. Run the Mobile App

Open a separate terminal from the project root and run:

```bash
cd mobile
npm install
npx expo start
```

Scan the QR code with Expo Go, or press `a` for an Android emulator or `i` for an iOS simulator.

By default, the app uses `http://localhost:4000`. Check `mobile/.env` for `EXPO_PUBLIC_API_URL`.

When testing on a physical device, configure `EXPO_PUBLIC_API_URL` in `mobile/.env` to use your computer's LAN IP address instead of `localhost`. Ensure the phone and computer are on the same network and the backend is reachable.

## 3. Features to Try

- **Register and log in:** JWT access and refresh token rotation, with sessions stored using Expo Secure Store.
- **Cross-app integration:** Book a two-hour session in Sports, then switch to Care. A childcare suggestion appears through a typed kernel bridge event, without direct imports between mini-apps. Tap it to open the Care booking screen with the time slot prefilled.
- **Fault isolation:** Use Sports → "Debug: Crash Sports" to trigger a mini-app error. Its `MiniAppErrorBoundary` displays a recovery screen while Care and Events remain functional.
- **Offline booking:** Enable airplane mode and create a booking. It is queued locally with the `QUEUED` state and syncs when connectivity returns. Booking the same slot from two clients demonstrates conflict handling through a simulated `409` response.
- **Geo-privacy:** The Care provider list receives deterministically obfuscated coordinates from `/providers`. Real coordinates remain inside the backend process.

## Environment Variables

Environment templates are provided in:

- `backend/.env.example`
- `mobile/.env.example`

Local development environment files may be present as `backend/.env` and `mobile/.env`.

**Never commit real credentials, database passwords, JWT secrets, API keys, or other sensitive values.** Keep `.env` files out of Git and use `.env.example` files containing placeholders.

## Linting, Formatting, and Type Checking

### Backend

```bash
cd backend
npm run lint
npm run build
```

### Mobile

```bash
cd mobile
npm run lint
npm run typecheck
```

Run these commands from their respective directories.

## Documentation

- [ARCHITECTURE.md](ARCHITECTURE.md) — Kernel design, registry, bridge, permissions, RBAC, offline queue, geo-obfuscation, repository pattern, trade-offs, and future improvements.
- [SDK.md](SDK.md) — Reference for the `wev` Bridge SDK, with usage examples.

## Screenshots

Add screenshots after running the application:

| Screenshot | Description |
|---|---|
| `docs/screenshots/host-shell.png` | Mini-app launcher grid |
| `docs/screenshots/sports-booking.png` | Booking flow with duration presets |
| `docs/screenshots/care-suggestion-banner.png` | Cross-app suggestion banner |
| `docs/screenshots/offline-queue.png` | Offline booking state |

Create the `docs/screenshots/` directory and add the corresponding images when they are available.
