# Secure location sharing for Care bookings

## Summary

A Care booking's location is now approximate (blurred, offset 500m-1km,
no marker) until the customer confirms it, and exact (sharp map, real
marker, Google Maps actions) once confirmed — enforced on the backend,
not just hidden in the UI.

## Database changes

**None required.** `Provider` already stores `realLat`/`realLng` (never
exposed) alongside a pre-computed `obfuscatedLat`/`obfuscatedLng`, and
`CareBooking.status` already includes `PENDING` and `CONFIRMED`. No
migration needed.

## Backend changes

### `backend/src/controllers/care.controller.ts` (rewritten)

- **Fixed a live data leak**: `listMyBookings` previously did
  `include: { provider: true }` and returned the raw Prisma row, which
  contains `realLat`/`realLng` — every booking, confirmed or not, was
  leaking the provider's exact coordinates straight into the JSON
  response. All booking endpoints now go through `shapeCareBooking()`,
  which builds the response field-by-field (never spreads a Prisma row),
  so a future field added to either model can't silently leak again.
- `shapeCareBooking()` includes the real coordinates **only if**
  `booking.status === "CONFIRMED"`. Otherwise it returns a deterministic
  500m-1km obfuscated point (via `obfuscateCoordinates`, keyed by booking
  id) plus the required message.
- `createBooking` now creates bookings as `PENDING` instead of
  auto-`CONFIRMED` — this is the two-phase flow the spec asks for
  (**behavior change**, called out below).
- New `PATCH /care/bookings/:id/confirm` — the only way a booking moves
  PENDING → CONFIRMED. Checks `booking.userId === req.user.id`; a booking
  that exists but belongs to someone else, or doesn't exist, responds
  `404` either way (not `403`), so the endpoint can't be used to probe
  which booking ids exist for other users.
- New `GET /care/bookings/:id` — same ownership check, used by the client
  to refetch a single booking.

### `backend/src/utils/geo.ts`

`obfuscateCoordinates` gained an optional 4th `{ minMeters, maxMeters }`
argument. Existing callers (provider list, unchanged default 0-500m) are
untouched; the new booking-confirmation flow passes `{500, 1000}` to match
the spec's requested range exactly, without touching `Provider` rows or
needing a reseed.

### Routes (`backend/src/routes/care.routes.ts`)

```
POST  /care/bookings              (unchanged path, now creates PENDING)
GET   /care/bookings               (now returns shaped, privacy-safe data)
GET   /care/bookings/:id           (new)
PATCH /care/bookings/:id/confirm   (new)
```

All four require `requireAuth` + `requireRole("USER")`, same as before.

## Frontend changes

### New reusable component: `mobile/shared/components/MapPreview.tsx`

Takes a `CareLocationDTO` and renders the map preview described in the
spec:

- `isExact: false` → blurred map (`expo-blur`'s `BlurView`), no marker,
  the `"Exact location will be available after booking confirmation."`
  message.
- `isExact: true` → sharp map, centered marker pin, and three actions:
  **Open in Maps**, **Directions**, **Navigate** (see below).
- Cross-fades between the two states with a Reanimated `FadeIn` (matches
  the app's existing `FadeInDown` convention) — no page refresh, just a
  prop change causing a re-render.
- Shows a skeleton (reusing `SkeletonBlock`) while `loading` is true.

The component never receives real coordinates unless `isExact` is true —
there is nothing to accidentally render into hidden DOM/state before
confirmation, because the backend never sent it.

### New utility: `mobile/shared/utils/staticMap.ts`

- `buildStaticMapUrl()` — builds a static map image URL. Uses the Google
  Static Maps API if `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` is set, otherwise
  falls back to a free, no-key OpenStreetMap static image service so the
  feature works with zero setup.
- `googleMapsViewUrl()`, `googleMapsDirectionsUrl()`,
  `googleMapsNavigationUrl()` — universal `https://www.google.com/maps/...`
  deep links (open the Google Maps app if installed, else the browser).
  No native map SDK, no extra `app.json` config, works in plain Expo Go.

### New screen: `mobile/mini-apps/care/screens/CareBookingsListScreen.tsx`

The "Booking List → Booking Card" the spec describes — was missing
entirely before (Care only had a provider list and a booking *form*, no
bookings list). Each card:

- Shows provider, time, status badge, and the `MapPreview`.
- If `PENDING`, shows a **Confirm booking** button wired to a React Query
  `useMutation` calling `PATCH /care/bookings/:id/confirm`.
- On success, the returned (now-exact) booking is written straight into
  the React Query cache for just that item (`setQueryData`) — no
  refetch, no page reload, no other cards re-render.

Routed at `/care/bookings` (new `app/care/bookings.tsx`), linked from a
"My bookings" header button on the provider list, and booking creation
now routes there instead of `router.back()` so the customer immediately
sees the card they need to confirm.

### Types (`mobile/types/api.ts`)

Added `CareLocationDTO { lat, lng, isExact, message }` and extended
`CareBookingDTO` with `providerName`, `providerCategory`, `location`.

### New dependency

`expo-blur` (`~15.0.8`, matches Expo SDK 54's bundled version) — added to
`mobile/package.json`. Run `npm install` in `mobile/` before starting the
app.

> Note: on Android before SDK 55, `expo-blur`'s `BlurView` falls back to a
> semi-transparent overlay rather than a true blur (an Expo/Android
> platform limitation, not something this code can work around at SDK 54)
> — it still fully obscures the map either way.

### Environment variables

`mobile/.env` / `.env.example` gained one **optional** variable:

```
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=
```

Leave it blank for the free OpenStreetMap fallback, or set a Google Maps
Static API key for production-quality tiles. No backend env var changes
were needed.

## Behavior change to be aware of

Care bookings now start as `PENDING` instead of being auto-`CONFIRMED` at
creation — this is required for the "before confirmation vs. after
confirmation" flow the spec asks for. The offline queue and `409`
slot-conflict logic (`backend/src/controllers/care.controller.ts`,
`mobile/mini-apps/care/offline/syncCare.ts`) already treated `PENDING` as
a conflict-blocking status, so no other code needed to change for this.

## End-to-end flow

1. Customer books a provider → booking created `PENDING`.
2. Redirected to **My bookings** → sees a blurred map + confirm button.
3. Taps **Confirm booking** → `PATCH .../confirm` → cache updates in
   place → `MapPreview` cross-fades to the sharp map + real marker +
   Open in Maps / Directions / Navigate.
4. No other booking, no other screen, and no page reload is affected.
