// src/secrets.ts
import Constants from "expo-constants";

export type RevenueCatApiKeyResult = {
  apiKey: string | null;
};

function readFromProcessEnv(): string | null {
  try {
    const value = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY;
    return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
  } catch {
    return null;
  }
}

function readFromExpoConfigExtra(): string | null {
  try {
    const extra = Constants.expoConfig?.extra as Record<string, unknown> | undefined;
    const value = extra?.EXPO_PUBLIC_REVENUECAT_API_KEY;
    return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
  } catch {
    return null;
  }
}

export function getRevenueCatApiKey(): RevenueCatApiKeyResult {
  const fromEnv = readFromProcessEnv();
  if (fromEnv) return { apiKey: fromEnv };

  const fromExtra = readFromExpoConfigExtra();
  if (fromExtra) return { apiKey: fromExtra };

  return { apiKey: null };
}
