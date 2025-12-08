import Constants from "expo-constants";

type ExtraBag = Record<string, unknown>;

type ConstantsLike = {
  expoConfig?: { extra?: ExtraBag };
  manifest?: { extra?: ExtraBag } | null;
  manifest2?: { extra?: ExtraBag } | null;
};

const constantsLike = Constants as ConstantsLike;

const combinedExtra: ExtraBag = {
  ...(constantsLike.manifest2?.extra ?? {}),
  ...(constantsLike.manifest?.extra ?? {}),
  ...(constantsLike.expoConfig?.extra ?? {}),
};

const readString = (value: unknown): string | undefined =>
  typeof value === "string" && value.length > 0 ? value : undefined;

const fromExtra = (...keys: string[]): string | undefined => {
  for (const key of keys) {
    const value = readString(combinedExtra[key]);
    if (value) return value;
  }
  return undefined;
};

const readEnv = (...keys: string[]): string | undefined => {
  if (typeof process === "undefined" || typeof process.env === "undefined") {
    return undefined;
  }
  for (const key of keys) {
    const value = readString(process.env[key]);
    if (value) return value;
  }
  return undefined;
};

export const OPENAI_API_KEY: string =
  fromExtra("OPENAI_API_KEY") ?? readEnv("OPENAI_API_KEY") ?? "";

export const REVENUECAT_API_KEY: string =
  fromExtra("EXPO_PUBLIC_REVENUECAT_API_KEY", "REVENUECAT_API_KEY") ??
  readEnv("EXPO_PUBLIC_REVENUECAT_API_KEY", "REVENUECAT_API_KEY") ??
  "";
