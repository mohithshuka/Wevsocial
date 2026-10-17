export interface ColorTokens {
  background: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  primary: string;
  primaryText: string;
  success: string;
  danger: string;
  warning: string;
}

const light: ColorTokens = {
  background: "#F5F6F8",
  surface: "#FFFFFF",
  surfaceAlt: "#EEF0F3",
  border: "#DDE1E6",
  textPrimary: "#101418",
  textSecondary: "#5B6470",
  primary: "#2F6FED",
  primaryText: "#FFFFFF",
  success: "#1FA971",
  danger: "#E5484D",
  warning: "#F5A623",
};

const dark: ColorTokens = {
  background: "#0B0F14",
  surface: "#151B23",
  surfaceAlt: "#1D2530",
  border: "#2A3542",
  textPrimary: "#F2F5F8",
  textSecondary: "#93A0AE",
  primary: "#5B8DEF",
  primaryText: "#0B0F14",
  success: "#34C98A",
  danger: "#F26D70",
  warning: "#F7B955",
};

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };
export const radius = { sm: 6, md: 10, lg: 16, pill: 999 };
export const typography = {
  h1: { fontSize: 28, fontWeight: "700" as const },
  h2: { fontSize: 22, fontWeight: "700" as const },
  h3: { fontSize: 18, fontWeight: "600" as const },
  body: { fontSize: 15, fontWeight: "400" as const },
  caption: { fontSize: 13, fontWeight: "400" as const },
};

export function getColorTokens(scheme: "light" | "dark"): ColorTokens {
  return scheme === "dark" ? dark : light;
}
