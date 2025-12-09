import { useCallback, useEffect, useMemo, useState } from "react";
import { AppState, Platform } from "react-native";
import createContextHook from "@nkzw/create-context-hook";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CustomerInfo,
  CustomerInfoUpdateListener,
  IntroEligibility,
  PurchasesOffering,
  PurchasesOfferings,
  PurchasesPackage,
} from "react-native-purchases";
import { REVENUECAT_API_KEY } from "@/secrets";
import Purchases, { configureRevenueCat } from "@/services/revenuecatModule";

export type PlanProductId = "weekly" | "monthly" | "lifetime";

type RevenueCatTrialEligibility = Record<string, IntroEligibility>;

type RevenueCatPaywallOptions = {
  offeringIdentifier?: string;
  placementIdentifier?: string;
  displayCloseButton?: boolean;
};

type RevenueCatPaywallResult = {
  action?: string;
  customerInfo?: CustomerInfo;
};

type RevenueCatCustomerCenterResult = {
  action?: string;
  customerInfo?: CustomerInfo;
};

type PurchasesWithUI = typeof Purchases & {
  presentPaywall?: (
    options?: RevenueCatPaywallOptions,
  ) => Promise<RevenueCatPaywallResult>;
  presentCustomerCenter?: () => Promise<RevenueCatCustomerCenterResult>;
};

const purchasesWithUI = Purchases as PurchasesWithUI;

interface RevenueCatContextValue {
  isSupported: boolean;
  isConfigured: boolean;
  isLoading: boolean;
  isPurchasing: boolean;
  isPaywallAvailable: boolean;
  isCustomerCenterAvailable: boolean;
  offerings?: PurchasesOfferings;
  currentOffering?: PurchasesOffering | null;
  availablePackages: PurchasesPackage[];
  packagesByPlan: Record<PlanProductId, PurchasesPackage | null>;
  trialEligibility: RevenueCatTrialEligibility;
  customerInfo?: CustomerInfo;
  isEntitledToPro: boolean;
  lastError?: string | null;
  initialize: (appUserId?: string | null) => Promise<void>;
  refreshOfferings: () => Promise<void>;
  refreshCustomerInfo: () => Promise<void>;
  purchasePlan: (plan: PlanProductId) => Promise<CustomerInfo | null>;
  restore: () => Promise<CustomerInfo | null>;
  getPackageForPlan: (plan: PlanProductId) => PurchasesPackage | null;
  presentPaywall: (
    options?: RevenueCatPaywallOptions,
  ) => Promise<RevenueCatPaywallResult | null>;
  presentCustomerCenter: () => Promise<RevenueCatCustomerCenterResult | null>;
}

const PACKAGE_MATCHERS: Record<PlanProductId, string[]> = {
  weekly: ["rizzgoat.weekly"],
  monthly: ["rizzgoat.monthly"],
  lifetime: ["rizzgoat.lifetime"],
};

const ENTITLEMENT_ID = "pro";
const PRIMARY_OFFERING_ID = "default";

const getPlanFromIdentifier = (
  identifier?: string | null,
): PlanProductId | null => {
  if (!identifier) return null;
  const normalized = identifier.toLowerCase();
  const found = (Object.keys(PACKAGE_MATCHERS) as PlanProductId[]).find(
    (plan) => PACKAGE_MATCHERS[plan].some((matcher) => normalized.includes(matcher)),
  );
  return found ?? null;
};

