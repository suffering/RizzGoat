import Constants from "expo-constants";
import { Platform } from "react-native";

type ExpoExtra = Record<string, unknown>;

function readExtra(): ExpoExtra {
  const expoConfigExtra = (Constants?.expoConfig as { extra?: ExpoExtra } | undefined)?.extra;
  const manifestExtra = (Constants as any)?.manifest?.extra as ExpoExtra | undefined;
  return (expoConfigExtra ?? manifestExtra ?? {}) as ExpoExtra;
}

export function getRevenueCatApiKey(): string | undefined {
  const extra = readExtra();
  const fromExtra = extra?.EXPO_PUBLIC_REVENUECAT_API_KEY;
  const fromEnv = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY;

  const key = (typeof fromEnv === "string" && fromEnv.length > 0
    ? fromEnv
    : typeof fromExtra === "string" && fromExtra.length > 0
      ? fromExtra
      : undefined) as string | undefined;

  return key;
}

export type PurchasesLike = {
  configure?: (args: { apiKey: string }) => void;
  getOfferings?: () => Promise<unknown>;
  getCustomerInfo?: () => Promise<unknown>;
  purchasePackage?: (pkg: unknown) => Promise<unknown>;
  restorePurchases?: () => Promise<unknown>;
};

export async function getPurchasesModuleSafely(): Promise<PurchasesLike | null> {
  if (Platform.OS === "web") {
    return null;
  }

  try {
    const mod = (await import("react-native-purchases")) as any;
    const purchases = (mod?.default ?? mod) as PurchasesLike;
    if (!purchases) return null;
    return purchases;
  } catch {
    return null;
  }
}

export function isUserCancelledRevenueCatError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const anyErr = err as any;

  if (anyErr?.userCancelled === true) return true;

  const code = anyErr?.code ?? anyErr?.errorCode;
  if (typeof code === "string") {
    const c = code.toLowerCase();
    if (c.includes("cancel")) return true;
    if (c.includes("purchase_cancel")) return true;
  }

  if (typeof code === "number") {
    if (code === 1) return true;
  }

  const message = anyErr?.message;
  if (typeof message === "string" && message.toLowerCase().includes("cancel")) return true;

  return false;
}
