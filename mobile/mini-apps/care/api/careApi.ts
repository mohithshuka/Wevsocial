import { apiRequest } from "@shared/api/httpClient";
import { ProviderDTO, CareBookingDTO } from "@app-types/api";

export interface CreateCareBookingInput {
  providerId: string;
  startTime: string;
  durationMins: number;
  clientRequestId: string;
  sourceBookingId?: string;
}

export const careApi = {
  /** Distance sorting happens server-side against OBFUSCATED coordinates
   * only — the client never sees or requests real coordinates. */
  listProviders: (near?: { lat: number; lng: number }) => {
    const query = near ? `?lat=${near.lat}&lng=${near.lng}` : "";
    return apiRequest<ProviderDTO[]>(`/providers${query}`, { auth: false });
  },

  createBooking: (input: CreateCareBookingInput) =>
    apiRequest<CareBookingDTO>("/care/bookings", { method: "POST", body: input }),

  listMyBookings: () => apiRequest<CareBookingDTO[]>("/care/bookings"),

  getBooking: (id: string) => apiRequest<CareBookingDTO>(`/care/bookings/${id}`),

  /** Customer-confirmation step. Only the owning user may call this
   * (enforced server-side); this is what flips the booking's location from
   * approximate to exact in the API response going forward. */
  confirmBooking: (id: string) =>
    apiRequest<CareBookingDTO>(`/care/bookings/${id}/confirm`, { method: "PATCH" }),
};
