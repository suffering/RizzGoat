import Constants from "expo-constants";

const extra =
  Constants.expoConfig?.extra ??
  Constants.manifest?.extra ??
  {};

export const REVENUECAT_API_KEY: string =
  (extra.EXPO_PUBLIC_REVENUECAT_API_KEY as string) ?? "";

export const OPENAI_API_KEY: string =
  (extra.OPENAI_API_KEY as string) ?? "";

if (!REVENUECAT_API_KEY) {
  console.warn("[RevenueCat] Missing EXPO_PUBLIC_REVENUECAT_API_KEY", {
    availableExtraKeys: Object.keys(extra),
  });
} else {
  console.log("[RevenueCat] API key loaded", {
    length: REVENUECAT_API_KEY.length,
  });
}
