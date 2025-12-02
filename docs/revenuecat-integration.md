# RevenueCat + Expo Integration Guide for RizzGoat

This guide walks through installing RevenueCat, configuring the SDK with your `test_rtpJYQRunpmnybPXjhHVzzuWZwy` API key, wiring subscriptions (Weekly, Monthly, Yearly), checking the **RizzGoat Pro** entitlement, presenting the RevenueCat Paywall + Customer Center, and handling purchases in a production-ready way.

> **Expo Go limitation:** RevenueCat requires native modules, so you must run a custom development build (EAS dev client) or a full production build. Expo Go alone cannot load the SDK. All commands below assume you are inside `/home/user/rork-app`.

---

## 1. Install the SDK

```bash
npm install --save react-native-purchases react-native-purchases-ui
npx expo install react-native-purchases react-native-purchases-ui
npx expo prebuild --clean # required once so native modules are added
npx expo run:ios --device # or run:android for custom dev client testing
```

Keep `react-native-purchases` and `react-native-purchases-ui` versions aligned with the RevenueCat changelog. Run `npx pod-install` after prebuild for iOS.

---

## 2. Configure API keys + environment

Add platform-specific keys (for now you only have a single test key):

```bash
npx expo env:edit
```

```ini
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=test_rtpJYQRunpmnybPXjhHVzzuWZwy
EXPO_PUBLIC_REVENUECAT_IOS_KEY=test_rtpJYQRunpmnybPXjhHVzzuWZwy
EXPO_PUBLIC_REVENUECAT_ENTITLEMENT=RizzGoat Pro
```

Never hardcode secrets in source. Reading through `process.env` keeps you aligned with Expo Router + web compatibility.

---

## 3. Create a strongly typed RevenueCat service

Create `services/revenuecat.ts`:

```ts
import { Alert, Platform } from "react-native";
import Purchases, {
  CUSTOMER_INFO_UPDATED,
  CustomerInfo,
  PurchasesOffering,
  PurchasesPackage,
  PurchasesTransaction,
} from "react-native-purchases";
import {
  RevenueCatPaywall,
  RevenueCatCustomerCenter,
} from "react-native-purchases-ui";

const PRO_ENTITLEMENT = process.env.EXPO_PUBLIC_REVENUECAT_ENTITLEMENT ?? "RizzGoat Pro";
const API_KEY = Platform.select({
  ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY,
  android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY,
  default: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY,
});

type PurchaseResult = {
  customerInfo: CustomerInfo;
  transaction?: PurchasesTransaction;
};

export const WEEKLY_ID = "weekly";
export const MONTHLY_ID = "monthly";
export const YEARLY_ID = "yearly";

export async function initializeRevenueCat(appUserID?: string) {
  if (!API_KEY) {
    throw new Error("RevenueCat API key missing");
  }

  await Purchases.configure({
    apiKey: API_KEY,
    appUserID,
    logLevel: Purchases.LOG_LEVEL.DEBUG,
  });
}

export function isPro(customerInfo?: CustomerInfo | null) {
  return Boolean(customerInfo?.entitlements.active[PRO_ENTITLEMENT]);
}

export async function getCustomerInfo() {
  try {
    return await Purchases.getCustomerInfo();
  } catch (error) {
    console.error("RevenueCat getCustomerInfo error", error);
    throw error;
  }
}

export async function getOfferings() {
  try {
    return await Purchases.getOfferings();
  } catch (error) {
    console.error("RevenueCat getOfferings error", error);
    throw error;
  }
}

export async function purchasePackage(selected: PurchasesPackage): Promise<PurchaseResult> {
  try {
    const result = await Purchases.purchasePackage(selected);
    return result;
  } catch (error: unknown) {
    if (Purchases.isPurchaseCancelledError(error)) {
      console.log("User cancelled RevenueCat purchase");
      throw error;
    }
    console.error("RevenueCat purchasePackage error", error);
    Alert.alert("Purchase failed", "Please try again in a few seconds.");
    throw error;
  }
}

export async function presentPaywall(placementId = "default") {
  try {
    const result = await RevenueCatPaywall.presentPaywall({ placementId });
    return result.customerInfo;
  } catch (error) {
    console.error("RevenueCat paywall error", error);
    throw error;
  }
}

export async function showCustomerCenter() {
  try {
    await RevenueCatCustomerCenter.presentCustomerCenter();
  } catch (error) {
    console.error("RevenueCat customer center error", error);
    throw error;
  }
}

export function addCustomerInfoListener(callback: (customerInfo: CustomerInfo) => void) {
  const remove = Purchases.addCustomerInfoUpdateListener(callback);
  return () => remove();
}

export function addEventsListener(callback: (event: typeof CUSTOMER_INFO_UPDATED) => void) {
  const remove = Purchases.addListener(callback);
  return () => remove();
}
```

