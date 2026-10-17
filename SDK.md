# `wev` Bridge SDK Reference

Every mini-app receives a `wev` object — and ONLY this object — as its
interface to the rest of the platform. It's obtained via:

```ts
import { useWev } from "@kernel/host/BridgeContext";

function MyScreen() {
  const wev = useWev();
  // ...
}
```

`useWev()` throws if called outside a `MountMiniApp` boundary, which is
guaranteed for every route under `/app/<mini-app>/*` since each mini-app's
`_layout.tsx` wraps its routes in `<MountMiniApp appId="...">`.

Every method below first checks the calling mini-app's manifest
permissions (`mobile/kernel/registry/manifest.ts`) and throws
`PermissionDeniedError` if the permission wasn't declared — this happens
**before** any network call, storage access, or navigation occurs.

---

## `wev.auth.getUser()`

```ts
getUser(): UserDTO | null
```

Returns the currently authenticated user (or `null` if signed out), read
from the shared auth store. Requires the `auth.getUser` permission.

```ts
const user = wev.auth.getUser();
if (user?.role === "HOST") { /* ... */ }
```

---

## `wev.storage.get<T>(key)` / `wev.storage.set<T>(key, value)`

```ts
get<T>(key: string): Promise<T | null>
set<T>(key: string, value: T): Promise<void>
```

Namespace-isolated key-value storage. Requires `storage.<appId>` (e.g.
Sports needs `storage.sports`; it CANNOT be granted `storage.care`, and
even if it were, keys are hard-namespaced by `appId` at the
`KernelStorage` layer, so there is no key Sports could construct that
resolves into Care's namespace).

```ts
await wev.storage.set("last-search", { query: "football" });
const last = await wev.storage.get<{ query: string }>("last-search");
```

---

## `wev.nav.navigate(route, params?)`

```ts
navigate(route: RootRoute, params?: Record<string, string>): void
```

Pushes a new screen via Expo Router. Requires `nav.navigate`.

```ts
wev.nav.navigate("/care/book", {
  prefillStartTime: "2026-08-10T18:00:00.000Z",
  prefillDurationMins: "120",
});
```

---

## `wev.bridge.emit(event, payload)`

```ts
emit<K extends BridgeEventName>(event: K, payload: BridgeEventMap[K]): void
```

Publishes a fully-typed event on the kernel event bus. This is the ONLY
way one mini-app's action can be observed by another — there is no direct
import path between mini-app packages. Requires `bridge.emit`.

```ts
wev.bridge.emit("BOOKING_CREATED", {
  source: "sports",
  bookingId: booking.id,
  activityId: activity.id,
  activityTitle: activity.title,
  startTime: selectedStart,
  durationMins: 120,
});
```

---

## `wev.bridge.on(event, listener)`

```ts
on<K extends BridgeEventName>(
  event: K,
  listener: (payload: BridgeEventMap[K]) => void
): () => void
```

Subscribes to an event; returns an unsubscribe function. Requires
`bridge.on`. Always unsubscribe in a `useEffect` cleanup.

```ts
useEffect(() => {
  const unsubscribe = wev.bridge.on("BOOKING_CREATED", (payload) => {
    setSuggestion(payload);
  });
  return unsubscribe;
}, []);
```

---

## `wev.permissions.request(permission)`

```ts
request(permission: PermissionKey): Promise<boolean>
```

In this static-manifest model, permissions are granted at registration
time (see each mini-app's `manifest.ts`), so this resolves `true` only if
the permission is already declared in the manifest — it's provided for API
completeness / future dynamic-consent flows.

```ts
const granted = await wev.permissions.request("storage.sports");
```

---

## Declaring events

All cross-app event shapes live in **one file**,
`mobile/types/bridge.ts` (`BridgeEventMap`). To add a new event:

1. Add a new key + payload shape to `BridgeEventMap`.
2. Emit it from the source mini-app via `wev.bridge.emit`.
3. Listen for it in the destination mini-app via `wev.bridge.on`.

No mini-app ever imports another mini-app's folder — `BridgeEventMap` is
the single shared contract both sides compile against.

## Permission keys

| Key                | Meaning                                   |
|--------------------|--------------------------------------------|
| `auth.getUser`     | Read the current authenticated user        |
| `storage.sports`   | Namespaced storage, Sports only             |
| `storage.care`     | Namespaced storage, Care only               |
| `storage.events`   | Namespaced storage, Events only             |
| `bridge.emit`      | Publish events on the bridge                |
| `bridge.on`        | Subscribe to events on the bridge           |
| `nav.navigate`     | Push a new screen via the Host Shell router |
| `permissions.request` | Query/request a permission grant        |
