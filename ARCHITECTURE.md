# Architecture

## Overview

WEV is a "super-app" style platform: one Host Shell mobile app hosts
multiple independent **mini-apps** (Sports, Care, Events), each isolated
from the others, communicating only through a typed **Bridge SDK**. A
single Node/Express/Prisma/PostgreSQL backend serves all of them.

```
┌─────────────────────────────── Mobile (Expo) ───────────────────────────────┐
│  Host Shell (app/index.tsx)                                                 │
│    ├─ MiniAppRegistry  (kernel/registry)                                    │
│    ├─ MountMiniApp     (kernel/host)  ── mounts/unmounts + scopes bridge    │
│    │     ├─ MiniAppErrorBoundary (fault isolation)                          │
│    │     └─ BridgeProvider → wev SDK (permission-checked)                   │
│    │                                                                        │
│    ├─ /sports  (mini-apps/sports)  ─┐                                       │
│    ├─ /care    (mini-apps/care)    ─┼── communicate ONLY via bridgeEventBus │
│    └─ /events  (mini-apps/events)  ─┘                                       │
│                                                                              │
│  shared/  (design tokens, offline queue, http client, auth store)           │
└──────────────────────────────────────────────────────────────────────────────┘
                                     │ REST (JWT)
┌────────────────────────────────── Backend (Express) ─────────────────────────┐
│  routes → middleware(auth, rbac) → controllers → prisma → PostgreSQL         │
└──────────────────────────────────────────────────────────────────────────────┘
```

## Kernel

### Registry (`kernel/registry`)

`MINI_APP_MANIFESTS` is the static source of truth for every installed
mini-app: `id`, `name`, `version`, `entry`, and the `permissions` array it
was granted at registration time. `MiniAppRegistry` tracks each app's
runtime lifecycle status — `unmounted | mounted | crashed` — independently
per app id, which is what lets the Host Shell render live status badges
and is the bookkeeping half of fault isolation.

### Bridge (`kernel/bridge`)

Two pieces:

- `eventBus.ts` — a typed pub/sub bus (`emit<K>`, `on<K>`) keyed by the
  `BridgeEventMap` contract in `mobile/types/bridge.ts`. A throwing
  listener is caught and logged, never allowed to break the emitter or
  other listeners — this is bridge-level fault isolation, distinct from
  (and in addition to) the React error boundaries.
- `sdk.ts` — `createBridgeSDK(appId)` returns the `wev` object described
  in `SDK.md`. Every method is a thin, permission-checked wrapper around a
  kernel primitive (storage, nav, the event bus, or the auth store).
  Mini-apps only ever see this object; they never import
  `kernelStorage.ts`, `eventBus.ts`, or `permissions.ts` directly.

### Permissions (`kernel/permissions`)

`assertPermission(appId, permission)` looks up the manifest for `appId`
and throws `PermissionDeniedError` if the permission isn't declared. This
runs **inside every `wev.*` method**, before any side effect, satisfying
"Bridge permission validation before API call."

### Storage isolation (`kernel/storage`)

`KernelStorage` is constructed once per `appId` and physically prefixes
every AsyncStorage key with `miniapp:<appId>:`. There is no method that
accepts a foreign `appId`, so Sports cannot read or write into Care's
namespace even if it tried — the isolation is structural, not just a
runtime check.

### Fault isolation (`kernel/errorBoundary`, `kernel/host`)

Each mini-app route group (`app/sports/_layout.tsx`, `app/care/_layout.tsx`,
`app/events/_layout.tsx`) wraps its screens in exactly one
`MiniAppErrorBoundary` via `MountMiniApp`. A crash inside Sports:

1. Is caught by Sports' own boundary (not the root boundary).
2. Marks the registry entry `crashed` and emits `MINI_APP_CRASHED`.
3. Renders a scoped "remount" UI in place of Sports' screen only.

Because Care and Events are mounted as **separate route groups with their
own boundaries**, none of the above touches their component trees, their
Zustand stores, or their in-flight queries. The Sports "Debug: Crash
Sports" button exists specifically to demonstrate this.

### Dynamic mounting / unmounting

`MountMiniApp` marks the app `mounted` in the registry on mount and
`unmounted` on unmount (`useEffect` cleanup), driven purely by Expo
Router's own navigation lifecycle — navigating away from `/sports` tears
down its component tree and its registry entry, and Reanimated-driven
transitions (`FadeInDown` on the Host Shell grid, layout animations
implicit in `Stack` transitions) provide the native feel called for by the
performance requirements.

## Cross-app communication example

Sports never imports Care. Instead:

1. User books a **2-hour** session in Sports.
2. On success, `BookingScreen.tsx` calls
   `wev.bridge.emit("BOOKING_CREATED", { ... })`.
3. Care's `ProviderListScreen.tsx` subscribed with
   `wev.bridge.on("BOOKING_CREATED", ...)` on mount, and stores the
   payload in `useCareStore`.
4. A banner renders: "Need childcare during this session?" Tapping it
   calls `wev.nav.navigate("/care/book", { prefillStartTime, prefillDurationMins })`
   — a deep link into Care's own booking screen with the slot prefilled.