const didUserCancel = (error: unknown): boolean => {
  if (typeof error !== "object" || !error) return false;
  if ("userCancelled" in error && Boolean((error as Record<string, unknown>).userCancelled)) {
    return true;
  }
  if ("code" in error && (error as Record<string, unknown>).code === "1") {
    return true;
  }
  return false;
};

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
    const [trialEligibility, setTrialEligibility] = useState<RevenueCatTrialEligibility>(
      {},
    );
    const [isInitializing, setIsInitializing] = useState(false);
    const [isPaywallAvailable, setIsPaywallAvailable] = useState(false);
    const [isCustomerCenterAvailable, setIsCustomerCenterAvailable] = useState(false);

    const initialize = useCallback(
      async (appUserId?: string | null) => {
        if (!isSupported || !Purchases) {
          const message = "RevenueCat is unavailable on this platform.";
          setLastError(message);
          return;
        }

        if (!REVENUECAT_API_KEY) {
          const message =
            "Missing EXPO_PUBLIC_REVENUECAT_API_KEY environment variable.";
          setLastError(message);
          throw new Error(message);
        }

        const normalizedUserId = appUserId ?? null;

        if (isConfigured && configuredAppUserId === normalizedUserId) {
          return;
        }

        setIsInitializing(true);

        try {
          await configureRevenueCat(normalizedUserId ?? undefined);
          setIsConfigured(true);
          setConfiguredAppUserId(normalizedUserId);
          setIsPaywallAvailable(typeof purchasesWithUI.presentPaywall === "function");
          setIsCustomerCenterAvailable(
            typeof purchasesWithUI.presentCustomerCenter === "function",
          );
          setLastError(null);
        } catch (error) {
          const message =
            (error as Error)?.message ?? "Failed to configure RevenueCat";
          setLastError(message);
          throw error;
        } finally {
          setIsInitializing(false);
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
      enabled: isSupported,
      queryFn: async () => {
        if (!Purchases) throw new Error("RevenueCat unavailable");
        await initialize();
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
      enabled: isSupported,
      queryFn: async () => {
        if (!Purchases) throw new Error("RevenueCat unavailable");
        await initialize();
        return Purchases.getCustomerInfo();
      },
      refetchInterval: 60000,
    });

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
      if (!offeringsData?.all) return [];
      const fallback: PurchasesPackage[] = [];
      Object.values(offeringsData.all).forEach((offering) => {
        offering?.availablePackages.forEach((pkg) => fallback.push(pkg));
      });
      return fallback;
    }, [currentOffering, offeringsData]);

    const packagesByPlan = useMemo(() => {
      const initial: Record<PlanProductId, PurchasesPackage | null> = {
        weekly: null,
        monthly: null,
        lifetime: null,
      };
      availablePackages.forEach((pkg) => {
        const plan = getPlanFromIdentifier(pkg.product.identifier);
        if (plan && !initial[plan]) {
          initial[plan] = pkg;
        }
      });
      return initial;
    }, [availablePackages]);

    useEffect(() => {
      if (!isSupported || !isConfigured || !availablePackages.length || !Purchases) {
        return;
      }
      const identifiers = Array.from(
        new Set(
          availablePackages
            .map((pkg) => pkg.product.identifier)
            .filter((identifier): identifier is string => Boolean(identifier)),
        ),
      );
      if (!identifiers.length) return;
      let isCancelled = false;
      Purchases.checkTrialOrIntroductoryPriceEligibility(identifiers)
        .then((result) => {
          if (!isCancelled) {
            setTrialEligibility(result);
          }
        })
        .catch(() => {});
      return () => {
        isCancelled = true;
      };
    }, [availablePackages, isConfigured, isSupported]);

    useEffect(() => {
      if (!isSupported || !isConfigured) return;
      const subscription = AppState.addEventListener("change", (status) => {
        if (status === "active") {
          refetchCustomerInfo();
          refetchOfferings();
        }
      });
      return () => {
        subscription.remove();
      };
    }, [isConfigured, isSupported, refetchCustomerInfo, refetchOfferings]);

    const getPackageForPlan = useCallback(
      (plan: PlanProductId) => {
        return packagesByPlan[plan] ?? null;
      },
      [packagesByPlan],
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
        if (didUserCancel(err)) {
          return;
        }
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
        if (didUserCancel(err)) {
          return;
        }
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
      await initialize();
      await refetchOfferings();
    }, [initialize, refetchOfferings]);

    const refreshCustomerInfo = useCallback(async () => {
      if (!Purchases) return;
      await initialize();
      if (typeof Purchases.invalidateCustomerInfoCache === "function") {
        await Purchases.invalidateCustomerInfoCache();
      }
      await refetchCustomerInfo();
    }, [initialize, refetchCustomerInfo]);

    const presentPaywall = useCallback(
      async (options?: RevenueCatPaywallOptions) => {
        if (!isPaywallAvailable || !purchasesWithUI.presentPaywall) {
          setLastError("RevenueCat paywalls are not available on this platform.");
          return null;
        }
        await initialize();
        try {
          const result = await purchasesWithUI.presentPaywall({
            offeringIdentifier: options?.offeringIdentifier ?? PRIMARY_OFFERING_ID,
            placementIdentifier: options?.placementIdentifier,
            displayCloseButton: options?.displayCloseButton ?? true,
          });
          if (result?.customerInfo) {
            queryClient.setQueryData(["revenuecat", "customer-info"], result.customerInfo);
            setLastError(null);
          }
          return result;
        } catch (error) {
          const message =
            (error as Error)?.message ?? "Unable to present RevenueCat paywall";
          setLastError(message);
          throw error;
        }
      },
      [initialize, isPaywallAvailable, queryClient],
    );

    const presentCustomerCenter = useCallback(async () => {
      if (!isCustomerCenterAvailable || !purchasesWithUI.presentCustomerCenter) {
        setLastError("Customer Center is not available on this platform.");
        return null;
      }
      await initialize();
      try {
        const result = await purchasesWithUI.presentCustomerCenter();
        if (result?.customerInfo) {
          queryClient.setQueryData(["revenuecat", "customer-info"], result.customerInfo);
          setLastError(null);
        }
        return result;
      } catch (error) {
        const message =
          (error as Error)?.message ?? "Unable to open Customer Center";
        setLastError(message);
        throw error;
      }
    }, [initialize, isCustomerCenterAvailable, queryClient]);

    const isEntitledToPro = useMemo(
      () => Boolean(customerInfo?.entitlements?.active?.[ENTITLEMENT_ID]),
      [customerInfo],
    );

    const isLoading =
      (isSupported && !isConfigured) ||
      isOfferingsLoading ||
      isCustomerInfoLoading ||
      isInitializing;

    const isPurchasing = isPurchasePending || isRestorePending;

    return {
      isSupported,
      isConfigured,
      isLoading,
      isPurchasing,
      isPaywallAvailable,
      isCustomerCenterAvailable,
      offerings: offeringsData,
      currentOffering,
      availablePackages,
      packagesByPlan,
      trialEligibility,
      customerInfo,
      isEntitledToPro,
      lastError,
      initialize,
      refreshOfferings,
      refreshCustomerInfo,
      purchasePlan,
      restore,
      getPackageForPlan,
      presentPaywall,
      presentCustomerCenter,
    };
  });
