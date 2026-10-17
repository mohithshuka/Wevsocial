import { offlineQueue, syncQueue, QueuedBooking } from "@shared/offline/offlineQueue";
import { careApi, CreateCareBookingInput } from "../api/careApi";
import { useCareStore } from "../store/careStore";
import { ApiRequestError } from "@shared/api/httpClient";

export async function enqueueCareBooking(input: CreateCareBookingInput): Promise<void> {
  await offlineQueue.enqueue<CreateCareBookingInput>({
    id: input.clientRequestId,
    kind: "care",
    payload: input,
  });
}

export async function syncCareQueue(): Promise<void> {
  await syncQueue<CreateCareBookingInput>(async (item: QueuedBooking<CreateCareBookingInput>) => {
    try {
      await careApi.createBooking(item.payload);
      useCareStore.getState().setState(item.id, "SUCCESS");
      return { ok: true };
    } catch (err) {
      if (err instanceof ApiRequestError && err.status === 409) {
        useCareStore.getState().setState(item.id, "CONFLICT_REJECTED");
        return { ok: false, conflict: true };
      }
      return { ok: false, conflict: false };
    }
  });
}
