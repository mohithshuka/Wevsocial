import AsyncStorage from "@react-native-async-storage/async-storage";

export type BookingState =
  | "IDLE"
  | "QUEUED"
  | "SYNCING"
  | "SUCCESS"
  | "CONFLICT_REJECTED";

export interface QueuedBooking<TPayload> {
  id: string; // == clientRequestId, used for idempotency + FIFO ordering
  kind: "sports" | "care";
  payload: TPayload;
  state: BookingState;
  createdAt: number;
}

const QUEUE_KEY = "wev_offline_booking_queue";

async function readQueue<T>(): Promise<QueuedBooking<T>[]> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  if (!raw) return [];
  return JSON.parse(raw) as QueuedBooking<T>[];
}

async function writeQueue<T>(queue: QueuedBooking<T>[]): Promise<void> {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

/**
 * Offline-first booking queue shared by Sports and Care. Bookings created
 * while offline (or optimistically, before the server confirms) are
 * persisted locally and synced FIFO (oldest first) on reconnect. Each item
 * moves through IDLE -> QUEUED -> SYNCING -> (SUCCESS | CONFLICT_REJECTED).
 */
export const offlineQueue = {
  async enqueue<T>(item: Omit<QueuedBooking<T>, "state" | "createdAt">): Promise<void> {
    const queue = await readQueue<T>();
    queue.push({ ...item, state: "QUEUED", createdAt: Date.now() });
    await writeQueue(queue);
  },

  async list<T>(): Promise<QueuedBooking<T>[]> {
    const queue = await readQueue<T>();
    // FIFO: oldest first.
    return queue.sort((a, b) => a.createdAt - b.createdAt);
  },

  async updateState<T>(id: string, state: BookingState): Promise<void> {
    const queue = await readQueue<T>();
    const updated = queue.map((q) => (q.id === id ? { ...q, state } : q));
    await writeQueue(updated);
  },

  async remove<T>(id: string): Promise<void> {
    const queue = await readQueue<T>();
    await writeQueue(queue.filter((q) => q.id !== id));
  },

  async clear(): Promise<void> {
    await AsyncStorage.removeItem(QUEUE_KEY);
  },
};

export interface SyncExecutor<T> {
  (item: QueuedBooking<T>): Promise<{ ok: true } | { ok: false; conflict: boolean }>;
}

/**
 * Processes the FIFO queue in order. On success the item is removed. On a
 * simulated conflict (HTTP 409) the item is marked CONFLICT_REJECTED and
 * left in the queue for the UI layer to surface + let the caller roll back
 * its optimistic update; it is NOT retried automatically since the slot is
 * genuinely taken.
 */
export async function syncQueue<T>(executor: SyncExecutor<T>): Promise<void> {
  const items = await offlineQueue.list<T>();
  for (const item of items) {
    if (item.state === "SUCCESS" || item.state === "CONFLICT_REJECTED") continue;

    await offlineQueue.updateState<T>(item.id, "SYNCING");
    try {
      const result = await executor(item);
      if (result.ok) {
        await offlineQueue.updateState<T>(item.id, "SUCCESS");
        await offlineQueue.remove<T>(item.id);
      } else if (result.conflict) {
        await offlineQueue.updateState<T>(item.id, "CONFLICT_REJECTED");
      } else {
        // Non-conflict failure (e.g. still offline) — revert to QUEUED and
        // stop processing further items to preserve FIFO order.
        await offlineQueue.updateState<T>(item.id, "QUEUED");
        break;
      }
    } catch {
      await offlineQueue.updateState<T>(item.id, "QUEUED");
      break;
    }
  }
}
