import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Platform } from "react-native";
import createContextHook from "@nkzw/create-context-hook";
import type PurchasesType from "react-native-purchases";
import type {
  CustomerInfo,
  PurchasesOfferings,
  PurchasesPackage,
} from "react-native-purchases";
import { REVENUECAT_API_KEY } from "@/config/secrets";

const ENTITLEMENT_ID = "RizzGoat Pro";
const PRODUCT_MAP = {
  weekly: "rizzgoat.weekly",
  monthly: "rizzgoat.monthly",
  yearly: "rizzgoat.yearly",
} as const;
const PRODUCT_ORDER = ["weekly", "monthly", "yearly"] as const;

type RevenueCatProductId = keyof typeof PRODUCT_MAP;

type PurchasesModule = typeof PurchasesType;

type CustomerInfoListener = Parameters<PurchasesModule["addCustomerInfoUpdateListener"]>[0];

interface NormalizedPackage {
  id: RevenueCatProductId;
  title: string;
  badge?: string;
  price: string;
  periodLabel: string;
  description?: string;
  rcIdentifier?: string | null;
}

interface RevenueCatContextValue {
  isSupported: boolean;
  isConfigured: boolean;
  initializing: boolean;
  customerInfo: CustomerInfo | null;
  customerInfoError: string | null;
  offeringsError: string | null;
  offeringsLoading: boolean;
  customerInfoLoading: boolean;
  packages: Record<RevenueCatProductId, NormalizedPackage>;
  purchasingProduct: RevenueCatProductId | null;
  purchaseError: string | null;
  entitlementActive: boolean;
  entitlementId: string;
  refreshCustomerInfo: () => Promise<void>;
  refreshOfferings: () => Promise<void>;
  purchaseProduct: (productId: RevenueCatProductId) => Promise<void>;
  restorePurchases: () => Promise<CustomerInfo | void>;
  presentCustomerCenter: () => Promise<void>;
}

const DEFAULT_PACKAGES: Record<RevenueCatProductId, NormalizedPackage> = {
  weekly: {
    id: "weekly",
    title: "Weekly",
    badge: "FLEX",
    price: "$0.00",
    periodLabel: "per week",
    description: "Cancel anytime",
    rcIdentifier: null,
  },
  monthly: {
    id: "monthly",
    title: "Monthly",
    badge: "POPULAR",
    price: "$0.00",
    periodLabel: "per month",
    description: "Best for regular use",
    rcIdentifier: null,
  },
  yearly: {
    id: "yearly",
    title: "Annual",
    badge: "BEST VALUE",
    price: "$0.00",
    periodLabel: "per year",
    description: "Save more with annual",
    rcIdentifier: null,
  },
};

const packageRefInit: Record<RevenueCatProductId, PurchasesPackage | null> = {
  weekly: null,
  monthly: null,
  yearly: null,
};