This service centralizes entitlement checks, offerings, purchases, paywall presentation, and Customer Center access with consistent error handling + logging.

---

## 4. Build a RevenueCat provider using `@nkzw/create-context-hook`

Inside `providers/RevenueCatProvider.tsx`:

```ts
import { useCallback, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import createContextHook from "@nkzw/create-context-hook";
import type { CustomerInfo, PurchasesPackage } from "react-native-purchases";
import {
  getCustomerInfo,
  getOfferings,
  initializeRevenueCat,
  isPro,
  presentPaywall,
  purchasePackage,
  showCustomerCenter,
} from "@/services/revenuecat";

const [RevenueCatProvider, useRevenueCat] = createContextHook(() => {
  const queryClient = useQueryClient();

  const customerInfoQuery = useQuery({
    queryKey: ["revenuecat", "customerInfo"],
    queryFn: getCustomerInfo,
    staleTime: 1000 * 60,
  });

  const offeringsQuery = useQuery({
    queryKey: ["revenuecat", "offerings"],
    queryFn: getOfferings,
    staleTime: 1000 * 60,
  });

  useEffect(() => {
    initializeRevenueCat().catch((error) => {
      console.error("RevenueCat init failed", error);
    });
  }, []);

  useEffect(() => {
    const remove = Purchases.addCustomerInfoUpdateListener((info) => {
      queryClient.setQueryData(["revenuecat", "customerInfo"], info);
    });
    return () => remove();
  }, [queryClient]);

  const purchaseMutation = useMutation({
    mutationFn: (selected: PurchasesPackage) => purchasePackage(selected),
    onSuccess: ({ customerInfo }) => {
      queryClient.setQueryData(["revenuecat", "customerInfo"], customerInfo);
    },
  });

  const paywallMutation = useMutation({
    mutationFn: () => presentPaywall(),
    onSuccess: (customerInfo) => {
      queryClient.setQueryData(["revenuecat", "customerInfo"], customerInfo);
    },
  });

  const handlePurchase = useCallback(
    async (selected?: PurchasesPackage) => {
      if (!selected) return;
      await purchaseMutation.mutateAsync(selected);
    },
    [purchaseMutation]
  );

  const handlePaywall = useCallback(() => paywallMutation.mutateAsync(), [paywallMutation]);

  const handleCustomerCenter = useCallback(() => showCustomerCenter(), []);

  const activeEntitlement = isPro(customerInfoQuery.data);

  return {
    activeEntitlement,
    customerInfoQuery,
    offeringsQuery,
    purchaseMutation,
    paywallMutation,
    handlePurchase,
    handlePaywall,
    handleCustomerCenter,
  } satisfies RevenueCatContext;
});

export type RevenueCatContext = ReturnType<typeof useRevenueCat>;

export { RevenueCatProvider, useRevenueCat };
```

Finally wrap `RevenueCatProvider` inside `app/_layout.tsx` just below `AppStateProvider` so all screens can access subscription data.

---

## 5. Subscription UI example (Pro screen)

