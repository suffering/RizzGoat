import Constants from "expo-constants";

const readExtra = (key: string): string | undefined => {
  const expoConfig = Constants.expoConfig as
    | { extra?: Record<string, unknown> | undefined }
    | undefined;
  const raw = expoConfig?.extra?.[key];
  return typeof raw === "string" ? raw : undefined;
};

export const OPENAI_API_KEY: string =
  process.env.EXPO_GO_OPENAI_API_KEY ??
  process.env.OPENAI_API_KEY ??
  readExtra("OPENAI_API_KEY") ??
  "";

export const REVENUECAT_API_KEY: string =
  process.env.EXPO_PUBLIC_REVENUECAT_API_KEY ??
  process.env.EXPO_GO_REVENUECAT_API_KEY ??
  readExtra("EXPO_PUBLIC_REVENUECAT_API_KEY") ??
  "";

export const EXPO_GO_REVENUECAT_API_KEY: string = REVENUECAT_API_KEY;

if (!REVENUECAT_API_KEY) {
  console.warn(
    "[RevenueCat] Missing EXPO_PUBLIC_REVENUECAT_API_KEY (preferred) or EXPO_GO_REVENUECAT_API_KEY env var."
  );
} else {
  console.log("[RevenueCat] API key loaded:", {
    source:
      process.env.EXPO_PUBLIC_REVENUECAT_API_KEY
        ? "process.env.EXPO_PUBLIC_REVENUECAT_API_KEY"
        : process.env.EXPO_GO_REVENUECAT_API_KEY
          ? "process.env.EXPO_GO_REVENUECAT_API_KEY"
          : readExtra("EXPO_PUBLIC_REVENUECAT_API_KEY")
            ? "Constants.expoConfig.extra.EXPO_PUBLIC_REVENUECAT_API_KEY"
            : "unknown",
    length: REVENUECAT_API_KEY.length,
    prefix: REVENUECAT_API_KEY.slice(0, 6),
  });
}
