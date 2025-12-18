import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState, type AppStateStatus, Platform } from "react-native";
import createContextHook from "@nkzw/create-context-hook";
import {
  getPurchasesModuleSafely,
  getRevenueCatApiKey,
  isUserCancelledRevenueCatError,
  type PurchasesLike,
} from "@/services/revenuecat";

type RevenueCatOffering = {
  identifier?: string;
  availablePackages?: unknown[];
};

type RevenueCatOfferings = {
  current?: RevenueCatOffering | null;
  all?: Record<string, RevenueCatOffering>;
};

type RevenueCatCustomerInfo = {
  entitlements?: {
    active?: Record<string, unknown>;
  };
};

export type RevenueCatPurchaseResult =
  | { status: "success"; customerInfo?: RevenueCatCustomerInfo }
  | { status: "cancelled" }
  | { status: "error"; message: string };

export const [RevenueCatProvider, useRevenueCat] = createContextHook(() => {
  const purchasesRef = useRef<PurchasesLike | null>(null);
  const configuringRef = useRef<Promise<boolean> | null>(null);
  const configuredRef = useRef<boolean>(false);

  const [isConfigured, setIsConfigured] = useState<boolean>(false);
  const [offerings, setOfferings] = useState<RevenueCatOfferings | null>(null);
  const [customerInfo, setCustomerInfo] = useState<RevenueCatCustomerInfo | null>(null);

  const apiKey = useMemo(() => getRevenueCatApiKey(), []);

  const currentOffering: RevenueCatOffering | null = useMemo(() => {
    const current = offerings?.current ?? null;
    if (current) return current;
    const fallback = offerings?.all?.default;
    return fallback ?? null;
  }, [offerings]);

  const availablePackages: unknown[] = useMemo(() => {
    const pkgs = offerings?.current?.availablePackages;
    return Array.isArray(pkgs) ? pkgs : [];
  }, [offerings]);

  const isEntitledToPro = useMemo(() => {
    const active = customerInfo?.entitlements?.active;
    return Boolean(active && typeof active === "object" && (active as any)?.pro);
  }, [customerInfo]);

  const safeConfigureOnce = useCallback(async (): Promise<boolean> => {
    if (configuredRef.current) return true;
    if (configuringRef.current) return configuringRef.current;

    configuringRef.current = (async () => {
      const purchases = await getPurchasesModuleSafely();
      purchasesRef.current = purchases;

      if (!purchases || typeof purchases.configure !== "function") {
        console.log("[RevenueCat] Purchases module unavailable (likely web). Skipping configuration.");
        configuredRef.current = false;
        setIsConfigured(false);
        return false;
      }

      if (!apiKey) {
        console.log("[RevenueCat] Missing EXPO_PUBLIC_REVENUECAT_API_KEY. Skipping configuration.");
        configuredRef.current = false;
        setIsConfigured(false);
        return false;
      }

      try {
        purchases.configure({ apiKey });
        configuredRef.current = true;
        setIsConfigured(true);
        return true;
      } catch (e) {
        console.log("[RevenueCat] configure() failed:", e);
        configuredRef.current = false;
        setIsConfigured(false);
        return false;
      } finally {
        configuringRef.current = null;
      }
    })();

    return configuringRef.current;
  }, [apiKey]);

  const refreshOfferings = useCallback(async (): Promise<RevenueCatOfferings | null> => {
    const purchases = purchasesRef.current;
    if (!purchases || typeof purchases.getOfferings !== "function") return null;

    try {
      const o = (await purchases.getOfferings()) as RevenueCatOfferings;
      setOfferings(o ?? null);
      return o ?? null;
    } catch (e) {
      console.log("[RevenueCat] getOfferings() failed:", e);
      return null;
    }
  }, []);

  const refreshCustomerInfo = useCallback(async (): Promise<RevenueCatCustomerInfo | null> => {
    const purchases = purchasesRef.current;
    if (!purchases || typeof purchases.getCustomerInfo !== "function") return null;

    try {
      const info = (await purchases.getCustomerInfo()) as RevenueCatCustomerInfo;
      setCustomerInfo(info ?? null);
      return info ?? null;
    } catch (e) {
      console.log("[RevenueCat] getCustomerInfo() failed:", e);
      return null;
    }
  }, []);

  const bootstrap = useCallback(async () => {
    const ok = await safeConfigureOnce();
    if (!ok) return;

    await Promise.all([refreshOfferings(), refreshCustomerInfo()]);
  }, [refreshCustomerInfo, refreshOfferings, safeConfigureOnce]);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    let lastState: AppStateStatus = AppState.currentState;

    const sub = AppState.addEventListener("change", (nextState) => {
      const wasBackground = lastState === "background" || lastState === "inactive";
      const isActive = nextState === "active";

      lastState = nextState;

      if (wasBackground && isActive) {
        void (async () => {
          const ok = await safeConfigureOnce();
          if (!ok) return;
          await refreshCustomerInfo();
        })();
      }
    });

    return () => {
      sub.remove();
    };
  }, [refreshCustomerInfo, safeConfigureOnce]);

  const purchasePackage = useCallback(
    async (pkg: unknown): Promise<RevenueCatPurchaseResult> => {
      const ok = await safeConfigureOnce();
      if (!ok) return { status: "error", message: "Purchases not available." };

      const purchases = purchasesRef.current;
      if (!purchases || typeof purchases.purchasePackage !== "function") {
        return { status: "error", message: "Purchases not available." };
      }

      try {
        const result = (await purchases.purchasePackage(pkg)) as any;
        const info = (result?.customerInfo ?? result?.purchaserInfo ?? null) as RevenueCatCustomerInfo | null;
        if (info) setCustomerInfo(info);
        return { status: "success", customerInfo: info ?? undefined };
      } catch (e) {
        if (isUserCancelledRevenueCatError(e)) {
          return { status: "cancelled" };
        }

        const message =
          typeof (e as any)?.message === "string" && (e as any).message.length > 0
            ? (e as any).message
            : "Purchase failed.";

        console.log("[RevenueCat] purchasePackage() failed:", e);
        return { status: "error", message };
      }
    },
    [safeConfigureOnce]
  );

  const restorePurchases = useCallback(async (): Promise<RevenueCatCustomerInfo | null> => {
    const ok = await safeConfigureOnce();
    if (!ok) return null;

    const purchases = purchasesRef.current;
    if (!purchases || typeof purchases.restorePurchases !== "function") return null;

    try {
      const info = (await purchases.restorePurchases()) as RevenueCatCustomerInfo;
      setCustomerInfo(info ?? null);
      return info ?? null;
    } catch (e) {
      console.log("[RevenueCat] restorePurchases() failed:", e);
      return null;
    }
  }, [safeConfigureOnce]);

  const value = useMemo(
    () => ({
      isConfigured,
      offerings,
      currentOffering,
      availablePackages,
      customerInfo,
      isEntitledToPro,
      purchasePackage,
      restorePurchases,
      refreshOfferings,
      refreshCustomerInfo,
      platform: Platform.OS as string,
    }),
    [
      availablePackages,
      currentOffering,
      customerInfo,
      isConfigured,
      isEntitledToPro,
      offerings,
      purchasePackage,
      refreshCustomerInfo,
      refreshOfferings,
      restorePurchases,
    ]
  );

  return value;
});
