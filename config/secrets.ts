// This file reads sensitive configuration from environment variables
// Do not hardcode secrets here
import Constants from "expo-constants";

type ExtraConfig = Record<string, string | undefined>;

const extraConfig: ExtraConfig = ((Constants?.expoConfig as any)?.extra ?? (Constants as any)?.manifest?.extra ?? {}) as ExtraConfig;

const DEFAULT_REVENUECAT_API_KEY = "test_rtpJYQRunpmnybPXjhHVzzuWZwy" as const;

export const OPENAI_API_KEY: string = process.env.OPENAI_API_KEY ?? extraConfig.OPENAI_API_KEY ?? "";
export const REVENUECAT_API_KEY: string =
  process.env.EXPO_PUBLIC_REVENUECAT_API_KEY ?? extraConfig.EXPO_PUBLIC_REVENUECAT_API_KEY ?? DEFAULT_REVENUECAT_API_KEY;
