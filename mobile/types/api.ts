export type Role = "GUEST" | "USER" | "HOST" | "ADMIN";

export interface UserDTO {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export interface AuthResponse {
  user: UserDTO;
  accessToken: string;
  refreshToken: string;
}

export interface ActivityDTO {
  id: string;
  title: string;
  description: string;
  location: string;
  startTimes: string[];
  durationMins: number;
}

export type BookingStatus =
  | "PENDING"
  | "CONFIRMED"
  | "CANCELLED"
  | "CONFLICT_REJECTED";

export interface SportsBookingDTO {
  id: string;
  userId: string;
  activityId: string;
  startTime: string;
  durationMins: number;
  status: BookingStatus;
  clientRequestId: string;
}

export interface ProviderDTO {
  id: string;
  name: string;
  category: string;
  bio: string;
  location: { lat: number; lng: number };
}

/**
 * `isExact: false` means `lat`/`lng` are an obfuscated approximation
 * (500m-1km off, see backend/src/controllers/care.controller.ts) — never
 * treat these coordinates as the provider's real position while `isExact`
 * is false. `message` is only populated in the approximate case.
 */
export interface CareLocationDTO {
  lat: number;
  lng: number;
  isExact: boolean;
  message: string | null;
}

export interface CareBookingDTO {
  id: string;
  userId: string;
  providerId: string;
  providerName: string;
  providerCategory: string;
  startTime: string;
  durationMins: number;
  status: BookingStatus;
  clientRequestId: string;
  sourceBookingId?: string | null;
  createdAt: string;
  location: CareLocationDTO;
}

export interface EventDTO {
  id: string;
  title: string;
  date: string;
}

export interface ApiErrorShape {
  error: { code: string; message: string };
}

export interface ApiSuccess<T> {
  data: T;
}
