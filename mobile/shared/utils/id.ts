/** Generates a sufficiently-unique client-side request id for idempotent
 * offline-queued bookings. Not cryptographically secure — doesn't need to be. */
export function generateClientRequestId(prefix: string): string {
  const random = Math.random().toString(36).slice(2, 10);
  const timestamp = Date.now().toString(36);
  return `${prefix}_${timestamp}_${random}`;
}
