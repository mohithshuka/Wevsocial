import { offlineQueue, syncQueue, QueuedBooking } from "@shared/offline/offlineQueue";
import { sportsApi, CreateSportsBookingInput } from "../api/sportsApi";
import { useSportsStore } from "../store/sportsStore";
import { ApiRequestError } from "@shared/api/httpClient";

export async function enqueueSportsBooking(input: CreateSportsBookingInput): Promise<void> {
  await offlineQueue.enqueue<CreateSportsBookingInput>({
    id: input.clientRequestId,
    kind: "sports",
    payload: input,
  });
}

/** Runs on reconnect and on app foreground. Rolls back the optimistic UI on
 * CONFLICT_REJECTED (HTTP 409), matching the required state machine. */
export async function syncSportsQueue(): Promise<void> {
  await syncQueue<CreateSportsBookingInput>(async (item: QueuedBooking<CreateSportsBookingInput>) => {
    try {
      await sportsApi.createBooking(item.payload);
      useSportsStore.getState().setState(item.id, "SUCCESS");
      return { ok: true };
    } catch (err) {
      if (err instanceof ApiRequestError && err.status === 409) {
        useSportsStore.getState().setState(item.id, "CONFLICT_REJECTED");
        return { ok: false, conflict: true };
      }
      return { ok: false, conflict: false };
    }
  });
}
