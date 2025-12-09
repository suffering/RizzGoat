export const OPENAI_API_KEY: string = process.env.OPENAI_API_KEY ?? "";
export const REVENUECAT_API_KEY: string =
  process.env.EXPO_PUBLIC_REVENUECAT_API_KEY ?? "";
export const EXPO_GO_REVENUECAT_API_KEY: string = REVENUECAT_API_KEY;

if (!REVENUECAT_API_KEY) {
  console.warn(
    "[RevenueCat] Missing EXPO_PUBLIC_REVENUECAT_API_KEY env var. Add it to your Expo env so Purchases.configure can run.",
  );
}
