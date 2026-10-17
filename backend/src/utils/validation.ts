import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export const createSportsBookingSchema = z.object({
  activityId: z.string().uuid(),
  startTime: z.string().datetime(),
  durationMins: z.number().int().positive(),
  clientRequestId: z.string().min(1),
});

export const createCareBookingSchema = z.object({
  providerId: z.string().uuid(),
  startTime: z.string().datetime(),
  durationMins: z.number().int().positive(),
  clientRequestId: z.string().min(1),
  sourceBookingId: z.string().optional(),
});
