import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
    PACKAGE_MATCHERS[plan].some((matcher) => normalized.includes(matcher))
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

export const [RevenueCatProvider, useRevenueCat] =
  createContextHook<RevenueCatContextValue>(() => {
    const isSupported = Platform.OS !== "web";
    const queryClient = useQueryClient();

    const [purchases, setPurchases] = useState<PurchasesInstance | null>(null);
    const [isConfigured, setIsConfigured] = useState(false);
    const [lastError, setLastError] = useState<string | null>(null);
    const [trialEligibility, setTrialEligibility] = useState<RevenueCatTrialEligibility>({});
    const [isInitializing, setIsInitializing] = useState(false);
    const [isPaywallAvailable, setIsPaywallAvailable] = useState(false);
    const [isCustomerCenterAvailable, setIsCustomerCenterAvailable] = useState(false);

    const initOnceRef = useRef(false);
    const purchasesKeyPart = purchases ? "ready" : "not-ready";

    const initialize = useCallback(
      async (appUserId?: string | null) => {
        if (!isSupported) return;
        if (!REVENUECAT_API_KEY) return;
        if (initOnceRef.current) return;

        initOnceRef.current = true;
        setIsInitializing(true);

        try {
          await configureRevenueCat(appUserId ?? undefined);

          const loadedPurchases = await getPurchases();
          if (!loadedPurchases) return;

          setPurchases(loadedPurchases);

          const withUI = loadedPurchases as PurchasesWithUI;
          setIsPaywallAvailable(typeof withUI.presentPaywall === "function");
          setIsCustomerCenterAvailable(
            typeof withUI.presentCustomerCenter === "function"
          );

          setIsConfigured(true);
          setLastError(null);
        } catch {
          setLastError("RevenueCat initialization failed");
        } finally {
          setIsInitializing(false);
        }
      },
      [isSupported]
    );

    useEffect(() => {
      if (!isSupported || !isConfigured || !purchases) return;
      const listener: CustomerInfoUpdateListener = (info) => {
        queryClient.setQueryData(["revenuecat", "customer-info", purchasesKeyPart], info);
      };
      (purchases as any).addCustomerInfoUpdateListener?.(listener);
      return () => {
        (purchases as any).removeCustomerInfoUpdateListener?.(listener);
      };
    }, [isConfigured, purchases, purchasesKeyPart, queryClient]);

    const { data: offeringsData, refetch: refetchOfferings, isLoading: isOfferingsLoading } =
      useQuery({
        queryKey: ["revenuecat", "offerings", purchasesKeyPart],
        enabled: isConfigured,
        queryFn: async () => {
          const p = await getPurchases();
          return p?.getOfferings?.();
        },
        staleTime: 300000,
      });

    const {
      data: customerInfo,
      refetch: refetchCustomerInfo,
      isLoading: isCustomerInfoLoading,
    } = useQuery({
      queryKey: ["revenuecat", "customer-info", purchasesKeyPart],
      enabled: isConfigured,
      queryFn: async () => {
        const p = await getPurchases();
        return p?.getCustomerInfo?.();
      },
      refetchInterval: 60000,
    });

    const currentOffering = useMemo(() => {
      if (!offeringsData) return null;
      return offeringsData.all?.[PRIMARY_OFFERING_ID] ?? offeringsData.current ?? null;
    }, [offeringsData]);

    const availablePackages = useMemo(
      () => currentOffering?.availablePackages ?? [],
      [currentOffering]
    );

    const packagesByPlan = useMemo(() => {
      const initial: Record<PlanProductId, PurchasesPackage | null> = {
        weekly: null,
        monthly: null,
        lifetime: null,
      };
      availablePackages.forEach((pkg) => {
        const plan = getPlanFromIdentifier(pkg.product.identifier);
        if (plan && !initial[plan]) initial[plan] = pkg;
      });
      return initial;
    }, [availablePackages]);

    const getPackageForPlan = useCallback(
      (plan: PlanProductId) => packagesByPlan[plan] ?? null,
      [packagesByPlan]
    );

    const isEntitledToPro = useMemo(
      () => Boolean(customerInfo?.entitlements?.active?.[ENTITLEMENT_ID]),
      [customerInfo]
    );

    const isLoading =
      (isSupported && !isConfigured) || isOfferingsLoading || isCustomerInfoLoading || isInitializing;

    return {
      isSupported,
      isConfigured,
      isLoading,
      isPurchasing: false,
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
      refreshOfferings: refetchOfferings,
      refreshCustomerInfo: refetchCustomerInfo,
      purchasePlan: async () => null,
      restore: async () => null,
      getPackageForPlan,
      presentPaywall: async () => null,
      presentCustomerCenter: async () => null,
    };
  });
