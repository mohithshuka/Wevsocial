import { apiRequest } from "@shared/api/httpClient";
import { EventDTO } from "@app-types/api";

export const eventsApi = {
  listEvents: () => apiRequest<EventDTO[]>("/events", { auth: false }),
};
