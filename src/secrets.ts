export const OPENAI_API_KEY =
  process.env.OPENAI_API_KEY ?? "";

export const REVENUECAT_API_KEY =
  process.env.EXPO_PUBLIC_REVENUECAT_API_KEY ?? "";

if (!REVENUECAT_API_KEY) {
  console.warn(
    "[RevenueCat] Missing EXPO_PUBLIC_REVENUECAT_API_KEY env var. Add it to Render + Rork.",
  );
}
