import { useCallback, useEffect, useMemo, useState } from "react";
import { AppState, Platform } from "react-native";
import createContextHook from "@nkzw/create-context-hook";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CustomerInfo,
  CustomerInfoUpdateListener,
  PurchasesOffering,
  PurchasesOfferings,
  PurchasesPackage,
} from "react-native-purchases";

import { REVENUECAT_API_KEY } from "@/secrets";
import Purchases, { configureRevenueCat } from "@/services/revenuecatModule";

export type PlanProductId = "weekly" | "monthly" | "lifetime";

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
  getPackageForPlan: (plan: PlanProductId) => PurchasesPackage | null;
}

const PACKAGE_MATCHERS: Record<PlanProductId, string[]> = {
  weekly: ["rizzgoat.weekly"],
  monthly: ["rizzgoat.monthly"],
  lifetime: ["rizzgoat.lifetime"],
};

const ENTITLEMENT_ID = "pro";
const PRIMARY_OFFERING_ID = "default";

export const [RevenueCatProvider, useRevenueCat] =
  createContextHook<RevenueCatContextValue>(() => {
    const isSupported =
      Platform.OS !== "web" &&
      Boolean(Purchases) &&
      typeof Purchases?.configure === "function";

    const queryClient = useQueryClient();
    const [isConfigured, setIsConfigured] = useState(false);
    const [configuredAppUserId, setConfiguredAppUserId] = useState<string | null>(
      null,
    );
    const [lastError, setLastError] = useState<string | null>(null);

    const initialize = useCallback(
      async (appUserId?: string | null) => {
        if (!isSupported || !Purchases) {
          const message = "RevenueCat is unavailable on this platform.";
          setLastError(message);
          return;
        }

        const normalizedUserId = appUserId ?? null;

        if (isConfigured && configuredAppUserId === normalizedUserId) {
          return;
        }

        if (!REVENUECAT_API_KEY) {
          const message =
            "Missing EXPO_PUBLIC_REVENUECAT_API_KEY environment variable.";
          setLastError(message);
          throw new Error(message);
        }

        try {
          await configureRevenueCat(normalizedUserId ?? undefined);
          setIsConfigured(true);
          setConfiguredAppUserId(normalizedUserId);
          setLastError(null);
        } catch (error) {
          const message =
            (error as Error)?.message ?? "Failed to configure RevenueCat";
          setLastError(message);
          throw error;
        }
      },
      [configuredAppUserId, isConfigured, isSupported],
    );

    useEffect(() => {
      if (!isSupported) return;
      initialize().catch(() => {});
    }, [initialize, isSupported]);

    useEffect(() => {
      if (!isSupported || !isConfigured || !Purchases) return;

      const listener: CustomerInfoUpdateListener = (info) => {
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
        if (!Purchases) throw new Error("RevenueCat unavailable");
        return Purchases.getOfferings();
      },
      staleTime: 300000,
    });

    const {
      data: customerInfo,
      refetch: refetchCustomerInfo,
      isLoading: isCustomerInfoLoading,
    } = useQuery({
      queryKey: ["revenuecat", "customer-info"],
      enabled: isSupported && isConfigured,
      queryFn: async () => {
        if (!Purchases) throw new Error("RevenueCat unavailable");
        return Purchases.getCustomerInfo();
      },
      refetchInterval: 60000,
    });

    useEffect(() => {
      if (!isSupported || !isConfigured) return;
      const subscription = AppState.addEventListener("change", (status) => {
        if (status === "active") {
          refetchCustomerInfo();
        }
      });

      return () => {
        subscription.remove();
      };
    }, [isConfigured, isSupported, refetchCustomerInfo]);

    const currentOffering = useMemo(() => {
      if (!offeringsData) return null;
      if (offeringsData.all?.[PRIMARY_OFFERING_ID]) {
        return offeringsData.all[PRIMARY_OFFERING_ID];
      }
      if (offeringsData.current) return offeringsData.current;
      if (offeringsData.all) {
        const first = Object.values(offeringsData.all).find(
          (offering): offering is PurchasesOffering => Boolean(offering),
        );
        if (first) return first;
      }
      return null;
    }, [offeringsData]);

    const availablePackages = useMemo(() => {
      if (currentOffering) {
        return [...currentOffering.availablePackages];
      }
      if (!offeringsData) return [];
      const fallback: PurchasesPackage[] = [];
      if (offeringsData.all) {
        Object.values(offeringsData.all).forEach((offering) => {
          offering?.availablePackages.forEach((pkg) => fallback.push(pkg));
        });
      }
      return fallback;
    }, [currentOffering, offeringsData]);

    const getPackageForPlan = useCallback(
      (plan: PlanProductId) => {
        const matchers = PACKAGE_MATCHERS[plan];
        return (
          availablePackages.find((pkg) => {
            const id = (pkg.product.identifier ?? "").toLowerCase();
            const alias = (pkg.identifier ?? "").toLowerCase();
            return matchers.some((m) => id.includes(m) || alias.includes(m));
          }) ?? null
        );
      },
      [availablePackages],
    );

    const {
      mutateAsync: purchasePackageAsync,
      isPending: isPurchasePending,
    } = useMutation({
      mutationFn: async (pkg: PurchasesPackage) => {
        const { customerInfo: info } = await Purchases.purchasePackage(pkg);
        return info;
      },
      onSuccess: (info) => {
        queryClient.setQueryData(["revenuecat", "customer-info"], info);
        setLastError(null);
      },
      onError: (err) => {
        setLastError((err as Error).message ?? "Purchase failed");
      },
    });

    const {
      mutateAsync: restorePurchasesAsync,
      isPending: isRestorePending,
    } = useMutation({
      mutationFn: async () => {
        return Purchases.restorePurchases();
      },
      onSuccess: (info) => {
        queryClient.setQueryData(["revenuecat", "customer-info"], info);
        setLastError(null);
      },
      onError: (err) => {
        setLastError((err as Error).message ?? "Restore failed");
      },
    });

    const purchasePlan = useCallback(
      async (plan: PlanProductId) => {
        await initialize();
        const pkg = getPackageForPlan(plan);
        if (!pkg) {
          const msg = `No RevenueCat package found for ${plan}`;
          setLastError(msg);
          throw new Error(msg);
        }
        const info = await purchasePackageAsync(pkg);
        await refetchCustomerInfo();
        return info ?? null;
      },
      [getPackageForPlan, initialize, purchasePackageAsync, refetchCustomerInfo],
    );

    const restore = useCallback(async () => {
      await initialize();
      const info = await restorePurchasesAsync();
      await refetchCustomerInfo();
      return info ?? null;
    }, [initialize, refetchCustomerInfo, restorePurchasesAsync]);

    const refreshOfferings = useCallback(async () => {
      await refetchOfferings();
    }, [refetchOfferings]);

    const refreshCustomerInfo = useCallback(async () => {
      await refetchCustomerInfo();
    }, [refetchCustomerInfo]);

    const isEntitledToPro = useMemo(
      () => Boolean(customerInfo?.entitlements?.active?.[ENTITLEMENT_ID]),
      [customerInfo],
    );

    const isLoading =
      (isSupported && !isConfigured) ||
      isOfferingsLoading ||
      isCustomerInfoLoading;

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
      getPackageForPlan,
    };
  });
