import Constants from "expo-constants";

type ExpoExtra = Record<string, unknown>;

const extra: ExpoExtra =
  (Constants.expoConfig?.extra as ExpoExtra | undefined) ??
  ((Constants as unknown as { manifest?: { extra?: ExpoExtra } }).manifest?.extra ??
    {});

const envApiKey = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY;

export const REVENUECAT_API_KEY: string =
  (envApiKey as string | undefined) ??
  (extra.EXPO_PUBLIC_REVENUECAT_API_KEY as string | undefined) ??
  (extra.expo_go_revenuecat_api_key as string | undefined) ??
  "";

export const OPENAI_API_KEY: string =
  (process.env.OPENAI_API_KEY as string | undefined) ??
  (extra.OPENAI_API_KEY as string | undefined) ??
  "";

if (!REVENUECAT_API_KEY) {
  console.warn("[RevenueCat] Missing API key", {
    hasEnvKey: Boolean(envApiKey),
    availableExtraKeys: Object.keys(extra),
  });
}
