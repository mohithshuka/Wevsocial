import Constants from "expo-constants";
import { useAuthStore } from "../stores/authStore";
import { ApiErrorShape, ApiSuccess, AuthResponse } from "@app-types/api";

const API_URL: string =
  (Constants.expoConfig?.extra?.apiUrl as string | undefined) ??
  process.env.EXPO_PUBLIC_API_URL ??
  "http://localhost:4000";

export class ApiRequestError extends Error {
  code: string;
  status: number;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

let refreshPromise: Promise<string | null> | null = null;

/** Ensures concurrent 401s trigger exactly ONE refresh call, not N. */
async function performSilentRefresh(): Promise<string | null> {
  const { refreshToken, setTokens, clearSession } = useAuthStore.getState();
  if (!refreshToken) return null;

  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const res = await fetch(`${API_URL}/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
        });
        if (!res.ok) {
          await clearSession();
          return null;
        }
        const json = (await res.json()) as ApiSuccess<{
          accessToken: string;
          refreshToken: string;
        }>;
        await setTokens(json.data.accessToken, json.data.refreshToken);
        return json.data.accessToken;
      } catch {
        return null;
      } finally {
        refreshPromise = null;
      }
    })();
  }

  return refreshPromise;
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  auth?: boolean;
  /** Internal flag to prevent infinite refresh loops. */
  _retried?: boolean;
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { method = "GET", body, auth = true, _retried = false } = options;
  const { accessToken } = useAuthStore.getState();

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (auth && accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && auth && !_retried) {
    const newToken = await performSilentRefresh();
    if (newToken) {
      return apiRequest<T>(path, { ...options, _retried: true });
    }
  }

  const json = (await res.json()) as ApiSuccess<T> | ApiErrorShape;

  if (!res.ok || "error" in json) {
    const errShape = json as ApiErrorShape;
    throw new ApiRequestError(
      res.status,
      errShape.error?.code ?? "UNKNOWN_ERROR",
      errShape.error?.message ?? "Request failed"
    );
  }

  return (json as ApiSuccess<T>).data;
}

export const authApi = {
  login: (email: string, password: string) =>
    apiRequest<AuthResponse>("/auth/login", {
      method: "POST",
      body: { email, password },
      auth: false,
    }),
  register: (email: string, password: string, name: string) =>
    apiRequest<AuthResponse>("/auth/register", {
      method: "POST",
      body: { email, password, name },
      auth: false,
    }),
  logout: (refreshToken: string) =>
    apiRequest<void>("/auth/logout", {
      method: "POST",
      body: { refreshToken },
      auth: false,
    }),
};

export { API_URL };
