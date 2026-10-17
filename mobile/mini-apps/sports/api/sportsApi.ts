import { apiRequest } from "@shared/api/httpClient";
import { ActivityDTO, SportsBookingDTO } from "@app-types/api";

export interface CreateSportsBookingInput {
  activityId: string;
  startTime: string;
  durationMins: number;
  clientRequestId: string;
}

export const sportsApi = {
  listActivities: () => apiRequest<ActivityDTO[]>("/sports/activities", { auth: false }),

  createBooking: (input: CreateSportsBookingInput) =>
    apiRequest<SportsBookingDTO>("/sports/bookings", { method: "POST", body: input }),

  listMyBookings: () => apiRequest<SportsBookingDTO[]>("/sports/bookings"),
};
