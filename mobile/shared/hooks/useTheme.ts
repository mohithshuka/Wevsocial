import { useColorScheme } from "react-native";
import { getColorTokens, ColorTokens } from "../theme/tokens";

export function useTheme(): ColorTokens {
  const scheme = useColorScheme();
  return getColorTokens(scheme === "dark" ? "dark" : "light");
}
