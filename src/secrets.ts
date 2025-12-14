import Constants from "expo-constants";

type ExpoExtraSource =
  | "Constants.expoConfig.extra"
  | "Constants.expoGoConfig.extra"
  | "Constants.manifest.extra"
  | "Constants.manifest2.extra"
  | "unknown";

const readExtra = (
  key: string,
): { value?: string; source: ExpoExtraSource } => {
  const expoConfig = Constants.expoConfig as
    | { extra?: Record<string, unknown> | undefined }
    | undefined;

  const expoGoConfig = (Constants as unknown as { expoGoConfig?: unknown }).expoGoConfig as
    | { extra?: Record<string, unknown> | undefined }
    | undefined;

  const manifest = Constants.manifest as
    | { extra?: Record<string, unknown> | undefined }
    | undefined;

  const manifest2 = (Constants as unknown as { manifest2?: unknown }).manifest2 as
    | { extra?: Record<string, unknown> | undefined }
    | undefined;

  const candidates: { raw: unknown; source: ExpoExtraSource }[] = [
    { raw: expoConfig?.extra?.[key], source: "Constants.expoConfig.extra" },
    { raw: expoGoConfig?.extra?.[key], source: "Constants.expoGoConfig.extra" },
    { raw: manifest?.extra?.[key], source: "Constants.manifest.extra" },
    { raw: manifest2?.extra?.[key], source: "Constants.manifest2.extra" },
  ];

  for (const candidate of candidates) {
    if (typeof candidate.raw === "string" && candidate.raw.length > 0) {
      return { value: candidate.raw, source: candidate.source };
    }
  }

  return { value: undefined, source: "unknown" };
};

const openAIFromExtra = readExtra("OPENAI_API_KEY");
export const OPENAI_API_KEY: string =
  process.env.EXPO_GO_OPENAI_API_KEY ??
  process.env.OPENAI_API_KEY ??
  openAIFromExtra.value ??
  "";

const revenueCatFromExtra = readExtra("EXPO_PUBLIC_REVENUECAT_API_KEY");

const FALLBACK_REVENUECAT_API_KEY = "appl_AQJGtguOlHTEmVneRvmaeabXazD";

export const REVENUECAT_API_KEY: string =
  process.env.EXPO_PUBLIC_REVENUECAT_API_KEY ??
  process.env.EXPO_GO_REVENUECAT_API_KEY ??
  revenueCatFromExtra.value ??
  FALLBACK_REVENUECAT_API_KEY;

export const EXPO_GO_REVENUECAT_API_KEY: string = REVENUECAT_API_KEY;

if (!REVENUECAT_API_KEY) {
  console.warn("[RevenueCat] Missing API key.", {
    hasPublicEnv: Boolean(process.env.EXPO_PUBLIC_REVENUECAT_API_KEY),
    hasExpoGoEnv: Boolean(process.env.EXPO_GO_REVENUECAT_API_KEY),
    extraSource: revenueCatFromExtra.source,
    hasExtra: Boolean(revenueCatFromExtra.value),
  });
} else {
  console.log("[RevenueCat] API key detected.", {
    source: process.env.EXPO_PUBLIC_REVENUECAT_API_KEY
      ? "process.env.EXPO_PUBLIC_REVENUECAT_API_KEY"
      : process.env.EXPO_GO_REVENUECAT_API_KEY
        ? "process.env.EXPO_GO_REVENUECAT_API_KEY"
        : revenueCatFromExtra.value
          ? revenueCatFromExtra.source
          : "unknown",
    length: REVENUECAT_API_KEY.length,
  });
}
