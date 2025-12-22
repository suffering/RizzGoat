import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState, AppStateStatus, Platform } from "react-native";
import Purchases, {
  CustomerInfo,
  LOG_LEVEL,
  PurchasesOfferings,
  PurchasesOffering,
  PurchasesPackage,
  PurchasesError,
  PURCHASES_ERROR_CODE,
  PRORATION_MODE,
} from "react-native-purchases";
import createContextHook from "@nkzw/create-context-hook";

type RevenueCatState = {
  isConfigured: boolean;
  offerings: PurchasesOfferings | null;
  currentOffering: PurchasesOffering | null;
  availablePackages: PurchasesPackage[];
  customerInfo: CustomerInfo | null;
  isEntitledToPro: boolean;
  activeProProductId: string | null;
  isLoading: boolean;
  lastErrorMessage: string | null;
  refresh: () => Promise<void>;
  purchasePackage: (
    pkg: PurchasesPackage,
    options?: { upgradeFromProductId?: string | null }
  ) => Promise<{
    customerInfo: CustomerInfo | null;
    cancelled: boolean;
  }>;
  restorePurchases: () => Promise<{ customerInfo: CustomerInfo | null }>;
};

const REVENUECAT_IOS_API_KEY = "appl_AQJGtguOlHTEmVneRvmaeabXazD";

function getIsEntitledToPro(info: CustomerInfo | null): boolean {
  return info?.entitlements?.active?.pro != null;
}

function getActiveProProductId(info: CustomerInfo | null): string | null {
  const knownOrder: Record<string, number> = {
    "rizzgoat.weekly": 1,
    "rizzgoat.monthly": 2,
    "rizzgoat.lifetime": 3,
  };

  const entitlement = (info?.entitlements?.active as any)?.pro as
    | { productIdentifier?: string | null }
    | undefined;
  const fromEntitlement = entitlement?.productIdentifier ?? null;

  const activeSubs = (info as any)?.activeSubscriptions as string[] | undefined;
  const normalized = Array.isArray(activeSubs) ? activeSubs : [];

  if (fromEntitlement === "rizzgoat.lifetime" || normalized.includes("rizzgoat.lifetime")) {
    return "rizzgoat.lifetime";
  }

  const bestFromSubs = normalized
    .filter((p) => knownOrder[p] != null)
    .sort((a, b) => (knownOrder[b] ?? 0) - (knownOrder[a] ?? 0))[0];

  const candidates = [fromEntitlement, bestFromSubs].filter(
    (v): v is string => typeof v === "string" && v.length > 0
  );

  if (candidates.length === 0) return normalized[0] ?? null;

  const best = [...candidates].sort(
    (a, b) => (knownOrder[b] ?? 0) - (knownOrder[a] ?? 0)
  )[0];

  return best ?? null;
}

function isUserCancelled(e: unknown): boolean {
  const anyErr = e as Partial<PurchasesError> | null;
  const code = anyErr?.code;
  return (
    code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR ||
    code === PURCHASES_ERROR_CODE.PURCHASE_NOT_ALLOWED_ERROR
  );
}

