import { useCallback, useEffect, useMemo, useState } from "react";
import { Platform } from "react-native";
import createContextHook from "@nkzw/create-context-hook";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CustomerInfo,
  CustomerInfoUpdateListener,
  PurchasesOffering,
  PurchasesOfferings,
  PurchasesPackage,
} from "react-native-purchases";
import { REVENUECAT_API_KEY } from "@/config/secrets";
import Purchases, { LOG_LEVEL } from "@/services/revenuecatModule";

export type PlanProductId = "weekly" | "monthly" | "yearly";

interface RevenueCatContextValue {
  isSupported: boolean;
  isConfigured: boolean;
  isLoading: boolean;
  isPurchasing: boolean;
  offerings?: PurchasesOfferings;
  currentOffering?: PurchasesOffering | null;
  availablePackages: PurchasesPackage[];
  customerInfo?: CustomerInfo;
  isEntitledToPro: boolean;
  lastError?: string | null;
  initialize: (appUserId?: string | null) => Promise<void>;
  refreshOfferings: () => Promise<void>;
  refreshCustomerInfo: () => Promise<void>;
  purchasePlan: (plan: PlanProductId) => Promise<CustomerInfo | null>;
  restore: () => Promise<CustomerInfo | null>;
}

const PACKAGE_MATCHERS: Record<PlanProductId, string[]> = {
  weekly: ["weekly"],
  monthly: ["monthly"],
  yearly: ["yearly", "annual"],
};

