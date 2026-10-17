/**
 * Every event that can travel across the bridge MUST be declared here.
 * Mini-apps import ONLY this file (never each other) to know what shapes
 * are available to emit/listen for. This is what makes bridge.emit/on fully
 * typed end-to-end instead of `emit(event: string, payload: any)`.
 */
export interface BridgeEventMap {
  BOOKING_CREATED: {
    source: "sports";
    bookingId: string;
    activityId: string;
    activityTitle: string;
    startTime: string;
    durationMins: number;
  };
  CARE_BOOKING_CREATED: {
    source: "care";
    bookingId: string;
    providerId: string;
    startTime: string;
    durationMins: number;
  };
  MINI_APP_CRASHED: {
    appId: string;
    message: string;
  };
}

export type BridgeEventName = keyof BridgeEventMap;
