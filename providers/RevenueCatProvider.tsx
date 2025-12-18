import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState, AppStateStatus, Platform } from "react-native";
import Constants from "expo-constants";
import Purchases, {
  CustomerInfo,
  LOG_LEVEL,
  PurchasesOfferings,
  PurchasesOffering,
  PurchasesPackage,
  PurchasesError,
  PURCHASES_ERROR_CODE,
} from "react-native-purchases";
import createContextHook from "@nkzw/create-context-hook";

type RevenueCatState = {
  isConfigured: boolean;
  offerings: PurchasesOfferings | null;
  currentOffering: PurchasesOffering | null;
  availablePackages: PurchasesPackage[];
  customerInfo: CustomerInfo | null;
  isEntitledToPro: boolean;
  isLoading: boolean;
  lastErrorMessage: string | null;
  refresh: () => Promise<void>;
  purchasePackage: (pkg: PurchasesPackage) => Promise<{
    customerInfo: CustomerInfo | null;
    cancelled: boolean;
  }>;
  restorePurchases: () => Promise<{ customerInfo: CustomerInfo | null }>;
};

function getRevenueCatApiKey(): string | null {
  const raw =
    (Constants.expoConfig?.extra as Record<string, unknown> | undefined)?.
      EXPO_PUBLIC_REVENUECAT_API_KEY ??
    process.env.EXPO_PUBLIC_REVENUECAT_API_KEY;

  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return trimmed;
}

function getIsEntitledToPro(info: CustomerInfo | null): boolean {
  return info?.entitlements?.active?.pro != null;
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

      const apiKey = getRevenueCatApiKey();
      if (!apiKey) {
        console.log("[RevenueCat] missing EXPO_PUBLIC_REVENUECAT_API_KEY; skipping configure");
        setIsConfigured(false);
        return;
      }

      if (Platform.OS === "web") {
        console.log("[RevenueCat] web platform detected; skipping configure");
        setIsConfigured(false);
        return;
      }

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

    const purchasePackage = useCallback(
      async (pkg: PurchasesPackage) => {
        if (!isConfigured) {
          return { customerInfo: customerInfo ?? null, cancelled: false };
        }

        setIsLoading(true);
        try {
          const result = await Purchases.purchasePackage(pkg);
          const ci = result?.customerInfo ?? null;
          setCustomerInfo(ci);
          setLastErrorMessage(null);

          console.log("[RevenueCat] purchase success", {
            productId: pkg?.product?.identifier,
            isEntitledToPro: getIsEntitledToPro(ci),
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
      isLoading,
      lastErrorMessage,
      refresh,
      purchasePackage,
      restorePurchases,
    };
  }
);
