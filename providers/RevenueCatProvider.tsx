import { useCallback, useEffect, useMemo, useState } from "react";
import { AppState, Linking, Platform } from "react-native";
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
  presentRemotePaywall: (offeringId?: string) => Promise<CustomerInfo | null>;
  openCustomerCenter: () => Promise<void>;
}

const ENTITLEMENT_ID = "pro";
const OFFERING_PRIORITY = ["default", "ofrngb5fd12e734"] as const;
const PACKAGE_IDENTIFIERS: Record<PlanProductId, string> = {
  weekly: "rizzgoat.weekly",
  monthly: "rizzgoat.monthly",
  lifetime: "rizzgoat.lifetime",
};

const APPLE_SUBSCRIPTION_MANAGEMENT_URL = "https://apps.apple.com/account/subscriptions";
const GOOGLE_SUBSCRIPTION_MANAGEMENT_URL =
  "https://play.google.com/store/account/subscriptions";

const devLog = (...args: unknown[]) => {
  if (__DEV__) {
    console.log("[RevenueCatProvider]", ...args);
  }
};

const openPlatformSubscriptionSettings = async () => {
  const targetUrl = Platform.select({
    ios: APPLE_SUBSCRIPTION_MANAGEMENT_URL,
    android: GOOGLE_SUBSCRIPTION_MANAGEMENT_URL,
  });

  if (!targetUrl) {
    throw new Error("Customer Center is unavailable on this platform.");
  }

  const canOpen = await Linking.canOpenURL(targetUrl);
  if (canOpen) {
    await Linking.openURL(targetUrl);
    return;
  }

  await Linking.openURL(targetUrl);
};