export const [RevenueCatProvider, useRevenueCat] = createContextHook<RevenueCatState>(
  () => {
    const [isConfigured, setIsConfigured] = useState<boolean>(false);
    const [offerings, setOfferings] = useState<PurchasesOfferings | null>(null);
    const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [lastErrorMessage, setLastErrorMessage] = useState<string | null>(null);

    const configureOnceRef = useRef<boolean>(false);

    const refresh = useCallback(async () => {
      if (!isConfigured) return;

      setIsLoading(true);
      try {
        const [o, ci] = await Promise.all([
          Purchases.getOfferings(),
          Purchases.getCustomerInfo(),
        ]);
        setOfferings(o ?? null);
        setCustomerInfo(ci ?? null);
        setLastErrorMessage(null);
        console.log("[RevenueCat] refreshed", {
          hasCurrentOffering: o?.current != null,
          activeEntitlements: Object.keys(ci?.entitlements?.active ?? {}),
        });
      } catch (e) {
        console.log("[RevenueCat] refresh error", e);
        setLastErrorMessage("Unable to refresh purchases right now.");
      } finally {
        setIsLoading(false);
      }
    }, [isConfigured]);

    useEffect(() => {
      if (configureOnceRef.current) return;
      configureOnceRef.current = true;

      if (Platform.OS === "web") {
        console.log("[RevenueCat] web platform detected; skipping configure");
        setIsConfigured(false);
        return;
      }

      const apiKey = REVENUECAT_IOS_API_KEY.trim();
      if (!apiKey) {
        console.log("[RevenueCat] missing hardcoded api key; skipping configure");
        setIsConfigured(false);
        return;
      }
      console.log("[RevenueCat] using hardcoded api key");

      const hasNativeModule =
        typeof Purchases?.configure === "function" &&
        typeof Purchases?.getOfferings === "function";
      if (!hasNativeModule) {
        console.log("[RevenueCat] Purchases native module not available; skipping configure");
        setIsConfigured(false);
        return;
      }

      (async () => {
        setIsLoading(true);
        try {
          Purchases.setLogLevel(LOG_LEVEL.WARN);

          await Purchases.configure({
            apiKey,
            appUserID: undefined,
          });

          setIsConfigured(true);
          setLastErrorMessage(null);
          console.log("[RevenueCat] configured");

          const ci = await Purchases.getCustomerInfo();
          setCustomerInfo(ci ?? null);

          const o = await Purchases.getOfferings();
          setOfferings(o ?? null);
        } catch (e) {
          console.log("[RevenueCat] configure error", e);
          setIsConfigured(false);
          setLastErrorMessage(
            "Purchases are unavailable right now. Please try again later."
          );
        } finally {
          setIsLoading(false);
        }
      })();
    }, []);

    useEffect(() => {
      if (!isConfigured) return;

      const sub = AppState.addEventListener("change", (nextState: AppStateStatus) => {
        if (nextState === "active") {
          refresh();
        }
      });

      return () => {
        sub.remove();
      };
    }, [isConfigured, refresh]);

    useEffect(() => {
      if (!isConfigured) return;

      const listener = (info: CustomerInfo) => {
        setCustomerInfo(info ?? null);
        console.log("[RevenueCat] customer info updated", {
          isEntitledToPro: getIsEntitledToPro(info ?? null),
        });
      };

      Purchases.addCustomerInfoUpdateListener(listener);
      return () => {
        try {
          Purchases.removeCustomerInfoUpdateListener(listener);
        } catch {
          // ignore
        }
      };
    }, [isConfigured]);

    const currentOffering = offerings?.current ?? null;
    const availablePackages = useMemo<PurchasesPackage[]>(() => {
      return currentOffering?.availablePackages ?? [];
    }, [currentOffering?.availablePackages]);

    const isEntitledToPro = useMemo<boolean>(() => {
      return getIsEntitledToPro(customerInfo);
    }, [customerInfo]);

    const activeProProductId = useMemo<string | null>(() => {
      if (!getIsEntitledToPro(customerInfo)) return null;
      return getActiveProProductId(customerInfo);
    }, [customerInfo]);

    const purchasePackage = useCallback(
      async (
        pkg: PurchasesPackage,
        options?: { upgradeFromProductId?: string | null }
      ) => {
        if (!isConfigured) {
          return { customerInfo: customerInfo ?? null, cancelled: false };
        }

        setIsLoading(true);
        try {
          const upgradeFromProductId = options?.upgradeFromProductId ?? null;

          console.log("[RevenueCat] purchase start", {
            productId: pkg?.product?.identifier,
            upgradeFromProductId,
          });

          const result = upgradeFromProductId
            ? await (Purchases.purchasePackage as any)(pkg, {
                oldProductIdentifier: upgradeFromProductId,
                prorationMode:
                  (PRORATION_MODE as any)?.IMMEDIATE_AND_CHARGE_PRORATED_PRICE ??
                  (PRORATION_MODE as any)?.IMMEDIATE_WITH_TIME_PRORATION ??
                  1,
              })
            : await Purchases.purchasePackage(pkg);

          const ci = result?.customerInfo ?? null;
          setCustomerInfo(ci);
          setLastErrorMessage(null);

          console.log("[RevenueCat] purchase success", {
            productId: pkg?.product?.identifier,
            isEntitledToPro: getIsEntitledToPro(ci),
            activeProProductId: getActiveProProductId(ci),
          });

          return { customerInfo: ci, cancelled: false };
        } catch (e) {
          if (isUserCancelled(e)) {
            console.log("[RevenueCat] purchase cancelled");
            return { customerInfo: customerInfo ?? null, cancelled: true };
          }

          console.log("[RevenueCat] purchase error", e);
          setLastErrorMessage("Purchase failed. Please try again.");
          return { customerInfo: customerInfo ?? null, cancelled: false };
        } finally {
          setIsLoading(false);
        }
      },
      [customerInfo, isConfigured]
    );

    const restorePurchases = useCallback(async () => {
      if (!isConfigured) {
        return { customerInfo: customerInfo ?? null };
      }

      setIsLoading(true);
      try {
        const ci = await Purchases.restorePurchases();
        setCustomerInfo(ci ?? null);
        setLastErrorMessage(null);
        console.log("[RevenueCat] restored", {
          isEntitledToPro: getIsEntitledToPro(ci ?? null),
        });
        return { customerInfo: ci ?? null };
      } catch (e) {
        console.log("[RevenueCat] restore error", e);
        setLastErrorMessage("Restore failed. Please try again.");
        return { customerInfo: customerInfo ?? null };
      } finally {
        setIsLoading(false);
      }
    }, [customerInfo, isConfigured]);

    return {
      isConfigured,
      offerings,
      currentOffering,
      availablePackages,
      customerInfo,
      isEntitledToPro,
      activeProProductId,
      isLoading,
      lastErrorMessage,
      refresh,
      purchasePackage,
      restorePurchases,
    };
  }
);