```tsx
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useRevenueCat } from "@/providers/RevenueCatProvider";

export function ProOfferings() {
  const { offeringsQuery, handlePurchase, handlePaywall, handleCustomerCenter, activeEntitlement } = useRevenueCat();
  const available = offeringsQuery.data?.current?.availablePackages ?? [];

  if (offeringsQuery.isLoading) {
    return <Text testID="offerings-loading">Loading...</Text>;
  }

  return (
    <View style={styles.container}>
      {available.map((pkg) => (
        <Pressable
          key={pkg.identifier}
          testID={`package-${pkg.identifier}`}
          style={styles.packageCard}
          onPress={() => handlePurchase(pkg)}
        >
          <Text style={styles.title}>{pkg.product.title}</Text>
          <Text style={styles.price}>{pkg.product.priceString}</Text>
          <Text style={styles.period}>{pkg.identifier}</Text>
        </Pressable>
      ))}

      <Pressable testID="paywall-button" style={styles.paywall} onPress={handlePaywall}>
        <Text style={styles.paywallLabel}>See full RizzGoat Pro paywall</Text>
      </Pressable>

      <Pressable testID="customer-center" style={styles.customerCenter} onPress={handleCustomerCenter}>
        <Text style={styles.customerCenterLabel}>Manage subscription</Text>
      </Pressable>

      {activeEntitlement && <Text style={styles.badge}>Unlocked: RizzGoat Pro</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  packageCard: {
    padding: 16,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  title: { fontSize: 16, fontWeight: "600" },
  price: { fontSize: 32, fontWeight: "800" },
  period: { fontSize: 13, opacity: 0.6 },
  paywall: {
    padding: 16,
    borderRadius: 999,
    backgroundColor: "#b44bff",
    alignItems: "center",
  },
  paywallLabel: { color: "white", fontWeight: "700" },
  customerCenter: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    alignItems: "center",
  },
  customerCenterLabel: { color: "#fff" },
  badge: { marginTop: 8, color: "#a3ffb0", fontWeight: "600" },
});
```

---

## 6. Customer info + entitlement best practices

1. **Single source of truth** via React Query & provider ensures UI updates instantly when RevenueCat sends push updates.
2. **Always refresh customer info** after purchases or restore transactions.
3. Use `Purchases.logIn` / `Purchases.logOut` when the user signs in/out so RevenueCat can merge anonymous + identified histories.
4. Cache the last known entitlement in AsyncStorage if you need offline access, but still refresh on launch.

---

## 7. Product configuration inside RevenueCat dashboard

1. Create products in App Store / Play Store (`weekly`, `monthly`, `yearly`).
2. Inside RevenueCat dashboard create a single offering (e.g., `default`) with three packages referencing those identifiers.
3. Add the **RizzGoat Pro** entitlement and attach all packages to it. This ensures unlocking any package grants the same entitlement the app expects.
4. Optionally configure paywall JSON/remote paywall design from the dashboard so `RevenueCatPaywall.presentPaywall` automatically renders the card stack.

---

## 8. Handling restore & logout

```ts
export async function restorePurchases() {
  const info = await Purchases.restorePurchases();
  return info;
}

export async function logIn(userId: string) {
  const { customerInfo } = await Purchases.logIn(userId);
  return customerInfo;
}

export async function logOut() {
  await Purchases.logOut();
}
```

Add buttons in Settings so users can restore past purchases or disconnect from a device.

---

## 9. RevenueCat Customer Center

Include a shortcut anywhere paid users manage subscriptions:

```ts
import { useRevenueCat } from "@/providers/RevenueCatProvider";

const { handleCustomerCenter } = useRevenueCat();

<Pressable onPress={handleCustomerCenter} testID="customer-center">
  <Text>Manage subscription</Text>
</Pressable>
```

Customer Center provides a native storefront for upgrades, downgrades, and cancel links without additional coding.

---

## 10. Error handling checklist

- Wrap all purchase calls inside `try/catch` and differentiate cancellation vs. real errors.
- Provide toast/alert feedback on network errors.
- Use `console.error` for debugging plus structured logs for analytics.
- Guard screens from rendering until offerings are loaded to avoid null references.

Following these steps delivers a production-ready RevenueCat integration with entitlements, paywall, and Customer Center support tailored to RizzGoat's Weekly, Monthly, and Yearly plans.