export const [RevenueCatProvider, useRevenueCat] =
  createContextHook<RevenueCatContextValue>(() => {
    const isSupported =
      Platform.OS !== "web" &&
      Boolean(Purchases) &&
      typeof Purchases?.configure === "function";

    const queryClient = useQueryClient();
    const [isConfigured, setIsConfigured] = useState(false);
    const [configuredAppUserId, setConfiguredAppUserId] = useState<string | null>(null);
    const [lastError, setLastError] = useState<string | null>(null);

    const initialize = useCallback(
      async (appUserId?: string | null) => {
        if (!isSupported) {
          const message = "RevenueCat is unavailable on this platform.";
          setLastError(message);
          devLog(message);
          return;
        }

        if (!REVENUECAT_API_KEY) {
          const message = "Missing EXPO_PUBLIC_REVENUECAT_API_KEY environment variable.";
          setLastError(message);
          throw new Error(message);
        }

        const normalizedUserId = appUserId ?? null;
        if (isConfigured && configuredAppUserId === normalizedUserId) {
          return;
        }

        try {
          await configureRevenueCat(normalizedUserId);
          setIsConfigured(true);
          setConfiguredAppUserId(normalizedUserId);
          setLastError(null);
          devLog("RevenueCat configured", { user: normalizedUserId ?? "anonymous" });
        } catch (error) {
          const message =
            (error as Error)?.message ?? "Failed to configure RevenueCat.";
          setLastError(message);
          devLog("Configuration failed", message);
          throw error;
        }
      },
      [configuredAppUserId, isConfigured, isSupported],
    );

    useEffect(() => {
      if (!isSupported) return;
      initialize().catch(() => undefined);
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

    const offeringsResult = useQuery<PurchasesOfferings>({
      queryKey: ["revenuecat", "offerings"],
      enabled: isSupported && isConfigured,
      staleTime: 300000,
      queryFn: async () => {
        if (!Purchases) {
          throw new Error("RevenueCat unavailable");
        }
        const response = await Purchases.getOfferings();
        devLog("Offerings fetched", response.current?.identifier ?? "none");
        return response;
      },
    });

    const offeringsData = offeringsResult.data as PurchasesOfferings | undefined;
    const offeringsError = offeringsResult.error as Error | null;
    const isOfferingsLoading = offeringsResult.isLoading;
    const refetchOfferings = offeringsResult.refetch;

    useEffect(() => {
      if (offeringsError) {
        const message = offeringsError.message ?? "Unable to load RevenueCat offerings.";
        setLastError(message);
        devLog("Offerings error", message);
      }
    }, [offeringsError]);

    const customerInfoResult = useQuery<CustomerInfo>({
      queryKey: ["revenuecat", "customer-info"],
      enabled: isSupported && isConfigured,
      refetchInterval: 60000,
      queryFn: async () => {
        if (!Purchases) {
          throw new Error("RevenueCat unavailable");
        }
        const info = await Purchases.getCustomerInfo();
        devLog("Customer info fetched", {
          entitlement: Boolean(info.entitlements?.active?.[ENTITLEMENT_ID]),
        });
        return info;
      },
    });

    const customerInfo = customerInfoResult.data as CustomerInfo | undefined;
    const customerInfoError = customerInfoResult.error as Error | null;
    const isCustomerInfoLoading = customerInfoResult.isLoading;
    const refetchCustomerInfo = customerInfoResult.refetch;

    useEffect(() => {
      if (customerInfoError) {
        const message = customerInfoError.message ?? "Unable to load customer information.";
        setLastError(message);
        devLog("Customer info error", message);
      }
    }, [customerInfoError]);

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

    const currentOffering = useMemo<PurchasesOffering | null>(() => {
      if (!offeringsData) return null;

      for (const identifier of OFFERING_PRIORITY) {
        const match = offeringsData.all?.[identifier];
        if (match) {
          return match;
        }
      }

      if (offeringsData.current) {
        return offeringsData.current;
      }

      if (offeringsData.all) {
        const first = Object.values(offeringsData.all).find(
          (offering): offering is PurchasesOffering => Boolean(offering),
        );
        if (first) {
          return first;
        }
      }

      return null;
    }, [offeringsData]);

    const availablePackages = useMemo<PurchasesPackage[]>(() => {
      if (currentOffering) {
        return [...currentOffering.availablePackages];
      }

      if (!offeringsData?.all) {
        return [];
      }

      const fallback: PurchasesPackage[] = [];
      (Object.values(offeringsData.all) as PurchasesOffering[]).forEach((offering) => {
        offering?.availablePackages.forEach((pkg) => fallback.push(pkg));
      });
      return fallback;
    }, [currentOffering, offeringsData]);

    const getPackageForPlan = useCallback(
      (plan: PlanProductId) => {
        const identifier = PACKAGE_IDENTIFIERS[plan].toLowerCase();
        const match =
          availablePackages.find((pkg) => {
            const productIdentifier = pkg.product.identifier?.toLowerCase() ?? "";
            const packageIdentifier = pkg.identifier?.toLowerCase() ?? "";
            return productIdentifier === identifier || packageIdentifier === identifier;
          }) ?? null;
        return match;
      },
      [availablePackages],
    );

    const {
      mutateAsync: purchasePackageAsync,
      isPending: isPurchasePending,
    } = useMutation<CustomerInfo, Error, PurchasesPackage>({
      mutationFn: async (pkg: PurchasesPackage) => {
        const { customerInfo: info } = await Purchases.purchasePackage(pkg);
        return info;
      },
      onSuccess: (info) => {
        queryClient.setQueryData(["revenuecat", "customer-info"], info);
        setLastError(null);
        devLog("Purchase complete", {
          entitlement: Boolean(info.entitlements?.active?.[ENTITLEMENT_ID]),
        });
      },
      onError: (error) => {
        const message = error.message ?? "Purchase failed.";
        setLastError(message);
        devLog("Purchase error", message);
      },
    });

    const {
      mutateAsync: restorePurchasesAsync,
      isPending: isRestorePending,
    } = useMutation<CustomerInfo, Error, void>({
      mutationFn: async () => Purchases.restorePurchases(),
      onSuccess: (info) => {
        queryClient.setQueryData(["revenuecat", "customer-info"], info);
        setLastError(null);
        devLog("Restore complete", {
          entitlement: Boolean(info.entitlements?.active?.[ENTITLEMENT_ID]),
        });
      },
      onError: (error) => {
        const message = error.message ?? "Restore failed.";
        setLastError(message);
        devLog("Restore error", message);
      },
    });

    const purchasePlan = useCallback(
      async (plan: PlanProductId) => {
        await initialize();
        const pkg = getPackageForPlan(plan);
        if (!pkg) {
          const message = `No RevenueCat package found for ${plan}.`;
          setLastError(message);
          throw new Error(message);
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

    const presentRemotePaywall = useCallback(
      async (offeringId?: string) => {
        await initialize();

        if (!isSupported || !Purchases) {
          const message = "RevenueCat is unavailable on this platform.";
          setLastError(message);
          throw new Error(message);
        }

        const revenueCatUI = Purchases as unknown as {
          presentPaywall?: (params: {
            offeringIdentifier?: string;
          }) => Promise<{ customerInfo?: CustomerInfo }>;
        };

        if (!revenueCatUI.presentPaywall) {
          const fallbackMessage =
            "RevenueCat Paywall UI requires a production build or custom dev client.";
          setLastError(fallbackMessage);
          throw new Error(fallbackMessage);
        }

        const result = await revenueCatUI.presentPaywall({
          offeringIdentifier: offeringId ?? OFFERING_PRIORITY[0],
        });

        if (result?.customerInfo) {
          queryClient.setQueryData(
            ["revenuecat", "customer-info"],
            result.customerInfo,
          );
          setLastError(null);
        }

        return result?.customerInfo ?? null;
      },
      [initialize, isSupported, queryClient],
    );

    const openCustomerCenter = useCallback(async () => {
      await initialize();

      if (!isSupported || !Purchases) {
        const message = "RevenueCat is unavailable on this platform.";
        setLastError(message);
        throw new Error(message);
      }

      const revenueCatUI = Purchases as unknown as {
        presentCustomerCenter?: () => Promise<void>;
      };

      if (revenueCatUI.presentCustomerCenter) {
        await revenueCatUI.presentCustomerCenter();
        setLastError(null);
        return;
      }

      try {
        await openPlatformSubscriptionSettings();
        setLastError(null);
      } catch (error) {
        const message =
          (error as Error)?.message ?? "Unable to open subscription settings.";
        setLastError(message);
        throw error;
      }
    }, [initialize, isSupported]);

    const isEntitledToPro = useMemo(
      () => Boolean(customerInfo?.entitlements?.active?.[ENTITLEMENT_ID]),
      [customerInfo],
    );

    const isLoading =
      (isSupported && !isConfigured) || isOfferingsLoading || isCustomerInfoLoading;

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
      presentRemotePaywall,
      openCustomerCenter,
    };
  });