The only shared artifact between the two mini-apps is the `BridgeEventMap`
type declaration — pure data, not code.

## RBAC

Roles form a strict hierarchy: `GUEST < USER < HOST < ADMIN`
(`backend/src/middleware/rbac.middleware.ts`). `requireRole(min)` rejects
with `403` any request whose role ranks below `min` — including
unauthenticated (`GUEST`) requests hitting a `HOST`-or-above route, which
is the literal "Host endpoints reject Guest with HTTP 403" requirement.
`requireAuth` handles `401` for missing/expired JWTs separately, so the
mobile client can distinguish "not logged in" (401 → refresh/redirect)
from "logged in but not authorized" (403 → no retry).

Client-side, the kernel's permission system is a **separate, earlier**
gate: it stops an unauthorized mini-app call before a request is even
built, while RBAC is the backend's defense-in-depth in case that client
check is bypassed or a request is crafted by hand.

## Offline-first / Repository pattern

`shared/offline/offlineQueue.ts` implements a generic FIFO queue
(`QueuedBooking<T>`) persisted in AsyncStorage, used identically by both
Sports and Care (`mini-apps/*/offline/sync*.ts` — the "shared repository
layer" requirement, expressed as one shared module + a thin per-mini-app
adapter rather than a class hierarchy, since the two domains only differ
in which API call they make).

State machine per booking: `IDLE → QUEUED → SYNCING → SUCCESS |
CONFLICT_REJECTED`. `syncQueue()` processes strictly oldest-first and
stops (rather than skipping) on a non-conflict failure, preserving FIFO
ordering across retries. `useNetworkSync` (NetInfo-backed) fires exactly
once per offline→online transition, which is what triggers a drain of
both mini-apps' queues from the root layout.

Every booking create call carries a client-generated `clientRequestId`
that's `@unique` in the database — so retrying a queued request that
actually succeeded server-side (e.g. the response was lost, not the
write) is a no-op, not a duplicate booking.

**Conflict simulation**: the backend rejects a booking for an
already-taken `(activity/provider, startTime)` pair with `409
SLOT_CONFLICT`. The client treats `409` specially: it marks the item
`CONFLICT_REJECTED` (not retried) and rolls back the optimistic Zustand
entry, rather than looping it back into `QUEUED`.

## Geo privacy

`backend/src/utils/geo.ts` — `obfuscateCoordinates(id, real, secret)` is a
**pure function of a stable id + a server secret**, hashed with SHA-256
into a deterministic distance (≤500m, sqrt-scaled for uniform area
distribution) and bearing. Same provider id → same offset, every time,
forever (until the secret rotates) — "stable between restarts" without
storing any randomness. The seed step computes this once per provider and
persists only `obfuscatedLat/obfuscatedLng`; `realLat/realLng` are never
selected into any API response shape (`providers.controller.ts` builds
response objects field-by-field rather than spreading the Prisma row, so
adding a field to the model can't accidentally leak it). Distance sorting
(`/providers?lat=&lng=`) runs `distanceMeters` against the **obfuscated**
points only.

## Repository pattern (backend)

Controllers stay thin (validate → call Prisma → shape response); the
`prisma` client itself is the repository boundary via `config/prisma.ts`.
Given the interview-scope backend, we didn't introduce an extra
interface-per-entity layer on top of Prisma — see Trade-offs.

## Design decisions & trade-offs

- **Manifests are static (bundled), not fetched/hot-loaded.** True dynamic
  code-push mini-apps would need a module federation / remote-bundle
  system (e.g. `react-native-federated-components` or a custom Metro
  server), which is a multi-week infra project on its own. We modeled the
  *contract* (manifest, permission gate, mount lifecycle, isolated
  boundary) faithfully; swapping in remote bundles later would only touch
  `kernel/registry` and `kernel/host`, not any mini-app or the bridge SDK.
- **One shared offline queue, not per-domain repository classes.** Sports
  and Care bookings are structurally identical from the queue's
  perspective (an idempotent POST with a client id); a full Repository
  Pattern class hierarchy would add indirection without adding behavior
  at this scope.
- **RBAC is a role hierarchy, not per-permission ACLs.** Matches the
  spec's four roles exactly; a real multi-tenant product would likely
  need resource-scoped permissions in addition to roles.
- **Refresh token rotation revokes the whole family on reuse detection**
  rather than just the single token, which is the conservative/safe
  choice for a booking platform handling payment-adjacent flows.
- **No push notifications / websockets.** `BOOKING_CREATED` is in-process
  only (bridge event bus) for this scope; a real "Care" notification while
  the app is backgrounded would need a push channel.

## Future improvements

- Real dynamic mini-app loading (remote JS bundles + versioned manifests
  fetched from `/mini-apps`, which the backend already serves).
- Per-resource RBAC (e.g. a HOST can only manage their own Care listings).
- WebSocket channel for live slot availability instead of optimistic +
  409 reconciliation.
- E2E tests (Detox) driving the crash button / offline queue / cross-app
  banner flows described in the README.
- Rotate `GEO_OBFUSCATION_SEED` on a schedule with a migration that
  re-derives `obfuscatedLat/Lng` for all providers.
