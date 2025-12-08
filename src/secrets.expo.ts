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

const fromExtra = (key: string): string | undefined => readString(combinedExtra[key]);

const openAiEnv =
  typeof process !== "undefined" && typeof process.env !== "undefined"
    ? readString(process.env.OPENAI_API_KEY)
    : undefined;

const revenueCatEnv =
  typeof process !== "undefined" && typeof process.env !== "undefined"
    ? readString(process.env.EXPO_PUBLIC_REVENUECAT_API_KEY)
    : undefined;

export const OPENAI_API_KEY: string =
  fromExtra("OPENAI_API_KEY") ?? openAiEnv ?? "";

export const REVENUECAT_API_KEY: string =
  fromExtra("EXPO_PUBLIC_REVENUECAT_API_KEY") ?? revenueCatEnv ?? "";
