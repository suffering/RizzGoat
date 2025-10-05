import { useMemo } from "react";
import createContextHook from "@nkzw/create-context-hook";

interface Theme {
  primary: string;
  secondary: string;
  background: string;
  card: string;
  text: string;
  textSecondary: string;
  border: string;
  success: string;
  error: string;
}

const darkTheme: Theme = {
  primary: "#E3222B",
  secondary: "#FF7A59",
  background: "#000000",
  card: "#1A1A1A",
  text: "#FFFFFF",
  textSecondary: "#A0A0A0",
  border: "#2A2A2A",
  success: "#22C55E",
  error: "#EF4444",
};

export const [ThemeProvider, useTheme] = createContextHook(() => {
  const theme = useMemo(() => darkTheme, []);
  const isDark = true;

  return useMemo(() => ({ theme, isDark }), [theme, isDark]);
});