import React, { useRef, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Alert,
  Platform,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  X,
  Check,
  Sparkles,
  Zap,
  Crown,
  Crown as CrownIcon,
  RotateCcw,
  Shield,
} from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import type { IntroEligibility, PurchasesPackage } from "react-native-purchases";
import { useTheme } from "@/providers/ThemeProvider";
import { useAppState } from "@/providers/AppStateProvider";
import { PlanProductId, useRevenueCat } from "@/providers/RevenueCatProvider";

const FEATURES = [
  { text: "Unlimited pickup lines", pro: true },
  { text: "Advanced screenshot analysis", pro: true },
  { text: "Priority AI responses", pro: true },
  { text: "Custom tone settings", pro: true },
  { text: "Save unlimited favorites", pro: true },
  { text: "Ad-free experience", pro: true },
  { text: "Early access to new features", pro: true },
  { text: "24/7 priority support", pro: true },
];

type PlanMeta = {
  id: PlanProductId;
  label: string;
  tag: string;
  periodLabel: string;
  description: string;
  gradient: readonly [string, string];
  badge: "sparkles" | "crown" | "zap";
  testID: string;
};

const PLAN_META: PlanMeta[] = [
  {
    id: "weekly",
    label: "Weekly Flex",
    tag: "FLEX",
    periodLabel: "per week",
    description: "Test new drops with max flexibility",
    gradient: ["#E3222B", "#FF7A59"],
    badge: "sparkles",
    testID: "plan-weekly",
  },
  {
    id: "monthly",
    label: "Monthly Momentum",
    tag: "POPULAR",
    periodLabel: "per month",
    description: "Balanced value for consistent rizz",
    gradient: ["#8B5CF6", "#A78BFA"],
    badge: "crown",
    testID: "plan-monthly",
  },
  {
    id: "lifetime",
    label: "Lifetime Elite",
    tag: "BEST VALUE",
    periodLabel: "one-time purchase",
    description: "Own the crown forever",
    gradient: ["#10B981", "#34D399"],
    badge: "zap",
    testID: "plan-lifetime",
  },
];

type PlanOption = {
  meta: PlanMeta;
  pkg: PurchasesPackage;
  trialStatus?: IntroEligibility["status"];
};

const isTrialEligible = (status?: IntroEligibility["status"]): boolean => {
  if (!status) return false;
  return `${status}`.toLowerCase().includes("eligible");
};

const isUserCancelledError = (error: unknown): boolean => {
  if (typeof error !== "object" || !error) return false;
  if ("userCancelled" in error && Boolean((error as Record<string, unknown>).userCancelled)) {
    return true;
  }
  if ("code" in error && (error as Record<string, unknown>).code === "1") {
    return true;
  }
  return false;
};

