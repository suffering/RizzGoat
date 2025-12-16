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
import { configureRevenueCat, getPurchases } from "@/services/revenuecatModule";

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

type PurchasesInstance = NonNullable<Awaited<ReturnType<typeof getPurchases>>>;

type PurchasesWithUI = PurchasesInstance & {
presentPaywall?: (options?: RevenueCatPaywallOptions) => Promise<RevenueCatPaywallResult>;
presentCustomerCenter?: () => Promise<RevenueCatCustomerCenterResult>;
};

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
presentPaywall: (options?: RevenueCatPaywallOptions) => Promise<RevenueCatPaywallResult | null>;
presentCustomerCenter: () => Promise<RevenueCatCustomerCenterResult | null>;
}

const PACKAGE_MATCHERS: Record<PlanProductId, string[]> = {
weekly: ["rizzgoat.weekly"],
monthly: ["rizzgoat.monthly"],
lifetime: ["rizzgoat.lifetime"],
};

const ENTITLEMENT_ID = "pro";
const PRIMARY_OFFERING_ID = "default";

const getPlanFromIdentifier = (identifier?: string | null): PlanProductId | null => {
if (!identifier) return null;
const normalized = identifier.toLowerCase();
const found = (Object.keys(PACKAGE_MATCHERS) as PlanProductId[]).find((plan) =>
  PACKAGE_MATCHERS[plan].some((matcher) => normalized.includes(matcher)),
);
return found ?? null;
};

const didUserCancel = (error: unknown): boolean => {
if (typeof error !== "object" || !error) return false;
const anyErr = error as Record<string, unknown>;
if (Boolean(anyErr.userCancelled)) return true;
const code = anyErr.code;
if (code === "1" || code === 1) return true;
if (typeof code === "string" && code.toLowerCase().includes("cancel")) return true;
if (typeof anyErr.message === "string" && anyErr.message.toLowerCase().includes("cancel")) {
  return true;
}
return false;
};