export const [RevenueCatProvider, useRevenueCat] = createContextHook<RevenueCatContextValue>(() => {
  const isSupported = Platform.OS !== "web" && Boolean(Purchases) && typeof Purchases?.configure === "function";
  const queryClient = useQueryClient();
  const [isConfigured, setIsConfigured] = useState<boolean>(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const initialize = useCallback(
    async (appUserId?: string | null) => {
      if (!isSupported || !Purchases) {
        const message = "RevenueCat is unavailable on this platform.";
        console.warn("[RevenueCat]", message);
        setLastError(message);
        return;
      }
      if (isConfigured) {
        return;
      }
      if (!REVENUECAT_API_KEY) {
        const message = "Missing EXPO_PUBLIC_REVENUECAT_API_KEY environment variable.";
        console.error("[RevenueCat]", message);
        setLastError(message);
        throw new Error(message);
      }

      try {
        console.log("[RevenueCat] Configuring SDK");
        if (LOG_LEVEL && typeof Purchases.setLogLevel === "function") {
          const chosenLevel = LOG_LEVEL.DEBUG ?? LOG_LEVEL.INFO ?? LOG_LEVEL.WARN ?? LOG_LEVEL.ERROR ?? 4;
          Purchases.setLogLevel(chosenLevel);
        }
        await Purchases.configure({ apiKey: REVENUECAT_API_KEY, appUserID: appUserId ?? undefined });
        setIsConfigured(true);
        setLastError(null);
      } catch (error) {
        console.error("[RevenueCat] configure error", error);
        const message = (error as Error)?.message ?? "Failed to configure RevenueCat";
        setLastError(message);
        throw error;
      }
    },
    [isConfigured, isSupported],
  );

  useEffect(() => {
    if (!isSupported) {
      return;
    }
    initialize().catch((error) => console.error("[RevenueCat] initialization failed", error));
  }, [initialize, isSupported]);

  useEffect(() => {
    if (!isSupported || !isConfigured || !Purchases) {
      return;
    }

    const listener: CustomerInfoUpdateListener = (info) => {
      console.log("[RevenueCat] customer info update received");
      queryClient.setQueryData(["revenuecat", "customer-info"], info);
    };

    Purchases.addCustomerInfoUpdateListener(listener);

    return () => {
      if (typeof Purchases.removeCustomerInfoUpdateListener === "function") {
        Purchases.removeCustomerInfoUpdateListener(listener);
      }
    };
  }, [isConfigured, isSupported, queryClient]);

  const {
    data: offeringsData,
    refetch: refetchOfferings,
    isLoading: isOfferingsLoading,
  } = useQuery({
    queryKey: ["revenuecat", "offerings"],
    enabled: isSupported && isConfigured,
    queryFn: async () => {
      if (!Purchases) {
        throw new Error("RevenueCat is unavailable on this platform.");
      }
      console.log("[RevenueCat] Fetching offerings");
      return Purchases.getOfferings();
    },
    staleTime: 5 * 60 * 1000,
  });

  const {
    data: customerInfo,
    refetch: refetchCustomerInfo,
    isLoading: isCustomerInfoLoading,
  } = useQuery({
    queryKey: ["revenuecat", "customer-info"],
    enabled: isSupported && isConfigured,
    queryFn: async () => {
      if (!Purchases) {
        throw new Error("RevenueCat is unavailable on this platform.");
      }
      console.log("[RevenueCat] Fetching customer info");
      return Purchases.getCustomerInfo();
    },
    refetchInterval: 60 * 1000,
  });

  const availablePackages = useMemo(() => {
    if (!offeringsData) {
      return [];
    }
    const packages: PurchasesPackage[] = [];
    const offeringList: PurchasesOffering[] = [];
    if (offeringsData.current) {
      offeringList.push(offeringsData.current);
    }
    if (offeringsData.all) {
      Object.values(offeringsData.all).forEach((offering) => {
        if (offering) {
          offeringList.push(offering as PurchasesOffering);
        }
      });
    }
    offeringList.forEach((offering) => {
      offering.availablePackages.forEach((pkg) => packages.push(pkg));
    });
    return packages;
  }, [offeringsData]);

  const getPackageForPlan = useCallback(
    (plan: PlanProductId) => {
      const matchers = PACKAGE_MATCHERS[plan];
      const target = availablePackages.find((pkg) => {
        const identifier = (pkg.identifier ?? "").toLowerCase();
        const productId = (pkg.product.identifier ?? "").toLowerCase();
        return matchers.some((matcher) => identifier.includes(matcher) || productId.includes(matcher));
      });
      return target ?? null;
    },
    [availablePackages],
  );

  const {
    mutateAsync: purchasePackageAsync,
    isPending: isPurchasePending,
  } = useMutation({
    mutationFn: async (pkg: PurchasesPackage) => {
      if (!Purchases) {
        throw new Error("RevenueCat is unavailable on this platform.");
      }
      console.log("[RevenueCat] Starting purchase for", pkg.identifier ?? pkg.product.identifier);
      const { customerInfo: info } = await Purchases.purchasePackage(pkg);
      return info;
    },
    onSuccess: (info) => {
      queryClient.setQueryData(["revenuecat", "customer-info"], info);
      setLastError(null);
    },
    onError: (error) => {
      const message = (error as Error)?.message ?? "Purchase failed";
      console.error("[RevenueCat] purchase error", message);
      setLastError(message);
    },
  });

  const {
    mutateAsync: restorePurchasesAsync,
    isPending: isRestorePending,
  } = useMutation({
    mutationFn: async () => {
      if (!Purchases) {
        throw new Error("RevenueCat is unavailable on this platform.");
      }
      console.log("[RevenueCat] Restoring purchases");
      return Purchases.restorePurchases();
    },
    onSuccess: (info) => {
      queryClient.setQueryData(["revenuecat", "customer-info"], info);
      setLastError(null);
    },
    onError: (error) => {
      const message = (error as Error)?.message ?? "Restore failed";
      console.error("[RevenueCat] restore error", message);
      setLastError(message);
    },
  });

  const purchasePlan = useCallback(
    async (plan: PlanProductId) => {
      if (!isSupported) {
        const message = "Purchases are unavailable on this platform.";
        setLastError(message);
        throw new Error(message);
      }
      await initialize();
      const pkg = getPackageForPlan(plan);
      if (!pkg) {
        const message = `No RevenueCat package found for plan ${plan}.`;
        setLastError(message);
        throw new Error(message);
      }
      const info = await purchasePackageAsync(pkg);
      await refetchCustomerInfo();
      return info ?? null;
    },
    [getPackageForPlan, initialize, isSupported, purchasePackageAsync, refetchCustomerInfo],
  );

  const restore = useCallback(async () => {
    if (!isSupported) {
      const message = "Restore is unavailable on this platform.";
      setLastError(message);
      throw new Error(message);
    }
    const info = await restorePurchasesAsync();
    await refetchCustomerInfo();
    return info ?? null;
  }, [isSupported, refetchCustomerInfo, restorePurchasesAsync]);

  const refreshOfferings = useCallback(async () => {
    await refetchOfferings();
  }, [refetchOfferings]);

  const refreshCustomerInfo = useCallback(async () => {
    await refetchCustomerInfo();
  }, [refetchCustomerInfo]);

  const currentOffering = offeringsData?.current ?? null;
  const isEntitledToPro = useMemo(() => {
    const active = customerInfo?.entitlements?.active ?? {};
    return Boolean(active["RizzGoat Pro"]);
  }, [customerInfo]);

  const isLoading = (isSupported && !isConfigured) || isOfferingsLoading || isCustomerInfoLoading;
  const isPurchasing = isPurchasePending || isRestorePending;

  return {
    isSupported,
    isConfigured,
    isLoading,
    isPurchasing,
    offerings: offeringsData,
    currentOffering,
    availablePackages,
    customerInfo,
    isEntitledToPro,
    lastError,
    initialize,
    refreshOfferings,
    refreshCustomerInfo,
    purchasePlan,
    restore,
  } as RevenueCatContextValue;
});
