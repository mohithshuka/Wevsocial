import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import { UserDTO } from "@app-types/api";

const ACCESS_TOKEN_KEY = "wev_access_token";
const REFRESH_TOKEN_KEY = "wev_refresh_token";
const USER_KEY = "wev_user";

interface AuthState {
  user: UserDTO | null;
  accessToken: string | null;
  refreshToken: string | null;
  isHydrated: boolean;
  hydrate: () => Promise<void>;
  setSession: (user: UserDTO, accessToken: string, refreshToken: string) => Promise<void>;
  setAccessToken: (accessToken: string) => Promise<void>;
  setTokens: (accessToken: string, refreshToken: string) => Promise<void>;
  clearSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isHydrated: false,

  hydrate: async () => {
    const [accessToken, refreshToken, userRaw] = await Promise.all([
      SecureStore.getItemAsync(ACCESS_TOKEN_KEY),
      SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
      SecureStore.getItemAsync(USER_KEY),
    ]);
    set({
      accessToken,
      refreshToken,
      user: userRaw ? (JSON.parse(userRaw) as UserDTO) : null,
      isHydrated: true,
    });
  },

  setSession: async (user, accessToken, refreshToken) => {
    await Promise.all([
      SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken),
      SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken),
      SecureStore.setItemAsync(USER_KEY, JSON.stringify(user)),
    ]);
    set({ user, accessToken, refreshToken });
  },

  setAccessToken: async (accessToken) => {
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
    set({ accessToken });
  },

  setTokens: async (accessToken, refreshToken) => {
    await Promise.all([
      SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken),
      SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken),
    ]);
    set({ accessToken, refreshToken });
  },

  clearSession: async () => {
    await Promise.all([
      SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
      SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
      SecureStore.deleteItemAsync(USER_KEY),
    ]);
    set({ user: null, accessToken: null, refreshToken: null });
  },
}));

/** Non-hook accessor for use inside the kernel bridge / http client, where
 * React hooks aren't available (plain TS modules, interceptors, etc). */
export function getAuthSnapshot(): {
  user: UserDTO | null;
  accessToken: string | null;
  refreshToken: string | null;
} {
  const { user, accessToken, refreshToken } = useAuthStore.getState();
  return { user, accessToken, refreshToken };
}