export const [RevenueCatProvider, useRevenueCat] = createContextHook<RevenueCatContextValue>(
() => {
  const isSupported = Platform.OS !== "web";

  const queryClient = useQueryClient();
  const [purchases, setPurchases] = useState<PurchasesInstance | null>(null);
  const [isConfigured, setIsConfigured] = useState<boolean>(false);
  const [configuredAppUserId, setConfiguredAppUserId] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [trialEligibility, setTrialEligibility] = useState<RevenueCatTrialEligibility>({});
  const [isInitializing, setIsInitializing] = useState<boolean>(false);
  const [isPaywallAvailable, setIsPaywallAvailable] = useState<boolean>(false);
  const [isCustomerCenterAvailable, setIsCustomerCenterAvailable] = useState<boolean>(false);

  const purchasesKeyPart = purchases ? "ready" : "not-ready";

  const initialize = useCallback(
    async (appUserId?: string | null) => {
      if (!isSupported) {
        setLastError("RevenueCat is unavailable on this platform.");
        return;
      }

      if (!REVENUECAT_API_KEY) {
        const message = "Missing EXPO_PUBLIC_REVENUECAT_API_KEY environment variable.";
        setLastError(message);
        return;
      }

      const normalizedUserId = appUserId ?? null;

      if (isConfigured && configuredAppUserId === normalizedUserId && purchases) {
        return;
      }

      setIsInitializing(true);

      try {
        console.log("[RevenueCat] initialize()", {
          platform: Platform.OS,
          appUserId: normalizedUserId,
          hasApiKey: Boolean(REVENUECAT_API_KEY),
          apiKeyLength: REVENUECAT_API_KEY ? REVENUECAT_API_KEY.length : 0,
        });

        await configureRevenueCat(normalizedUserId ?? undefined);

        const loadedPurchases = await getPurchases();
        if (!loadedPurchases) {
          setLastError("RevenueCat native module unavailable.");
          setIsConfigured(false);
          setPurchases(null);
          setIsPaywallAvailable(false);
          setIsCustomerCenterAvailable(false);
          return;
        }

        setPurchases(loadedPurchases);

        try {
          if (typeof loadedPurchases.setAttributes === "function") {
            await loadedPurchases.setAttributes({ app_build: "expo" });
          }
        } catch (e) {
          console.log("[RevenueCat] setAttributes skipped", {
            message: (e as Error)?.message,
          });
        }

        const withUI = loadedPurchases as PurchasesWithUI;
        setIsPaywallAvailable(typeof withUI.presentPaywall === "function");
        setIsCustomerCenterAvailable(typeof withUI.presentCustomerCenter === "function");
        setIsConfigured(true);
        setConfiguredAppUserId(normalizedUserId);
        setLastError(null);
      } catch (error) {
        const message = (error as Error)?.message ?? "Failed to configure RevenueCat";
        setLastError(message);
        setIsConfigured(false);
        setPurchases(null);
        setIsPaywallAvailable(false);
        setIsCustomerCenterAvailable(false);
      } finally {
        setIsInitializing(false);
      }
    },
    [configuredAppUserId, isConfigured, isSupported, purchases],
  );

  useEffect(() => {
    if (!isSupported) return;
    initialize().catch(() => {});
  }, [initialize, isSupported]);

  useEffect(() => {
    if (!isSupported || !isConfigured || !purchases) return;
    const listener: CustomerInfoUpdateListener = (info) => {
      queryClient.setQueryData(["revenuecat", "customer-info", purchasesKeyPart], info);
    };
    try {
      purchases.addCustomerInfoUpdateListener(listener);
    } catch (e) {
      console.log("[RevenueCat] addCustomerInfoUpdateListener failed", {
        message: (e as Error)?.message,
      });
    }
    return () => {
      try {
        if (typeof purchases.removeCustomerInfoUpdateListener === "function") {
          purchases.removeCustomerInfoUpdateListener(listener);
        }
      } catch {
        return;
      }
    };
  }, [isConfigured, isSupported, queryClient, purchases, purchasesKeyPart]);

  const {
    data: offeringsData,
    refetch: refetchOfferings,
    isLoading: isOfferingsLoading,
  } = useQuery<PurchasesOfferings | undefined>({
    queryKey: ["revenuecat", "offerings", purchasesKeyPart],
    enabled: isSupported,
    queryFn: async () => {
      await initialize();
      const loadedPurchases = await getPurchases();
      if (!loadedPurchases) return undefined;
      console.log("[RevenueCat] getOfferings()...");
      const offerings = await loadedPurchases.getOfferings();
      console.log("[RevenueCat] getOfferings() result", {
        current: offerings?.current?.identifier,
        all: offerings?.all ? Object.keys(offerings.all) : [],
      });
      return offerings;
    },
    staleTime: 300000,
  });

  const {
    data: customerInfo,
    refetch: refetchCustomerInfo,
    isLoading: isCustomerInfoLoading,
  } = useQuery<CustomerInfo | undefined>({
    queryKey: ["revenuecat", "customer-info", purchasesKeyPart],
    enabled: isSupported,
    queryFn: async () => {
      await initialize();
      const loadedPurchases = await getPurchases();
      if (!loadedPurchases) return undefined;
      console.log("[RevenueCat] getCustomerInfo()...");
      const info = await loadedPurchases.getCustomerInfo();
      console.log("[RevenueCat] getCustomerInfo() result", {
        activeEntitlements: info?.entitlements?.active ? Object.keys(info.entitlements.active) : [],
        activeSubscriptions: info?.activeSubscriptions?.length ?? 0,
      });
      return info;
    },
    refetchInterval: 60000,
  });

  const currentOffering = useMemo(() => {
    if (!offeringsData) return null;
    if (offeringsData.all?.[PRIMARY_OFFERING_ID]) {
      return offeringsData.all[PRIMARY_OFFERING_ID] ?? null;
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
      offering?.availablePackages.forEach((pkg: PurchasesPackage) => fallback.push(pkg));
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
    if (!isSupported || !isConfigured || !availablePackages.length) return;

    const identifiers = Array.from(
      new Set(
        availablePackages
          .map((pkg) => pkg.product.identifier)
          .filter((identifier): identifier is string => Boolean(identifier)),
      ),
    );

    if (!identifiers.length) return;

    let isCancelled = false;

    (async () => {
      const loadedPurchases = await getPurchases();
      if (!loadedPurchases) return;
      try {
        const result = (await loadedPurchases.checkTrialOrIntroductoryPriceEligibility(
          identifiers,
        )) as RevenueCatTrialEligibility;
        if (!isCancelled) {
          setTrialEligibility(result);
        }
      } catch {
        return;
      }
    })();

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

  const { mutateAsync: purchasePackageAsync, isPending: isPurchasePending } = useMutation({
    mutationFn: async (pkg: PurchasesPackage) => {
      await initialize();
      const loadedPurchases = await getPurchases();
      if (!loadedPurchases) throw new Error("RevenueCat unavailable");
      const { customerInfo: info } = await loadedPurchases.purchasePackage(pkg);
      return info as CustomerInfo;
    },
    onSuccess: (info) => {
      queryClient.setQueryData(["revenuecat", "customer-info", purchasesKeyPart], info);
      setLastError(null);
    },
    onError: (err) => {
      if (didUserCancel(err)) {
        return;
      }
      setLastError((err as Error).message ?? "Purchase failed");
    },
  });

  const { mutateAsync: restorePurchasesAsync, isPending: isRestorePending } = useMutation({
    mutationFn: async () => {
      await initialize();
      const loadedPurchases = await getPurchases();
      if (!loadedPurchases) throw new Error("RevenueCat unavailable");
      return loadedPurchases.restorePurchases();
    },
    onSuccess: (info) => {
      queryClient.setQueryData(["revenuecat", "customer-info", purchasesKeyPart], info);
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
    return (info as CustomerInfo | undefined) ?? null;
  }, [initialize, refetchCustomerInfo, restorePurchasesAsync]);

  const refreshOfferings = useCallback(async () => {
    await initialize();
    await refetchOfferings();
  }, [initialize, refetchOfferings]);

  const refreshCustomerInfo = useCallback(async () => {
    await initialize();
    const loadedPurchases = await getPurchases();
    if (!loadedPurchases) return;
    if (typeof loadedPurchases.invalidateCustomerInfoCache === "function") {
      await loadedPurchases.invalidateCustomerInfoCache();
    }
    await refetchCustomerInfo();
  }, [initialize, refetchCustomerInfo]);

  const presentPaywall = useCallback(
    async (options?: RevenueCatPaywallOptions) => {
      await initialize();
      const loadedPurchases = (await getPurchases()) as PurchasesWithUI | null;
      if (!loadedPurchases || typeof loadedPurchases.presentPaywall !== "function") {
        setLastError("RevenueCat paywalls are not available on this platform.");
        return null;
      }
      try {
        const result = await loadedPurchases.presentPaywall({
          offeringIdentifier: options?.offeringIdentifier ?? PRIMARY_OFFERING_ID,
          placementIdentifier: options?.placementIdentifier,
          displayCloseButton: options?.displayCloseButton ?? true,
        });
        if (result?.customerInfo) {
          queryClient.setQueryData(["revenuecat", "customer-info", purchasesKeyPart], result.customerInfo);
          setLastError(null);
        }
        return result;
      } catch (error) {
        const message = (error as Error)?.message ?? "Unable to present RevenueCat paywall";
        setLastError(message);
        return null;
      }
    },
    [initialize, queryClient, purchasesKeyPart],
  );

  const presentCustomerCenter = useCallback(async () => {
    await initialize();
    const loadedPurchases = (await getPurchases()) as PurchasesWithUI | null;
    if (!loadedPurchases || typeof loadedPurchases.presentCustomerCenter !== "function") {
      setLastError("Customer Center is not available on this platform.");
      return null;
    }
    try {
      const result = await loadedPurchases.presentCustomerCenter();
      if (result?.customerInfo) {
        queryClient.setQueryData(["revenuecat", "customer-info", purchasesKeyPart], result.customerInfo);
        setLastError(null);
      }
      return result;
    } catch (error) {
      const message = (error as Error)?.message ?? "Unable to open Customer Center";
      setLastError(message);
      return null;
    }
  }, [initialize, queryClient, purchasesKeyPart]);

  const isEntitledToPro = useMemo(
    () => Boolean(customerInfo?.entitlements?.active?.[ENTITLEMENT_ID]),
    [customerInfo],
  );

  const isLoading =
    (isSupported && !isConfigured) || isOfferingsLoading || isCustomerInfoLoading || isInitializing;

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
},
);