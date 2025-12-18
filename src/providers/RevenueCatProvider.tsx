// src/providers/RevenueCatProvider.tsx
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState, type AppStateStatus, Platform } from "react-native";
import createContextHook from "@nkzw/create-context-hook";
import type { CustomerInfo, PurchasesPackage } from "react-native-purchases";

import { getRevenueCatApiKey } from "@/src/secrets";
import {
  configureRevenueCat,
  getPurchasesAsync,
  type PurchasesModule,
} from "@/src/services/revenuecatModule";

type Offerings = Awaited<ReturnType<PurchasesModule["getOfferings"]>>;
type Offering = Offerings extends { current: infer C } ? C : null;

type RevenueCatContextValue = {
  isConfigured: boolean;
  isLoading: boolean;
  errorMessage: string | null;
  offerings: Offerings | null;
  currentOffering: Offering | null;
  availablePackages: PurchasesPackage[];
  customerInfo: CustomerInfo | null;
  isEntitledToPro: boolean;
  purchasePlan: (pkg: PurchasesPackage) => Promise<{ success: boolean; cancelled?: boolean; error?: string }>;
  restorePurchases: () => Promise<{ success: boolean; error?: string }>;
  refresh: () => Promise<void>;
};

const sortPackages = (packages: PurchasesPackage[]): PurchasesPackage[] => {
  const priority: Record<string, number> = {
    "rizzgoat.weekly": 1,
    "rizzgoat.monthly": 2,
    "rizzgoat.lifetime": 3,
  };

  const copy = [...packages];
  copy.sort((a, b) => {
    const aId = a?.product?.identifier ?? "";
    const bId = b?.product?.identifier ?? "";
    const ap = priority[aId] ?? 99;
    const bp = priority[bId] ?? 99;
    if (ap !== bp) return ap - bp;
    return aId.localeCompare(bId);
  });
  return copy;
};

const isUserCancelledError = (e: unknown): boolean => {
  const anyErr = e as { userCancelled?: unknown; message?: unknown; code?: unknown } | null;
  if (!anyErr) return false;
  if (anyErr.userCancelled === true) return true;

  const msg = typeof anyErr.message === "string" ? anyErr.message.toLowerCase() : "";
  if (msg.includes("cancel") && msg.includes("user")) return true;

  const code = typeof anyErr.code === "string" ? anyErr.code : "";
  if (code.toLowerCase().includes("cancel")) return true;

  return false;
};

const getEntitledToPro = (customerInfo: CustomerInfo | null): boolean => {
  try {
    const active = customerInfo?.entitlements?.active;
    const pro = active?.["pro"];
    return Boolean(pro);
  } catch {
    return false;
  }
};

export const [RevenueCatProvider, useRevenueCat] = createContextHook<RevenueCatContextValue>(() => {
  const [isConfigured, setIsConfigured] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [offerings, setOfferings] = useState<Offerings | null>(null);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);

  const initStartedRef = useRef<boolean>(false);
  const configuringRef = useRef<boolean>(false);

  const currentOffering = useMemo<Offering>(() => {
    return (offerings?.current ?? null) as Offering;
  }, [offerings]);

  const availablePackages = useMemo<PurchasesPackage[]>(() => {
    const pkgs = currentOffering?.availablePackages;
    if (!pkgs || !Array.isArray(pkgs) || pkgs.length === 0) return [];
    return sortPackages(pkgs);
  }, [currentOffering]);

  const isEntitledToPro = useMemo<boolean>(() => getEntitledToPro(customerInfo), [customerInfo]);

  const refresh = useCallback(async () => {
    const Purchases = await getPurchasesAsync();
    if (!Purchases) {
      return;
    }

    if (!isConfigured) {
      return;
    }

    try {
      const [newOfferings, newCustomerInfo] = await Promise.all([
        Purchases.getOfferings(),
        Purchases.getCustomerInfo(),
      ]);

      setOfferings(newOfferings ?? null);
      setCustomerInfo(newCustomerInfo ?? null);
      setErrorMessage(null);
    } catch (e) {
      console.log("[RevenueCat] Refresh failed:", e);
    }
  }, [isConfigured]);

  const initialize = useCallback(async () => {
    if (Platform.OS === "web") {
      setIsConfigured(false);
      setErrorMessage("RevenueCat unavailable on web");
      return;
    }

    if (initStartedRef.current) {
      return;
    }
    initStartedRef.current = true;

    if (configuringRef.current) {
      return;
    }
    configuringRef.current = true;

    setIsLoading(true);
    try {
      const { apiKey } = getRevenueCatApiKey();

      const result = await configureRevenueCat({ apiKey });
      if (!result.configured) {
        setIsConfigured(false);
        setErrorMessage(result.reason ?? "RevenueCat not configured");
        return;
      }

      setIsConfigured(true);
      setErrorMessage(null);

      await refresh();
    } catch (e) {
      console.log("[RevenueCat] Initialize failed:", e);
      setIsConfigured(false);
      setErrorMessage("RevenueCat init failed");
    } finally {
      configuringRef.current = false;
      setIsLoading(false);
    }
  }, [refresh]);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  useEffect(() => {
    const handler = (next: AppStateStatus) => {
      if (next === "active") {
        void refresh();
      }
    };

    const sub = AppState.addEventListener("change", handler);
    return () => sub.remove();
  }, [refresh]);

  const purchasePlan = useCallback(async (pkg: PurchasesPackage) => {
    const Purchases = await getPurchasesAsync();
    if (!Purchases || !isConfigured) {
      return { success: false, error: "Purchases unavailable" };
    }

    try {
      const result = await Purchases.purchasePackage(pkg);
      const info = result?.customerInfo ?? null;
      setCustomerInfo(info);
      await refresh();
      return { success: true };
    } catch (e) {
      if (isUserCancelledError(e)) {
        return { success: false, cancelled: true };
      }
      console.log("[RevenueCat] Purchase failed:", e);
      return { success: false, error: "Purchase failed" };
    }
  }, [isConfigured, refresh]);

  const restorePurchases = useCallback(async () => {
    const Purchases = await getPurchasesAsync();
    if (!Purchases || !isConfigured) {
      return { success: false, error: "Purchases unavailable" };
    }

    try {
      const info = await Purchases.restorePurchases();
      setCustomerInfo(info ?? null);
      await refresh();
      return { success: true };
    } catch (e) {
      console.log("[RevenueCat] Restore failed:", e);
      return { success: false, error: "Restore failed" };
    }
  }, [isConfigured, refresh]);

  return {
    isConfigured,
    isLoading,
    errorMessage,
    offerings,
    currentOffering,
    availablePackages,
    customerInfo,
    isEntitledToPro,
    purchasePlan,
    restorePurchases,
    refresh,
  };
});

export function useProAccess() {
  const { customerInfo, isEntitledToPro } = useRevenueCat();

  const plan = useMemo<"rizzgoat.weekly" | "rizzgoat.monthly" | "rizzgoat.lifetime" | null>(() => {
    const active = customerInfo?.activeSubscriptions ?? [];
    if (active.includes("rizzgoat.lifetime")) return "rizzgoat.lifetime";
    if (active.includes("rizzgoat.monthly")) return "rizzgoat.monthly";
    if (active.includes("rizzgoat.weekly")) return "rizzgoat.weekly";
    return null;
  }, [customerInfo?.activeSubscriptions]);

  return { isEntitledToPro, plan };
}
