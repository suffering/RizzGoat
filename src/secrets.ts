import Constants from "expo-constants";

type ExpoExtra = Record<string, unknown>;

const extra: ExpoExtra =
(Constants.expoConfig?.extra as ExpoExtra | undefined) ??
((Constants as unknown as { manifest?: { extra?: ExpoExtra } })?.manifest?.extra ?? {});

const fromProcessEnv = (key: string): string | undefined => {
try {
  const value = (process.env as Record<string, string | undefined>)[key];
  return typeof value === "string" ? value : undefined;
} catch {
  return undefined;
}
};

const fromExtra = (key: string): string | undefined => {
const value = extra?.[key];
return typeof value === "string" ? value : undefined;
};

export const REVENUECAT_API_KEY: string =
fromProcessEnv("EXPO_PUBLIC_REVENUECAT_API_KEY") ?? fromExtra("EXPO_PUBLIC_REVENUECAT_API_KEY") ?? "";

export const OPENAI_API_KEY: string = fromProcessEnv("OPENAI_API_KEY") ?? fromExtra("OPENAI_API_KEY") ?? "";