import { useCallback, useEffect, useMemo, useState } from "react";
import { Platform } from "react-native";
import createContextHook from "@nkzw/create-context-hook";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CustomerInfo,
  PurchasesOffering,
  PurchasesOfferings,
  PurchasesPackage,
} from "react-native-purchases";
import { getPurchases, configureRevenueCat } from "@/services/revenuecatModule";

export type PlanProductId = "weekly" | "monthly" | "lifetime";

interface RevenueCatContextValue {
  isSupported: boolean;
  isConfigured: boolean;
  isLoading: boolean;
  offerings?: PurchasesOfferings;
  currentOffering?: PurchasesOffering | null;
  availablePackages: PurchasesPackage[];
  customerInfo?: CustomerInfo;
  isEntitledToPro: boolean;
  purchasePlan: (plan: PlanProductId) => Promise<CustomerInfo | null>;
  restore: () => Promise<CustomerInfo | null>;
}

const PACKAGE_MATCHERS: Record<PlanProductId, string[]> = {
  weekly: ["rizzgoat.weekly"],
  monthly: ["rizzgoat.monthly"],
  lifetime: ["rizzgoat.lifetime"],
};

const ENTITLEMENT_ID = "pro";

export const [RevenueCatProvider, useRevenueCat] =
  createContextHook<RevenueCatContextValue>(() => {
    const queryClient = useQueryClient();

    const isSupported = Platform.OS === "ios" || Platform.OS === "android";
    const [isConfigured, setIsConfigured] = useState(false);
    const [isInitializing, setIsInitializing] = useState(false);

    const initialize = useCallback(async () => {
      if (!isSupported || isConfigured || isInitializing) return;

      setIsInitializing(true);
      try {
        await configureRevenueCat();
        setIsConfigured(true);
      } catch {
      } finally {
        setIsInitializing(false);
      }
    }, [isSupported, isConfigured, isInitializing]);

    useEffect(() => {
      initialize().catch(() => {});
    }, [initialize]);

    const { data: offerings } = useQuery({
      queryKey: ["revenuecat", "offerings"],
      enabled: isConfigured,
      queryFn: async () => {
        const Purchases = await getPurchases();
        if (!Purchases) throw new Error("Purchases unavailable");
        return Purchases.getOfferings();
      },
    });

    const { data: customerInfo } = useQuery({
      queryKey: ["revenuecat", "customer-info"],
      enabled: isConfigured,
      queryFn: async () => {
        const Purchases = await getPurchases();
        if (!Purchases) throw new Error("Purchases unavailable");
        return Purchases.getCustomerInfo();
      },
    });

    const currentOffering = useMemo(
      () => offerings?.current ?? null,
      [offerings],
    );

    const availablePackages = useMemo(
      () => currentOffering?.availablePackages ?? [],
      [currentOffering],
    );

    const purchasePlan = useCallback(
      async (plan: PlanProductId) => {
        const Purchases = await getPurchases();
        if (!Purchases) return null;

        const pkg = availablePackages.find((p) =>
          PACKAGE_MATCHERS[plan].some((id) =>
            p.product.identifier.toLowerCase().includes(id),
          ),
        );

        if (!pkg) return null;

        const { customerInfo } = await Purchases.purchasePackage(pkg);
        queryClient.setQueryData(["revenuecat", "customer-info"], customerInfo);
        return customerInfo;
      },
      [availablePackages, queryClient],
    );

    const restore = useCallback(async () => {
      const Purchases = await getPurchases();
      if (!Purchases) return null;
      const info = await Purchases.restorePurchases();
      queryClient.setQueryData(["revenuecat", "customer-info"], info);
      return info;
    }, [queryClient]);

    const isEntitledToPro = useMemo(
      () => Boolean(customerInfo?.entitlements?.active?.[ENTITLEMENT_ID]),
      [customerInfo],
    );

    return {
      isSupported,
      isConfigured,
      isLoading: isInitializing,
      offerings,
      currentOffering,
      availablePackages,
      customerInfo,
      isEntitledToPro,
      purchasePlan,
      restore,
    };
  });
