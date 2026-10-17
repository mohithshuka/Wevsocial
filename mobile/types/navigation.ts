export type RootRoute =
  | "/"
  | "/login"
  | "/register"
  | "/sports"
  | "/sports/book"
  | "/care"
  | "/care/book"
  | "/care/bookings"
  | "/events";

export interface CareBookParams {
  providerId?: string;
  prefillStartTime?: string;
  prefillDurationMins?: string;
}

export interface NavigatePayload {
  route: RootRoute;
  params?: Record<string, string>;
}
