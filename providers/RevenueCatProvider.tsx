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

import { REVENUECAT_API_KEY } from "../config/secrets";  
import Purchases, { LOG_LEVEL } from "../services/revenuecatModule"; 

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
          setLastError("RevenueCat unavailable");
          return;
        }
        if (isConfigured) return;

        if (!REVENUECAT_API_KEY) {
          const msg = "Missing EXPO_PUBLIC_REVENUECAT_API_KEY";
          setLastError(msg);
          throw new Error(msg);
        }

        try {
          if (LOG_LEVEL && typeof Purchases.setLogLevel === "function") {
            const chosenLevel =
              LOG_LEVEL.DEBUG ??
              LOG_LEVEL.INFO ??
              LOG_LEVEL.WARN ??
              LOG_LEVEL.ERROR ??
              4;

            Purchases.setLogLevel(chosenLevel);
          }

          await Purchases.configure({
            apiKey: REVENUECAT_API_KEY,
            appUserID: appUserId ?? undefined,
          });

          setIsConfigured(true);
          setLastError(null);
        } catch (e) {
          setLastError((e as Error).message);
          throw e;
        }
      },
      [isConfigured, isSupported]
    );

    useEffect(() => {
      if (isSupported) initialize().catch(() => {});
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
      queryFn: () => Purchases.getOfferings(),
      staleTime: 300000,
    });

    const {
      data: customerInfo,
      refetch: refetchCustomerInfo,
      isLoading: isCustomerInfoLoading,
    } = useQuery({
      queryKey: ["revenuecat", "customer-info"],
      enabled: isSupported && isConfigured,
      queryFn: () => Purchases.getCustomerInfo(),
      refetchInterval: 60000,
    });

    const availablePackages = useMemo(() => {
      if (!offeringsData) return [];
      const items: PurchasesPackage[] = [];

      const allOfferings: PurchasesOffering[] = [];
      if (offeringsData.current) allOfferings.push(offeringsData.current);
      if (offeringsData.all)
        Object.values(offeringsData.all).forEach((o) => o && allOfferings.push(o));

      allOfferings.forEach((off) =>
        off.availablePackages.forEach((pkg) => items.push(pkg))
      );

      return items;
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

    const { mutateAsync: purchasePackageAsync, isPending: isPurchasePending } =
      useMutation({
        mutationFn: async (pkg: PurchasesPackage) => {
          const { customerInfo: info } = await Purchases.purchasePackage(pkg);
          return info;
        },
        onSuccess: (info) => {
          queryClient.setQueryData(["revenuecat", "customer-info"], info);
          setLastError(null);
        },
        onError: (err) => {
          setLastError((err as Error).message);
        },
      });

    const { mutateAsync: restorePurchasesAsync, isPending: isRestorePending } =
      useMutation({
        mutationFn: () => Purchases.restorePurchases(),
        onSuccess: (info) => {
          queryClient.setQueryData(["revenuecat", "customer-info"], info);
          setLastError(null);
        },
        onError: (err) => {
          setLastError((err as Error).message);
        },
      });

    const purchasePlan = useCallback(
      async (plan: PlanProductId) => {
        await initialize();
        const pkg = getPackageForPlan(plan);
        if (!pkg) throw new Error(`No package for ${plan}`);
        const info = await purchasePackageAsync(pkg);
        await refetchCustomerInfo();
        return info ?? null;
      },
      [initialize, getPackageForPlan, purchasePackageAsync, refetchCustomerInfo]
    );

    const restore = useCallback(async () => {
      const info = await restorePurchasesAsync();
      await refetchCustomerInfo();
      return info ?? null;
    }, [restorePurchasesAsync, refetchCustomerInfo]);

    return {
      isSupported,
      isConfigured,
      isLoading:
        (isSupported && !isConfigured) ||
        isOfferingsLoading ||
        isCustomerInfoLoading,
      isPurchasing: isPurchasePending || isRestorePending,
      offerings: offeringsData,
      currentOffering: offeringsData?.current ?? null,
      availablePackages,
      customerInfo,
      isEntitledToPro: Boolean(
        customerInfo?.entitlements?.active?.["RizzGoat Pro"]
      ),
      lastError,
      initialize,
      refreshOfferings: refetchOfferings,
      refreshCustomerInfo: refetchCustomerInfo,
      purchasePlan,
      restore,
    };
  });
