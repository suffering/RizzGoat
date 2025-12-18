import { useState, useEffect, useCallback } from "react";
import { Platform } from "react-native";
import createContextHook from "@nkzw/create-context-hook";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface PurchasesPackage {
  identifier: string;
  packageType: string;
  product: {
    identifier: string;
    title: string;
    description: string;
    priceString: string;
    price: number;
    currencyCode: string;
  };
}

interface Offering {
  identifier: string;
  serverDescription: string;
  availablePackages: PurchasesPackage[];
  weekly?: PurchasesPackage;
  monthly?: PurchasesPackage;
  annual?: PurchasesPackage;
  lifetime?: PurchasesPackage;
}

interface OfferingsResponse {
  current: Offering | null;
}

interface CustomerInfo {
  entitlements: {
    active: Record<string, {
      identifier: string;
      isActive: boolean;
      willRenew: boolean;
      expirationDate: string | null;
    }>;
  };
  activeSubscriptions: string[];
}

const REVENUECAT_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY || "";

const FALLBACK_PRICES = {
  weekly: { price: 4.99, priceString: "$4.99" },
  monthly: { price: 9.99, priceString: "$9.99" },
  lifetime: { price: 29.99, priceString: "$29.99" },
};

export const [RevenueCatProvider, useRevenueCat] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [isConfigured, setIsConfigured] = useState(false);
  const [Purchases, setPurchases] = useState<any>(null);

  useEffect(() => {
    const initRevenueCat = async () => {
      if (Platform.OS === "web") {
        console.log("RevenueCat: Web platform detected, using fallback prices");
        setIsConfigured(true);
        return;
      }

      if (!REVENUECAT_API_KEY) {
        console.log("RevenueCat: No API key found, using fallback prices");
        setIsConfigured(true);
        return;
      }

      try {
        const PurchasesModule = await import("react-native-purchases");
        const PurchasesDefault = PurchasesModule.default;
        
        console.log("RevenueCat: Configuring with API key...");
        await PurchasesDefault.configure({ apiKey: REVENUECAT_API_KEY });
        setPurchases(PurchasesDefault);
        setIsConfigured(true);
        console.log("RevenueCat: Configuration successful");
      } catch (error) {
        console.log("RevenueCat: Configuration failed", error);
        setIsConfigured(true);
      }
    };

    initRevenueCat();
  }, []);

  const offeringsQuery = useQuery({
    queryKey: ["revenuecat-offerings", !!Purchases],
    queryFn: async (): Promise<OfferingsResponse | null> => {
      if (Platform.OS === "web" || !Purchases) {
        console.log("RevenueCat: Returning null offerings (web or no Purchases)");
        return null;
      }

      try {
        console.log("RevenueCat: Fetching offerings...");
        const offerings = await Purchases.getOfferings();
        console.log("RevenueCat: Raw offerings:", JSON.stringify(offerings, null, 2));

        const current = (offerings?.current ?? null) as Offering | null;

        if (current) {
          console.log("RevenueCat: Current offering:", current.identifier);
          console.log(
            "RevenueCat: Available packages count:",
            current.availablePackages?.length || 0,
          );

          if (current.availablePackages?.length) {
            current.availablePackages.forEach((pkg: PurchasesPackage, idx: number) => {
              console.log(
                `RevenueCat: Package ${idx}:`,
                pkg.identifier,
                pkg.packageType,
                pkg.product.priceString,
              );
            });
          }

          return { current };
        }

        console.log("RevenueCat: No current offering found");
        return { current: null };
      } catch (error) {
        console.log("RevenueCat: Error fetching offerings", error);
        return null;
      }
    },
    enabled: isConfigured,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });

  const customerInfoQuery = useQuery({
    queryKey: ["revenuecat-customer-info", !!Purchases],
    queryFn: async (): Promise<CustomerInfo | null> => {
      if (Platform.OS === "web" || !Purchases) {
        return null;
      }

      try {
        console.log("RevenueCat: Fetching customer info...");
        const customerInfo = await Purchases.getCustomerInfo();
        console.log("RevenueCat: Customer info received", JSON.stringify(customerInfo, null, 2));
        return customerInfo as CustomerInfo;
      } catch (error) {
        console.log("RevenueCat: Error fetching customer info", error);
        return null;
      }
    },
    enabled: isConfigured,
    staleTime: 60 * 1000,
  });

  const purchaseMutation = useMutation({
    mutationFn: async (packageToPurchase: PurchasesPackage) => {
      if (Platform.OS === "web" || !Purchases) {
        throw new Error("Purchases not available on web");
      }

      console.log("RevenueCat: Purchasing package", packageToPurchase.identifier);
      const { customerInfo } = await Purchases.purchasePackage(packageToPurchase);
      return customerInfo as CustomerInfo;
    },
    onSuccess: (customerInfo) => {
      console.log("RevenueCat: Purchase successful");
      queryClient.setQueryData(["revenuecat-customer-info"], customerInfo);
    },
    onError: (error: any) => {
      console.log("RevenueCat: Purchase failed", error);
      if (error.userCancelled) {
        console.log("RevenueCat: User cancelled purchase");
      }
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async () => {
      if (Platform.OS === "web" || !Purchases) {
        throw new Error("Restore not available on web");
      }

      console.log("RevenueCat: Restoring purchases...");
      const customerInfo = await Purchases.restorePurchases();
      return customerInfo as CustomerInfo;
    },
    onSuccess: (customerInfo) => {
      console.log("RevenueCat: Restore successful");
      queryClient.setQueryData(["revenuecat-customer-info"], customerInfo);
    },
  });

  const findPackageByType = useCallback((packageType: "weekly" | "monthly" | "lifetime"): PurchasesPackage | null => {
    const offering = offeringsQuery.data?.current;
    if (!offering) return null;

    const packages = offering.availablePackages || [];
    console.log("RevenueCat: Searching for package type:", packageType, "in", packages.length, "packages");

    // Map our types to RevenueCat package type identifiers
    const rcPackageTypes: Record<string, string[]> = {
      weekly: ["$rc_weekly", "WEEKLY", "weekly"],
      monthly: ["$rc_monthly", "MONTHLY", "monthly"],
      lifetime: ["$rc_lifetime", "LIFETIME", "lifetime", "$rc_annual", "ANNUAL", "annual"],
    };

    const targetTypes = rcPackageTypes[packageType] || [];
    
    // Search through availablePackages
    for (const pkg of packages) {
      console.log("RevenueCat: Checking package:", pkg.identifier, pkg.packageType);
      
      // Match by packageType or identifier
      if (targetTypes.includes(pkg.packageType) || targetTypes.includes(pkg.identifier)) {
        console.log("RevenueCat: Found package match:", pkg.identifier);
        return pkg;
      }
      
      // Also check product identifier for lifetime
      if (packageType === "lifetime" && pkg.product.identifier.toLowerCase().includes("lifetime")) {
        console.log("RevenueCat: Found lifetime by product identifier:", pkg.product.identifier);
        return pkg;
      }
    }

    // Fallback to shortcut accessors
    const shortcutKey = packageType === "lifetime" ? "annual" : packageType;
    const shortcutPkg = offering[shortcutKey as keyof Offering] as PurchasesPackage | undefined;
    if (shortcutPkg) {
      console.log("RevenueCat: Found via shortcut:", shortcutKey);
      return shortcutPkg;
    }

    console.log("RevenueCat: No package found for type:", packageType);
    return null;
  }, [offeringsQuery.data]);

  const getPackagePrice = useCallback((packageType: "weekly" | "monthly" | "lifetime") => {
    const pkg = findPackageByType(packageType);
    
    if (pkg) {
      return {
        price: pkg.product.price,
        priceString: pkg.product.priceString,
        currencyCode: pkg.product.currencyCode,
      };
    }
    
    return {
      price: FALLBACK_PRICES[packageType].price,
      priceString: FALLBACK_PRICES[packageType].priceString,
      currencyCode: "USD",
    };
  }, [findPackageByType]);

  const getPackage = useCallback((packageType: "weekly" | "monthly" | "lifetime"): PurchasesPackage | null => {
    return findPackageByType(packageType);
  }, [findPackageByType]);

  const hasActiveEntitlement = useCallback((entitlementId: string = "pro"): boolean => {
    const customerInfo = customerInfoQuery.data;
    if (!customerInfo) return false;
    
    return !!customerInfo.entitlements.active[entitlementId]?.isActive;
  }, [customerInfoQuery.data]);

  const hasAnyActiveSubscription = useCallback((): boolean => {
    const customerInfo = customerInfoQuery.data;
    if (!customerInfo) return false;
    
    return customerInfo.activeSubscriptions.length > 0;
  }, [customerInfoQuery.data]);

  return {
    isConfigured,
    isLoading: offeringsQuery.isLoading || customerInfoQuery.isLoading,
    offerings: offeringsQuery.data?.current ?? null,
    offeringsResponse: offeringsQuery.data,
    availablePackages: offeringsQuery.data?.current?.availablePackages ?? [],
    customerInfo: customerInfoQuery.data,
    
    getPackagePrice,
    getPackage,
    hasActiveEntitlement,
    hasAnyActiveSubscription,
    
    purchase: purchaseMutation.mutateAsync,
    isPurchasing: purchaseMutation.isPending,
    purchaseError: purchaseMutation.error,
    
    restore: restoreMutation.mutateAsync,
    isRestoring: restoreMutation.isPending,
    
    refetchOfferings: offeringsQuery.refetch,
    refetchCustomerInfo: customerInfoQuery.refetch,
  };
});
