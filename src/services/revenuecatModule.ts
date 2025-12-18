// src/services/revenuecatModule.ts
import { Platform } from "react-native";
import type PurchasesType from "react-native-purchases";

export type PurchasesModule = typeof PurchasesType;

let cachedModule: PurchasesModule | null | undefined;
let cachedModulePromise: Promise<PurchasesModule | null> | null = null;
let isConfiguring = false;
let isConfigured = false;
let lastConfiguredApiKey: string | null = null;
let lastConfiguredAppUserId: string | null = null;

export async function getPurchasesAsync(): Promise<PurchasesModule | null> {
  if (cachedModule !== undefined) return cachedModule;

  if (Platform.OS === "web") {
    cachedModule = null;
    return cachedModule;
  }

  if (cachedModulePromise) return cachedModulePromise;

  cachedModulePromise = (async () => {
    try {
      const mod = (await import("react-native-purchases")) as unknown as PurchasesModule;
      cachedModule = mod;
      return mod;
    } catch (e) {
      console.log("[RevenueCat] Native module not available:", e);
      cachedModule = null;
      return null;
    } finally {
      cachedModulePromise = null;
    }
  })();

  return cachedModulePromise;
}

export async function getPurchases(): Promise<PurchasesModule | null> {
  return getPurchasesAsync();
}

export async function configureRevenueCat(params: {
  apiKey: string | null;
  appUserId?: string | null;
}): Promise<{ configured: boolean; reason?: string }> {
  const { apiKey, appUserId } = params;

  const Purchases = await getPurchasesAsync();
  if (!Purchases) {
    return { configured: false, reason: "Purchases module unavailable" };
  }

  if (!apiKey || apiKey.trim().length === 0) {
    return { configured: false, reason: "Missing RevenueCat API key" };
  }

  if (!apiKey.startsWith("appl_")) {
    return { configured: false, reason: "Invalid RevenueCat iOS SDK key" };
  }

  if (
    isConfigured &&
    lastConfiguredApiKey === apiKey &&
    (lastConfiguredAppUserId ?? null) === (appUserId ?? null)
  ) {
    return { configured: true };
  }

  if (isConfiguring) {
    return { configured: isConfigured, reason: "Configure already in progress" };
  }

  isConfiguring = true;
  try {
    Purchases.setLogLevel(Purchases.LOG_LEVEL.WARN);

    const config: { apiKey: string; appUserID?: string } = {
      apiKey,
      ...(typeof appUserId === "string" && appUserId.length > 0 ? { appUserID: appUserId } : {}),
    };

    await Purchases.configure(config);

    isConfigured = true;
    lastConfiguredApiKey = apiKey;
    lastConfiguredAppUserId = appUserId ?? null;

    return { configured: true };
  } catch (e) {
    console.log("[RevenueCat] Error configuring Purchases:", e);
    isConfigured = false;
    return { configured: false, reason: "Configure failed" };
  } finally {
    isConfiguring = false;
  }
}
