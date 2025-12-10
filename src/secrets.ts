export const OPENAI_API_KEY =
  process.env.EXPO_GO_OPENAI_API_KEY ??
  process.env.OPENAI_API_KEY ??
  "";

export const REVENUECAT_API_KEY =
  process.env.EXPO_PUBLIC_REVENUECAT_API_KEY ??
  process.env.EXPO_GO_REVENUECAT_API_KEY ??
  "";

export const EXPO_GO_REVENUECAT_API_KEY = REVENUECAT_API_KEY;

if (!REVENUECAT_API_KEY) {
  console.warn(
    "[RevenueCat] Missing EXPO_PUBLIC_REVENUECAT_API_KEY or EXPO_GO_REVENUECAT_API_KEY env var."
  );
}
