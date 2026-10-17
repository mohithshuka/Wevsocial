import { create } from "zustand";
import { BookingState } from "@shared/offline/offlineQueue";
import { BridgeEventMap } from "@app-types/bridge";

export interface OptimisticCareBooking {
  clientRequestId: string;
  providerId: string;
  providerName: string;
  startTime: string;
  durationMins: number;
  state: BookingState;
}

interface CareState {
  /** The most recent BOOKING_CREATED suggestion received from Sports, used
   * to render the "Need childcare during this session?" banner. Cleared
   * once dismissed or acted upon. */
  incomingSuggestion: BridgeEventMap["BOOKING_CREATED"] | null;
  optimisticBookings: Record<string, OptimisticCareBooking>;
  setSuggestion: (event: BridgeEventMap["BOOKING_CREATED"] | null) => void;
  upsert: (booking: OptimisticCareBooking) => void;
  setState: (clientRequestId: string, state: BookingState) => void;
}

export const useCareStore = create<CareState>((set) => ({
  incomingSuggestion: null,
  optimisticBookings: {},

  setSuggestion: (event) => set({ incomingSuggestion: event }),

  upsert: (booking) =>
    set((s) => ({
      optimisticBookings: { ...s.optimisticBookings, [booking.clientRequestId]: booking },
    })),

  setState: (clientRequestId, state) =>
    set((s) => {
      const existing = s.optimisticBookings[clientRequestId];
      if (!existing) return s;
      return {
        optimisticBookings: {
          ...s.optimisticBookings,
          [clientRequestId]: { ...existing, state },
        },
      };
    }),
}));
