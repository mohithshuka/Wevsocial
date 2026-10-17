import { create } from "zustand";
import { BookingState } from "@shared/offline/offlineQueue";

export interface OptimisticSportsBooking {
  clientRequestId: string;
  activityId: string;
  activityTitle: string;
  startTime: string;
  durationMins: number;
  state: BookingState;
}

interface SportsState {
  optimisticBookings: Record<string, OptimisticSportsBooking>;
  upsert: (booking: OptimisticSportsBooking) => void;
  setState: (clientRequestId: string, state: BookingState) => void;
  remove: (clientRequestId: string) => void;
}

export const useSportsStore = create<SportsState>((set) => ({
  optimisticBookings: {},

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

  remove: (clientRequestId) =>
    set((s) => {
      const next = { ...s.optimisticBookings };
      delete next[clientRequestId];
      return { optimisticBookings: next };
    }),
}));
