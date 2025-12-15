import Constants from "expo-constants";

const extra = Constants.expoConfig?.extra ?? {};

export const REVENUECAT_API_KEY =
  (extra.EXPO_PUBLIC_REVENUECAT_API_KEY as string) ?? "";

export const OPENAI_API_KEY =
  (extra.OPENAI_API_KEY as string) ?? "";

if (!REVENUECAT_API_KEY) {
  throw new Error("RevenueCat API key missing from Expo config");
}
