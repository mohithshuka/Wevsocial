import { Request, Response } from "express";
import { CareBooking, Provider } from "@prisma/client";
import { prisma } from "../config/prisma";
import { createCareBookingSchema } from "../utils/validation";
import { obfuscateCoordinates } from "../utils/geo";
import { env } from "../config/env";

const APPROXIMATE_LOCATION_MESSAGE =
  "Approximate booking location, about 500 m away.";

// Booking-card obfuscation deliberately uses a wider 500m-1km radius than
// the provider-list obfuscation (0-500m, see providers.controller.ts) — a
// bigger minimum guarantees a customer browsing an unconfirmed booking can
// never infer the provider is "basically right here". Keyed by booking id
// (not provider id), so it's stable per-booking without needing to touch
// Provider rows or run a migration/reseed.
const BOOKING_OBFUSCATION_RANGE = { minMeters: 450, maxMeters: 550 };

type CareBookingWithProvider = CareBooking & { provider: Provider };

/**
 * Location privacy for bookings.
 *
 * A booking's location is exact ONLY when both are true:
 *   1. The booking status is CONFIRMED.
 *   2. The caller is the booking's owner (enforced by every route below via
 *      a `userId` match — never by trusting the client).
 *
 * The real coordinates (`provider.realLat/realLng`) are read from the DB
 * here, but are only ever placed into the response when condition 1 holds.
 * Every other path only ever touches `provider.obfuscatedLat/obfuscatedLng`.
 * Response objects are built field-by-field (never `{ ...booking }` or
 * `{ ...provider }`) specifically so a future field added to either model
 * can't silently leak through this endpoint.
 */
function shapeCareBooking(booking: CareBookingWithProvider) {
  const location =
    booking.status === "CONFIRMED"
      ? {
          lat: booking.provider.realLat,
          lng: booking.provider.realLng,
          isExact: true as const,
          message: null,
        }
      : {
          ...obfuscateCoordinates(
            booking.id,
            { lat: booking.provider.realLat, lng: booking.provider.realLng },
            env.geoObfuscationSeed,
            BOOKING_OBFUSCATION_RANGE
          ),
          isExact: false as const,
          message: APPROXIMATE_LOCATION_MESSAGE,
        };

  return {
    id: booking.id,
    userId: booking.userId,
    providerId: booking.providerId,
    providerName: booking.provider.name,
    providerCategory: booking.provider.category,
    startTime: booking.startTime.toISOString(),
    durationMins: booking.durationMins,
    status: booking.status,
    clientRequestId: booking.clientRequestId,
    sourceBookingId: booking.sourceBookingId,
    createdAt: booking.createdAt.toISOString(),
    location,
  };
}

export async function createBooking(req: Request, res: Response): Promise<void> {
  const parsed = createCareBookingSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: parsed.error.message } });
    return;
  }
  const { providerId, startTime, durationMins, clientRequestId, sourceBookingId } = parsed.data;
  const userId = req.user!.id;

  const existingByClientId = await prisma.careBooking.findUnique({
    where: { clientRequestId },
    include: { provider: true },
  });
  if (existingByClientId) {
    res.status(200).json({ data: shapeCareBooking(existingByClientId) });
    return;
  }

  const provider = await prisma.provider.findUnique({ where: { id: providerId } });
  if (!provider) {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Provider not found" } });
    return;
  }

  const existingActiveBooking = await prisma.careBooking.findFirst({
    where: { userId, providerId, status: { in: ["PENDING", "CONFIRMED"] } },
    include: { provider: true },
    orderBy: { createdAt: "desc" },
  });
  if (existingActiveBooking) {
    res.status(200).json({ data: shapeCareBooking(existingActiveBooking) });
    return;
  }

  const conflict = await prisma.careBooking.findFirst({
    where: {
      providerId,
      startTime: new Date(startTime),
      status: { in: ["PENDING", "CONFIRMED"] },
    },
  });

  if (conflict) {
    res.status(409).json({
      error: { code: "SLOT_CONFLICT", message: "This provider is already booked at that time" },
    });
    return;
  }

  // Created PENDING, not CONFIRMED: this is what gates the exact location.
  // The customer must explicitly confirm (see confirmBooking) before the
  // provider's real coordinates are ever returned to them.
  const booking = await prisma.careBooking.create({
    data: {
      userId,
      providerId,
      startTime: new Date(startTime),
      durationMins,
      status: "PENDING",
      clientRequestId,
      sourceBookingId,
    },
    include: { provider: true },
  });

  res.status(201).json({ data: shapeCareBooking(booking) });
}

export async function listMyBookings(req: Request, res: Response): Promise<void> {
  const bookings = await prisma.careBooking.findMany({
    where: { userId: req.user!.id },
    orderBy: { startTime: "desc" },
    include: { provider: true },
  });
  res.status(200).json({ data: bookings.map(shapeCareBooking) });
}

/**
 * Single-booking fetch, used by the client to poll/refresh a booking's
 * location after confirming. Ownership-scoped: a booking that exists but
 * belongs to someone else responds 404 (not 403), so the endpoint doesn't
 * leak which booking ids exist to callers who don't own them.
 */
export async function getBooking(req: Request, res: Response): Promise<void> {
  const booking = await prisma.careBooking.findUnique({
    where: { id: req.params.id },
    include: { provider: true },
  });

  if (!booking || booking.userId !== req.user!.id) {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Booking not found" } });
    return;
  }

  res.status(200).json({ data: shapeCareBooking(booking) });
}

/**
 * The customer-confirmation step. Only the booking's owner may confirm it;
 * PENDING -> CONFIRMED is the only transition this endpoint performs, and
 * that transition is exactly what flips `shapeCareBooking`'s `isExact`
 * flag from false to true for this booking going forward.
 */
export async function confirmBooking(req: Request, res: Response): Promise<void> {
  const booking = await prisma.careBooking.findUnique({
    where: { id: req.params.id },
    include: { provider: true },
  });

  if (!booking || booking.userId !== req.user!.id) {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Booking not found" } });
    return;
  }

  if (booking.status === "CANCELLED" || booking.status === "CONFLICT_REJECTED") {
    res.status(409).json({
      error: {
        code: "INVALID_STATUS",
        message: `Cannot confirm a booking with status ${booking.status}`,
      },
    });
    return;
  }

  const updated =
    booking.status === "CONFIRMED"
      ? booking
      : await prisma.careBooking.update({
          where: { id: booking.id },
          data: { status: "CONFIRMED" },
          include: { provider: true },
        });

  res.status(200).json({ data: shapeCareBooking(updated) });
}
