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
}

const PACKAGE_MATCHERS: Record<PlanProductId, string[]> = {
  weekly: ["weekly"],
  monthly: ["monthly"],
  lifetime: ["lifetime", "annual", "rc_annual", "rizzgoat.lifetime"],
};

export const [RevenueCatProvider, useRevenueCat] =
  createContextHook<RevenueCatContextValue>(() => {
    const isSupported =
      Platform.OS !== "web" &&
      Boolean(Purchases) &&
      typeof Purchases?.configure === "function";

    const queryClient = useQueryClient();
    const [isConfigured, setIsConfigured] = useState(false);
    const [lastError, setLastError] = useState<string | null>(null);

    const initialize = useCallback(
      async (appUserId?: string | null) => {
        if (!isSupported || !Purchases) {
          setLastError("RevenueCat is unavailable on this platform.");
          return;
        }

        if (isConfigured) return;

        if (!REVENUECAT_API_KEY) {
          const message =
            "Missing EXPO_PUBLIC_REVENUECAT_API_KEY environment variable.";
          setLastError(message);
          throw new Error(message);
        }

        try {
          if (typeof Purchases.setLogLevel === "function") {
            Purchases.setLogLevel(
              LOG_LEVEL?.DEBUG ??
                LOG_LEVEL?.INFO ??
                LOG_LEVEL?.WARN ??
                LOG_LEVEL?.ERROR ??
                4
            );
          }

          await Purchases.configure({
            apiKey: REVENUECAT_API_KEY,
            appUserID: appUserId ?? undefined,
          });

          setIsConfigured(true);
          setLastError(null);
        } catch (err) {
          const msg =
            (err as Error)?.message ?? "Failed to configure RevenueCat";
          setLastError(msg);
          throw err;
        }
      },
      [isSupported, isConfigured]
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
    }, [isSupported, isConfigured, queryClient]);

    const {
      data: offeringsData,
      refetch: refetchOfferings,
      isLoading: offeringsLoading,
    } = useQuery({
      queryKey: ["revenuecat", "offerings"],
      enabled: isSupported && isConfigured,
      queryFn: () => Purchases.getOfferings(),
      staleTime: 300000,
    });

    const {
      data: customerInfo,
      refetch: refetchCustomerInfo,
      isLoading: customerLoading,
    } = useQuery({
      queryKey: ["revenuecat", "customer-info"],
      enabled: isSupported && isConfigured,
      queryFn: () => Purchases.getCustomerInfo(),
      refetchInterval: 60000,
    });

    const availablePackages = useMemo(() => {
      if (!offeringsData) return [];

      const list: PurchasesPackage[] = [];

      if (offeringsData.current) {
        offeringsData.current.availablePackages.forEach((p) => list.push(p));
      }

      if (offeringsData.all) {
        Object.values(offeringsData.all).forEach((o) =>
          o?.availablePackages.forEach((p) => list.push(p))
        );
      }

      return list;
    }, [offeringsData]);

    const getPackageForPlan = useCallback(
      (plan: PlanProductId) => {
        const matchers = PACKAGE_MATCHERS[plan];

        return (
          availablePackages.find((pkg) => {
            const id = pkg.product.identifier.toLowerCase();
            const alias = pkg.identifier.toLowerCase();
            return matchers.some((m) => id.includes(m) || alias.includes(m));
          }) ?? null
        );
      },
      [availablePackages]
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
      mutationFn: async () => Purchases.restorePurchases(),
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
      [
        initialize,
        getPackageForPlan,
        purchasePackageAsync,
        refetchCustomerInfo,
      ]
    );

    const restore = useCallback(async () => {
      const info = await restorePurchasesAsync();
      await refetchCustomerInfo();
      return info ?? null;
    }, [restorePurchasesAsync, refetchCustomerInfo]);

    const refreshOfferings = useCallback(async () => {
      await refetchOfferings();
    }, [refetchOfferings]);

    const refreshCustomerInfo = useCallback(async () => {
      await refetchCustomerInfo();
    }, [refetchCustomerInfo]);

    const isEntitledToPro = useMemo(() => {
      return Boolean(customerInfo?.entitlements?.active?.["RizzGoat Pro"]);
    }, [customerInfo]);

    const isLoading =
      (!isConfigured && isSupported) ||
      offeringsLoading ||
      customerLoading;

    const isPurchasing = isPurchasePending || isRestorePending;

    return {
      isSupported,
      isConfigured,
      isLoading,
      isPurchasing,
      offerings: offeringsData,
      currentOffering: offeringsData?.current ?? null,
      availablePackages,
      customerInfo,
      isEntitledToPro,
      lastError,
      initialize,
      refreshOfferings,
      refreshCustomerInfo,
      purchasePlan,
      restore,
    };
  });