export const [RevenueCatProvider, useRevenueCat] = createContextHook<RevenueCatContextValue>(() => {
  const [isConfigured, setIsConfigured] = useState<boolean>(false);
  const [initializing, setInitializing] = useState<boolean>(false);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [customerInfoError, setCustomerInfoError] = useState<string | null>(null);
  const [offeringsError, setOfferingsError] = useState<string | null>(null);
  const [offeringsLoading, setOfferingsLoading] = useState<boolean>(false);
  const [customerInfoLoading, setCustomerInfoLoading] = useState<boolean>(false);
  const [packages, setPackages] = useState<Record<RevenueCatProductId, NormalizedPackage>>(DEFAULT_PACKAGES);
  const [purchasingProduct, setPurchasingProduct] = useState<RevenueCatProductId | null>(null);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const purchasesRef = useRef<PurchasesModule | null>(null);
  const listenerRef = useRef<CustomerInfoListener | null>(null);
  const packageRefs = useRef<Record<RevenueCatProductId, PurchasesPackage | null>>({ ...packageRefInit });

  const isSupported = Platform.OS !== "web";

  const ensurePurchasesModule = useCallback(async (): Promise<PurchasesModule | null> => {
    if (!isSupported) {
      return null;
    }
    if (purchasesRef.current) {
      return purchasesRef.current;
    }
    console.log("[RevenueCat] Loading Purchases module");
    const module = (await import("react-native-purchases")).default as PurchasesModule;
    purchasesRef.current = module;
    return module;
  }, [isSupported]);

  const hydratePackages = useCallback((offerings: PurchasesOfferings | null) => {
    if (!offerings?.current) {
      setPackages(DEFAULT_PACKAGES);
      packageRefs.current = { ...packageRefInit };
      return;
    }
    const nextPackages: Record<RevenueCatProductId, NormalizedPackage> = { ...DEFAULT_PACKAGES };
    const available = offerings.current.availablePackages ?? [];
    PRODUCT_ORDER.forEach((productId) => {
      const configuredId = PRODUCT_MAP[productId];
      const targetPackage = available.find((pkg) => {
        const storeIdentifier = pkg.product.identifier?.toLowerCase?.();
        if (storeIdentifier && storeIdentifier === configuredId.toLowerCase()) {
          return true;
        }
        if (pkg.identifier?.toLowerCase?.() === configuredId.toLowerCase()) {
          return true;
        }
        return pkg.packageType?.toLowerCase?.() === productId.toLowerCase();
      });
      packageRefs.current[productId] = targetPackage ?? null;
      nextPackages[productId] = {
        ...nextPackages[productId],
        price: targetPackage?.product.priceString ?? nextPackages[productId].price,
        periodLabel: targetPackage ? `per ${productId === "yearly" ? "year" : productId === "monthly" ? "month" : "week"}` : nextPackages[productId].periodLabel,
        description: targetPackage?.product.description ?? nextPackages[productId].description,
        rcIdentifier: targetPackage?.identifier ?? null,
      };
    });
    setPackages(nextPackages);
  }, []);

  const refreshCustomerInfo = useCallback(async () => {
    if (!isSupported) {
      setCustomerInfoError("RevenueCat is unavailable on web.");
      return;
    }
    const purchases = await ensurePurchasesModule();
    if (!purchases) {
      setCustomerInfoError("Purchases module missing.");
      return;
    }
    try {
      setCustomerInfoLoading(true);
      console.log("[RevenueCat] Fetching customer info");
      const info = await purchases.getCustomerInfo();
      setCustomerInfo(info);
      setCustomerInfoError(null);
    } catch (error) {
      console.log("[RevenueCat] Customer info error", error);
      setCustomerInfoError(error instanceof Error ? error.message : "Unable to fetch customer info.");
    } finally {
      setCustomerInfoLoading(false);
    }
  }, [ensurePurchasesModule, isSupported]);

  const refreshOfferings = useCallback(async () => {
    if (!isSupported) {
      setOfferingsError("RevenueCat is unavailable on web.");
      return;
    }
    const purchases = await ensurePurchasesModule();
    if (!purchases) {
      setOfferingsError("Purchases module missing.");
      return;
    }
    try {
      setOfferingsLoading(true);
      console.log("[RevenueCat] Fetching offerings");
      const latestOfferings = await purchases.getOfferings();
      hydratePackages(latestOfferings);
      setOfferingsError(null);
    } catch (error) {
      console.log("[RevenueCat] Offerings error", error);
      setOfferingsError(error instanceof Error ? error.message : "Unable to fetch offerings.");
    } finally {
      setOfferingsLoading(false);
    }
  }, [ensurePurchasesModule, hydratePackages, isSupported]);

  useEffect(() => {
    if (!isSupported) {
      return;
    }
    let isMounted = true;
    const configure = async () => {
      if (!REVENUECAT_API_KEY) {
        setOfferingsError("Missing RevenueCat API key.");
        return;
      }
      setInitializing(true);
      try {
        const purchases = await ensurePurchasesModule();
        if (!purchases) {
          return;
        }
        console.log("[RevenueCat] Configuring SDK");
        await purchases.configure({ apiKey: REVENUECAT_API_KEY });
        if (!isMounted) {
          return;
        }
        setIsConfigured(true);
        await Promise.all([refreshCustomerInfo(), refreshOfferings()]);
        const listener: CustomerInfoListener = (info) => {
          console.log("[RevenueCat] Customer info listener update");
          setCustomerInfo(info);
        };
        listenerRef.current = listener;
        purchases.addCustomerInfoUpdateListener(listener);
      } catch (error) {
        console.log("[RevenueCat] Configure error", error);
        setOfferingsError(error instanceof Error ? error.message : "RevenueCat configuration failed.");
      } finally {
        if (isMounted) {
          setInitializing(false);
        }
      }
    };
    configure();
    return () => {
      isMounted = false;
      if (listenerRef.current && purchasesRef.current) {
        purchasesRef.current.removeCustomerInfoUpdateListener(listenerRef.current);
        listenerRef.current = null;
      }
    };
  }, [ensurePurchasesModule, isSupported, refreshCustomerInfo, refreshOfferings]);

  const purchaseProduct = useCallback(async (productId: RevenueCatProductId) => {
    if (!isSupported) {
      setPurchaseError("RevenueCat purchases are unavailable on web.");
      throw new Error("Purchases unavailable on web");
    }
    const purchases = await ensurePurchasesModule();
    if (!purchases) {
      setPurchaseError("Purchases module missing.");
      throw new Error("Purchases module missing");
    }
    const pkg = packageRefs.current[productId];
    if (!pkg) {
      const message = "Package not configured in RevenueCat.";
      setPurchaseError(message);
      throw new Error(message);
    }
    try {
      setPurchasingProduct(productId);
      setPurchaseError(null);
      console.log("[RevenueCat] Purchasing", productId, pkg.identifier);
      const result = await purchases.purchasePackage(pkg);
      setCustomerInfo(result.customerInfo);
    } catch (error: unknown) {
      const cancelHelper = (purchases as PurchasesModule & { isCancelledPurchaseError?: (err: unknown) => boolean }).isCancelledPurchaseError;
      const isCancelled = typeof cancelHelper === "function" && cancelHelper(error);
      if (isCancelled) {
        console.log("[RevenueCat] Purchase cancelled", productId);
      } else {
        const message = error instanceof Error ? error.message : "Unable to complete purchase.";
        setPurchaseError(message);
        console.log("[RevenueCat] Purchase error", error);
        throw new Error(message);
      }
    } finally {
      setPurchasingProduct(null);
    }
  }, [ensurePurchasesModule, isSupported]);

  const restorePurchases = useCallback(async (): Promise<CustomerInfo | void> => {
    if (!isSupported) {
      throw new Error("Restore unavailable on web");
    }
    const purchases = await ensurePurchasesModule();
    if (!purchases) {
      throw new Error("Purchases module missing");
    }
    console.log("[RevenueCat] Restoring purchases");
    const info = await purchases.restorePurchases();
    setCustomerInfo(info);
    return info;
  }, [ensurePurchasesModule, isSupported]);

  const presentCustomerCenter = useCallback(async () => {
    if (!isSupported) {
      throw new Error("Customer Center unavailable on web");
    }
    const purchases = await ensurePurchasesModule();
    if (!purchases) {
      throw new Error("Purchases module missing");
    }
    const customerCenterFn = (purchases as PurchasesModule & { presentCustomerCenter?: () => Promise<void> }).presentCustomerCenter;
    if (!customerCenterFn) {
      throw new Error("Update the RevenueCat SDK to use Customer Center.");
    }
    console.log("[RevenueCat] Presenting Customer Center");
    await customerCenterFn();
  }, [ensurePurchasesModule, isSupported]);

  const entitlementActive = useMemo(() => {
    const active = customerInfo?.entitlements?.active ?? {};
    return Boolean(active[ENTITLEMENT_ID]);
  }, [customerInfo]);

  const value: RevenueCatContextValue = {
    isSupported,
    isConfigured,
    initializing,
    customerInfo,
    customerInfoError,
    offeringsError,
    offeringsLoading,
    customerInfoLoading,
    packages,
    purchasingProduct,
    purchaseError,
    entitlementActive,
    entitlementId: ENTITLEMENT_ID,
    refreshCustomerInfo,
    refreshOfferings,
    purchaseProduct,
    restorePurchases,
    presentCustomerCenter,
  };

  return value;
});
