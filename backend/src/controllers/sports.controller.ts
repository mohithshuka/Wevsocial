import { Request, Response } from "express";
import { prisma } from "../config/prisma";
import { createSportsBookingSchema } from "../utils/validation";

export async function listActivities(_req: Request, res: Response): Promise<void> {
  const activities = await prisma.activity.findMany({ orderBy: { title: "asc" } });
  res.status(200).json({ data: activities });
}

/**
 * Idempotent booking creation. `clientRequestId` is unique per attempt so
 * that the mobile offline queue can safely retry a request that was queued
 * while offline without creating duplicate bookings on eventual sync.
 *
 * Simulates a conflict (HTTP 409) when the requested slot is already taken,
 * exercising the client's rollback-on-conflict state machine.
 */
export async function createBooking(req: Request, res: Response): Promise<void> {
  const parsed = createSportsBookingSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: parsed.error.message } });
    return;
  }
  const { activityId, startTime, durationMins, clientRequestId } = parsed.data;
  const userId = req.user!.id;

  const existingByClientId = await prisma.sportsBooking.findUnique({
    where: { clientRequestId },
  });
  if (existingByClientId) {
    res.status(200).json({ data: existingByClientId });
    return;
  }

  const activity = await prisma.activity.findUnique({ where: { id: activityId } });
  if (!activity) {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Activity not found" } });
    return;
  }

  const conflict = await prisma.sportsBooking.findFirst({
    where: {
      activityId,
      startTime: new Date(startTime),
      status: { in: ["PENDING", "CONFIRMED"] },
    },
  });

  if (conflict) {
    res.status(409).json({
      error: { code: "SLOT_CONFLICT", message: "This time slot was just booked by someone else" },
    });
    return;
  }

  const booking = await prisma.sportsBooking.create({
    data: {
      userId,
      activityId,
      startTime: new Date(startTime),
      durationMins,
      status: "CONFIRMED",
      clientRequestId,
    },
  });

  // Spec: a booking of EXACTLY 2 hours (120 mins) triggers BOOKING_CREATED
  // for cross-mini-app listeners (Care) via the bridge — this happens
  // client-side after a successful response, kernel-side, never via direct
  // import between mini-apps. The backend simply exposes the fact needed to
  // decide this (durationMins) in the response payload.
  res.status(201).json({ data: booking, isTwoHourBooking: durationMins === 120 });
}

export async function listMyBookings(req: Request, res: Response): Promise<void> {
  const bookings = await prisma.sportsBooking.findMany({
    where: { userId: req.user!.id },
    orderBy: { startTime: "desc" },
    include: { activity: true },
  });
  res.status(200).json({ data: bookings });
}