export default function ProScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { isTrialActive, subscribe } = useAppState();
  const {
    isLoading: isRevenueCatLoading,
    isPurchasing,
    lastError,
    refreshOfferings,
    getPackageForPlan,
    restore,
    presentPaywall,
    presentCustomerCenter,
    trialEligibility,
    isPaywallAvailable,
    isCustomerCenterAvailable,
    isEntitledToPro,
  } = useRevenueCat();

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const featuresAnim = useRef(new Animated.Value(0)).current;
  const autoPaywallShown = useRef(false);
  const [activePlanId, setActivePlanId] = useState<PlanProductId | null>(null);

  useEffect(() => {
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 3,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(featuresAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (autoPaywallShown.current) return;
      if (!isPaywallAvailable || isEntitledToPro) return;
      autoPaywallShown.current = true;
      presentPaywall({
        placementIdentifier: "pro_intro_auto",
        offeringIdentifier: "default",
        displayCloseButton: true,
      }).catch(() => {
        autoPaywallShown.current = false;
      });
    });
  }, [featuresAnim, isEntitledToPro, isPaywallAvailable, presentPaywall, scaleAnim]);

  useEffect(() => {
    refreshOfferings().catch(() => {});
  }, [refreshOfferings]);

  const planOptions = useMemo(() => {
    const options: PlanOption[] = [];
    PLAN_META.forEach((meta) => {
      const pkg = getPackageForPlan(meta.id);
      if (!pkg) return;
      const identifier = pkg.product.identifier ?? meta.id;
      const trialStatus = trialEligibility?.[identifier]?.status;
      options.push({ meta, pkg, trialStatus });
    });
    return options;
  }, [getPackageForPlan, trialEligibility]);

  const isPlansLoading = isRevenueCatLoading && planOptions.length === 0;

  const handleOpenPaywall = async () => {
    if (!isPaywallAvailable) {
      Alert.alert("Paywall unavailable", "Update the app to use the latest RevenueCat Paywall experience.");
      return;
    }
    try {
      if (Platform.OS !== "web") {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      const result = await presentPaywall({
        placementIdentifier: "pro_screen_cta",
        offeringIdentifier: "default",
        displayCloseButton: true,
      });
      if (result?.customerInfo?.entitlements?.active?.pro) {
        Alert.alert("Pro unlocked", "Your subscription is active.");
        if (router.canGoBack()) router.back();
        else router.replace("/");
      }
    } catch (error) {
      if (isUserCancelledError(error)) {
        return;
      }
      Alert.alert(
        "Unable to open paywall",
        (error as Error)?.message ?? lastError ?? "Please try again shortly.",
      );
    }
  };

  const handleSubscribe = async (plan: PlanProductId) => {
    try {
      setActivePlanId(plan);
      if (Platform.OS !== "web") {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      }
      await subscribe(plan);
      Alert.alert("Subscribed", "Your plan is now active.");
      if (router.canGoBack()) router.back();
      else router.replace("/");
    } catch (error) {
      if (isUserCancelledError(error)) {
        return;
      }
      Alert.alert(
        "Subscription failed",
        (error as Error)?.message ?? lastError ?? "Please try again.",
      );
    } finally {
      setActivePlanId(null);
    }
  };

  const handleRestore = async () => {
    try {
      if (Platform.OS !== "web") {
        await Haptics.selectionAsync();
      }
      await restore();
      Alert.alert("Restored", "Purchases restored successfully.");
    } catch (error) {
      if (isUserCancelledError(error)) {
        return;
      }
      Alert.alert(
        "Restore failed",
        (error as Error)?.message ?? lastError ?? "Please try again.",
      );
    }
  };

  const handleManageSubscription = async () => {
    if (!isCustomerCenterAvailable) {
      Alert.alert(
        "Customer Center unavailable",
        "Update the app to manage subscriptions directly in-app.",
      );
      return;
    }
    try {
      if (Platform.OS !== "web") {
        await Haptics.selectionAsync();
      }
      await presentCustomerCenter();
    } catch (error) {
      Alert.alert(
        "Customer Center",
        (error as Error)?.message ?? "Unable to open Customer Center.",
      );
    }
  };

  const renderBadgeIcon = (badge: PlanMeta["badge"]) => {
    if (badge === "sparkles") {
      return <Sparkles size={14} color="#FFFFFF" style={styles.planTagIcon} />;
    }
    if (badge === "crown") {
      return <Crown size={14} color="#FFFFFF" style={styles.planTagIcon} />;
    }
    return <Zap size={14} color="#FFFFFF" style={styles.planTagIcon} />;
  };

  const renderPlanButtonText = (planId: PlanProductId) => {
    if (isPurchasing && activePlanId === planId) return "Processing...";
    return "Continue";
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]} testID="pro-screen">
      <LinearGradient
        colors={["#0F0F10", "#1A1A1B"]}
        style={styles.bg}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      <LinearGradient
        colors={["rgba(227,34,43,0.25)", "rgba(255,122,89,0.1)"]}
        style={styles.topGlow}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => {
              if (router.canGoBack()) router.back();
              else router.replace("/");
            }}
            style={styles.closeButton}
            testID="pro-close"
          >
            <X size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Animated.View
            style={[styles.heroSection, { transform: [{ scale: scaleAnim }] }]}
            testID="pro-hero"
          >
            <View style={styles.brandRow}>
              <LinearGradient colors={["#E3222B", "#FF7A59"]} style={styles.brandBadge}>
                <CrownIcon size={18} color="#FFFFFF" />
              </LinearGradient>
              <Text style={styles.brandText}>RizzGoat Pro</Text>
            </View>
            <View style={styles.crownContainer}>
              <Crown size={64} color="#FFFFFF" />
              <Sparkles size={24} color="#FFFFFF" style={styles.sparkle1} />
              <Sparkles size={20} color="#FFFFFF" style={styles.sparkle2} />
            </View>
            <Text style={styles.title}>
              {isTrialActive ? "Choose your plan" : "Unlock the full experience"}
            </Text>
            <Text style={styles.subtitle}>
              RevenueCat pulls your live App Store offers so trials, promos, and local currencies show up instantly.
            </Text>
          </Animated.View>

          <Animated.View style={[styles.featuresSection, { opacity: featuresAnim }]}>
            {FEATURES.map((feature, index) => (
              <View key={index} style={styles.featureRow}>
                <View style={styles.checkContainer}>
                  <Check size={16} color="#10B981" />
                </View>
                <Text style={styles.featureText}>{feature.text}</Text>
              </View>
            ))}
          </Animated.View>

          <View style={styles.ctaSection}>
            <LinearGradient colors={["#E3222B", "#FF7A59"]} style={styles.ctaCard}>
              <Text style={styles.ctaTitle}>Start with a free trial</Text>
              <Text style={styles.ctaSubtitle}>
                Apple handles the introductory offer. Cancel anytime before it renews.
              </Text>
              <TouchableOpacity
                onPress={handleOpenPaywall}
                activeOpacity={0.9}
                style={styles.ctaButton}
                testID="open-paywall-btn"
              >
                <Text style={styles.ctaButtonText}>View live paywall</Text>
              </TouchableOpacity>
              <Text style={styles.ctaHelper}>Prices and promos load directly from RevenueCat.</Text>
            </LinearGradient>
          </View>

          <View style={styles.plansSection}>
            <View style={styles.plansHeader}>
              <Text style={styles.plansTitle}>Choose your plan</Text>
              <TouchableOpacity onPress={handleOpenPaywall} testID="open-paywall-inline">
                <Text style={styles.refreshLink}>Show universal paywall</Text>
              </TouchableOpacity>
            </View>

            {lastError && (
              <View style={styles.errorCard} testID="revenuecat-error">
                <Text style={styles.errorText}>{lastError}</Text>
              </View>
            )}

            {isPlansLoading && (
              <View style={styles.loadingCard} testID="plans-loading">
                <ActivityIndicator color="#FF7A59" />
                <Text style={styles.loadingText}>Loading live prices...</Text>
              </View>
            )}

            {!isPlansLoading && planOptions.length === 0 && (
              <View style={styles.emptyStateCard} testID="plans-empty">
                <Text style={styles.emptyTitle}>Products unavailable</Text>
                <Text style={styles.emptySubtitle}>
                  Tap refresh to pull them from RevenueCat now that the API key is set.
                </Text>
                <TouchableOpacity
                  style={styles.refreshButton}
                  onPress={refreshOfferings}
                  testID="refresh-offerings-btn"
                >
                  <Text style={styles.refreshButtonText}>Refresh products</Text>
                </TouchableOpacity>
              </View>
            )}

            {planOptions.map(({ meta, pkg, trialStatus }) => (
              <TouchableOpacity
                key={meta.id}
                onPress={() => handleSubscribe(meta.id)}
                style={[styles.planCard, meta.id === "lifetime" && styles.planCardHighlight]}
                activeOpacity={0.9}
                testID={meta.testID}
                disabled={isPurchasing}
                accessibilityState={{ disabled: isPurchasing }}
              >
                <View style={styles.planHeader}>
                  <Text style={styles.planName}>{pkg.product.title || meta.label}</Text>
                  <View
                    style={[
                      styles.planTag,
                      meta.badge === "zap" ? styles.planTagSuccess : styles.planTagAccent,
                    ]}
                  >
                    {renderBadgeIcon(meta.badge)}
                    <Text style={styles.planTagText}>{meta.tag}</Text>
                  </View>
                </View>
                <Text style={styles.planDescription}>{meta.description}</Text>
                <Text style={styles.planPrice}>{pkg.product.priceString}</Text>
                <Text style={styles.planPeriod}>{meta.periodLabel}</Text>
                {isTrialEligible(trialStatus) && (
                  <Text style={styles.planTrial}>Includes intro free trial</Text>
                )}
                <LinearGradient colors={[...meta.gradient]} style={styles.planButton}>
                  <Text style={styles.planButtonText}>{renderPlanButtonText(meta.id)}</Text>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.footerActions}>
            <TouchableOpacity
              style={styles.footerButton}
              onPress={handleRestore}
              disabled={isPurchasing}
              testID="restore-purchases-btn"
            >
              <RotateCcw size={16} color="#FFFFFF" style={styles.footerButtonIcon} />
              <Text style={styles.footerButtonText}>Restore purchases</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.footerButton, styles.footerButtonSecondary]}
              onPress={handleManageSubscription}
              testID="customer-center-btn"
            >
              <Shield size={16} color="#0F0F10" style={styles.footerButtonIcon} />
              <Text style={[styles.footerButtonText, styles.footerButtonTextDark]}>Manage subscription</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.terms}>
            • Free trials and promo pricing sync from RevenueCat offerings{"\n"}
            • Cancel anytime from Settings or Customer Center{"\n"}
            • Lifetime is a one-time purchase{"\n"}
            • Prices displayed in your local currency
          </Text>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  bg: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0 },
  topGlow: {
    position: "absolute",
    left: -60,
    right: -60,
    top: -40,
    height: 360,
    borderBottomLeftRadius: 300,
    borderBottomRightRadius: 300,
  },
  safeArea: { flex: 1 },
  header: { alignItems: "flex-end", paddingHorizontal: 20, paddingVertical: 16 },
  closeButton: { padding: 8 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  heroSection: { alignItems: "center", marginBottom: 32 },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 },
  brandBadge: { width: 34, height: 34, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  brandText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700", letterSpacing: 0.2 },
  crownContainer: { position: "relative", marginBottom: 18 },
  sparkle1: { position: "absolute", top: -10, right: -20 },
  sparkle2: { position: "absolute", bottom: -5, left: -15 },
  title: { fontSize: 28, fontWeight: "800", color: "#FFFFFF", textAlign: "center", marginBottom: 10 },
  subtitle: { fontSize: 14, color: "rgba(255, 255, 255, 0.9)", textAlign: "center" },
  featuresSection: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 20,
    padding: 20,
    marginTop: 18,
    marginBottom: 22,
  },
  featureRow: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  checkContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(16,185,129,0.12)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  featureText: { fontSize: 15, color: "#000000", flex: 1 },
  ctaSection: { marginBottom: 24 },
  ctaCard: { borderRadius: 20, padding: 24, alignItems: "center" },
  ctaTitle: { fontSize: 22, fontWeight: "800", color: "#FFFFFF", marginBottom: 6 },
  ctaSubtitle: { fontSize: 13, color: "#FFFFFF", opacity: 0.9, marginBottom: 14, textAlign: "center" },
  ctaButton: { backgroundColor: "#000000", paddingVertical: 14, paddingHorizontal: 18, borderRadius: 12 },
  ctaButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800", letterSpacing: 0.3 },
  ctaHelper: { marginTop: 10, color: "rgba(255,255,255,0.85)", fontSize: 12, textAlign: "center" },
  plansSection: { gap: 16, marginBottom: 24 },
  plansHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  plansTitle: { color: "#FFFFFF", fontSize: 18, fontWeight: "700" },
  refreshLink: { color: "#FF7A59", fontSize: 13, fontWeight: "600" },
  planCard: {
    backgroundColor: "rgba(255,255,255,0.96)",
    borderRadius: 20,
    padding: 24,
    position: "relative",
    marginBottom: 8,
  },
  planCardHighlight: { borderWidth: 2, borderColor: "#10B981" },
  planHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  planName: { fontSize: 20, fontWeight: "700", color: "#000000", flex: 1, marginRight: 12 },
  planTag: { flexDirection: "row", alignItems: "center", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  planTagIcon: { marginRight: 4 },
  planTagText: { color: "#FFFFFF", fontSize: 11, fontWeight: "700" },
  planTagAccent: { backgroundColor: "#E3222B" },
  planTagSuccess: { backgroundColor: "#10B981" },
  planDescription: { fontSize: 14, color: "rgba(0,0,0,0.7)", marginBottom: 12 },
  planPrice: { fontSize: 32, fontWeight: "800", color: "#000000", marginBottom: 2 },
  planPeriod: { fontSize: 14, color: "rgba(0,0,0,0.6)", marginBottom: 12 },
  planTrial: { fontSize: 12, color: "#059669", fontWeight: "600", marginBottom: 12 },
  planButton: { paddingVertical: 14, borderRadius: 12, alignItems: "center" },
  planButtonText: { fontSize: 16, fontWeight: "700", color: "#FFFFFF" },
  errorCard: {
    borderRadius: 16,
    backgroundColor: "rgba(227,34,43,0.15)",
    padding: 16,
  },
  errorText: { color: "#FFB4A6", fontSize: 13 },
  loadingCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    padding: 20,
    alignItems: "center",
  },
  loadingText: { marginTop: 12, color: "rgba(255,255,255,0.75)", fontSize: 14 },
  emptyStateCard: {
    borderRadius: 18,
    padding: 20,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
  },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#FFFFFF", marginBottom: 6 },
  emptySubtitle: { fontSize: 14, color: "rgba(255,255,255,0.75)", textAlign: "center", marginBottom: 16 },
  refreshButton: { borderRadius: 12, backgroundColor: "#FF7A59", paddingHorizontal: 20, paddingVertical: 10 },
  refreshButtonText: { color: "#FFFFFF", fontWeight: "700", fontSize: 14 },
  footerActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 18,
  },
  footerButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    paddingVertical: 14,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  footerButtonSecondary: {
    backgroundColor: "#FFFFFF",
  },
  footerButtonText: { color: "#FFFFFF", fontWeight: "700", fontSize: 13 },
  footerButtonTextDark: { color: "#0F0F10" },
  footerButtonIcon: { marginRight: 6 },
  terms: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
    textAlign: "center",
    lineHeight: 18,
  },
});
