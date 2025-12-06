import React, { useRef, useEffect, useMemo, useCallback } from "react";
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
import { X, Check, Sparkles, Crown, Crown as CrownIcon } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/providers/ThemeProvider";
import { useAppState } from "@/providers/AppStateProvider";
import { useRevenueCat } from "@/providers/RevenueCatProvider";
import type { PlanProductId } from "@/providers/RevenueCatProvider";
import * as Haptics from "expo-haptics";

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

type SelectablePlan = Extract<PlanProductId, "weekly" | "monthly" | "yearly">;

const SELECTABLE_PLANS: SelectablePlan[] = ["weekly", "monthly", "yearly"];

const PLAN_CONFIG: Record<
  SelectablePlan,
  {
    badgeLabel: string;
    badgeColor: string;
    gradient: [string, string];
    periodLabel: string;
    supportText: string;
    testId: string;
  }
> = {
  weekly: {
    badgeLabel: "FLEX",
    badgeColor: "rgba(227,34,43,0.12)",
    gradient: ["#E3222B", "#FF7A59"],
    periodLabel: "per week",
    supportText: "Perfect when you only need bursts of Pro.",
    testId: "plan-weekly",
  },
  monthly: {
    badgeLabel: "POPULAR",
    badgeColor: "rgba(139,92,246,0.15)",
    gradient: ["#8B5CF6", "#A78BFA"],
    periodLabel: "per month",
    supportText: "Best mix of value and flexibility.",
    testId: "plan-monthly",
  },
  yearly: {
    badgeLabel: "BEST VALUE",
    badgeColor: "rgba(16,185,129,0.18)",
    gradient: ["#0EA5E9", "#14B8A6"],
    periodLabel: "per year",
    supportText: "Save big with 2 months free vs monthly.",
    testId: "plan-yearly",
  },
};

export default function ProScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { isTrialActive, startFreeTrial, subscribe } = useAppState();
  const {
    isSupported: isRevenueCatSupported,
    isLoading: isRevenueCatLoading,
    isPurchasing,
    lastError,
    refreshOfferings,
    restore,
    getPackageForPlan,
  } = useRevenueCat();

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const featuresAnim = useRef(new Animated.Value(0)).current;

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
    ]).start();
  }, [scaleAnim, featuresAnim]);

  const planPackages = useMemo(() => {
    return SELECTABLE_PLANS.reduce<Record<SelectablePlan, ReturnType<typeof getPackageForPlan>>>(
      (acc, plan) => {
        acc[plan] = getPackageForPlan(plan);
        return acc;
      },
      { weekly: null, monthly: null, yearly: null }
    );
  }, [getPackageForPlan]);

  const noProductsAvailable = SELECTABLE_PLANS.every((plan) => !planPackages[plan]);
  const disablePlanSelection = !isRevenueCatSupported || isPurchasing;

  const handleSubscribe = useCallback(
    async (plan: SelectablePlan) => {
      try {
        if (!isRevenueCatSupported) {
          Alert.alert("Device Required", "Please test purchases on an iOS or Android build.");
          return;
        }
        const pkg = getPackageForPlan(plan);
        if (!pkg) {
          Alert.alert("Still Loading", "Plan details are still syncing from RevenueCat.");
          return;
        }
        if (Platform.OS !== "web") {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
        await subscribe(plan);
        Alert.alert("Success", "You're all set with RizzGoat Pro.");
        if (router.canGoBack()) router.back();
        else router.replace("/");
      } catch {
        Alert.alert("Purchase Failed", "Please try again or contact support.");
      }
    },
    [getPackageForPlan, isRevenueCatSupported, subscribe, router]
  );

  const handleRestore = useCallback(async () => {
    if (!isRevenueCatSupported) {
      Alert.alert("Device Required", "Restoring purchases needs an iOS or Android build.");
      return;
    }
    try {
      if (Platform.OS !== "web") {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      await restore();
      Alert.alert("Restored", "Any previous purchases have been restored.");
    } catch {
      Alert.alert("Restore Failed", "Please try again in a moment.");
    }
  }, [isRevenueCatSupported, restore]);

  const handleRefresh = useCallback(async () => {
    try {
      await refreshOfferings();
    } catch {
      Alert.alert("Refresh Failed", "Unable to refresh offerings right now.");
    }
  }, [refreshOfferings]);

  const handleStartTrial = async () => {
    try {
      if (Platform.OS !== "web") {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      await startFreeTrial(3);
      Alert.alert("Trial Activated", "Enjoy 3 days of Pro features.");
    } catch {
      Alert.alert("Error", "Could not start trial. Please try again.");
    }
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
          <Animated.View style={[styles.heroSection, { transform: [{ scale: scaleAnim }] }]}> 
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
            <Text style={styles.title}>Unlock the full experience</Text>
            <Text style={styles.subtitle}>
              Live pricing comes straight from RevenueCat so you can sandbox test instantly.
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

          {!isTrialActive && (
            <View style={styles.ctaSection}>
              <LinearGradient colors={["#E3222B", "#FF7A59"]} style={styles.ctaCard}>
                <Text style={styles.ctaTitle}>3-Day Free Trial</Text>
                <Text style={styles.ctaSubtitle}>Unlock everything instantly, cancel anytime.</Text>
                <TouchableOpacity onPress={handleStartTrial} activeOpacity={0.9} style={styles.ctaButton} testID="start-trial-btn">
                  <Text style={styles.ctaButtonText}>Start Free Trial</Text>
                </TouchableOpacity>
              </LinearGradient>
            </View>
          )}

          <View style={styles.plansHeaderRow}>
            <Text style={styles.plansTitle}>Choose your plan</Text>
            <View style={styles.statusPill}>
              <Text style={styles.statusPillText}>
                {isRevenueCatSupported ? "Live from RevenueCat" : "Purchases unavailable on web"}
              </Text>
            </View>
          </View>

          <View style={styles.plansSection}>
            {SELECTABLE_PLANS.map((plan) => {
              const pkg = planPackages[plan];
              const config = PLAN_CONFIG[plan];

              if (!pkg) {
                return (
                  <View key={plan} style={[styles.planCard, styles.planCardDisabled]} testID={config.testId}>
                    <View style={styles.planHeader}>
                      <Text style={styles.planName}>Fetching {config.badgeLabel}</Text>
                      <ActivityIndicator color="#0F172A" />
                    </View>
                    <Text style={styles.planSupport}>Pulling latest pricing…</Text>
                  </View>
                );
              }

              return (
                <TouchableOpacity
                  key={plan}
                  onPress={() => handleSubscribe(plan)}
                  style={[styles.planCard, disablePlanSelection && styles.planCardDisabled]}
                  activeOpacity={0.9}
                  disabled={disablePlanSelection}
                  testID={config.testId}
                >
                  <View style={styles.planHeader}>
                    <Text style={styles.planName}>{pkg.product.title}</Text>
                    <View style={[styles.planBadge, { backgroundColor: config.badgeColor }]}>
                      <Text style={styles.planBadgeText}>{config.badgeLabel}</Text>
                    </View>
                  </View>
                  <Text style={styles.planPrice}>{pkg.product.priceString}</Text>
                  <Text style={styles.planPeriod}>{config.periodLabel}</Text>
                  <Text style={styles.planSupport}>{config.supportText}</Text>
                  <LinearGradient colors={config.gradient} style={styles.planButton}>
                    {isPurchasing ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={styles.planButtonText}>Continue</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              );
            })}

            {noProductsAvailable && (
              <View style={styles.infoCard}>
                <Text style={styles.infoText}>
                  We couldn’t load offerings yet. Pull to refresh or tap the button below to retry.
                </Text>
              </View>
            )}

            {!!lastError && (
              <View style={styles.errorCard}>
                <Text style={styles.errorText}>{lastError}</Text>
              </View>
            )}

            {!isRevenueCatSupported && (
              <View style={styles.warningCard}>
                <Text style={styles.warningText}>
                  Purchases require running the app on an iOS or Android device (TestFlight or Sandbox).
                </Text>
              </View>
            )}

            <View style={styles.supportActions}>
              <TouchableOpacity
                onPress={handleRestore}
                style={styles.supportButton}
                activeOpacity={0.8}
                testID="restore-purchases"
              >
                <Text style={styles.supportButtonText}>Restore Purchases</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleRefresh}
                style={styles.supportButton}
                activeOpacity={0.8}
                testID="refresh-offerings"
              >
                <Text style={styles.supportButtonText}>Refresh Offerings</Text>
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.terms}>
            • Prices load directly from RevenueCat in your local currency{"\n"}
            • Cancel any recurring plan in App Store settings{"\n"}
            • Yearly plan billed once every 12 months{"\n"}
            • Restore purchases anytime from this screen
          </Text>
        </ScrollView>

        {isRevenueCatLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator color="#FFFFFF" size="large" />
          </View>
        )}
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
  plansHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  plansTitle: { fontSize: 20, fontWeight: "700", color: "#FFFFFF" },
  statusPill: {
    backgroundColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
  },
  statusPillText: { color: "#FFFFFF", fontSize: 12, fontWeight: "600" },
  plansSection: { gap: 16, marginBottom: 24 },
  planCard: {
    backgroundColor: "rgba(255,255,255,0.97)",
    borderRadius: 20,
    padding: 24,
  },
  planCardDisabled: { opacity: 0.6 },
  planHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  planName: { fontSize: 20, fontWeight: "700", color: "#0F172A" },
  planBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  planBadgeText: { fontSize: 10, fontWeight: "700", color: "#0F172A" },
  planPrice: { fontSize: 32, fontWeight: "800", color: "#0F172A", marginBottom: 4 },
  planPeriod: { fontSize: 14, color: "rgba(15,23,42,0.6)", marginBottom: 10 },
  planSupport: { fontSize: 13, color: "rgba(15,23,42,0.7)", marginBottom: 18 },
  planButton: { paddingVertical: 14, borderRadius: 12, alignItems: "center" },
  planButtonText: { fontSize: 16, fontWeight: "700", color: "#FFFFFF" },
  infoCard: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 16,
    padding: 16,
  },
  infoText: { color: "#FFFFFF", fontSize: 13, textAlign: "center" },
  errorCard: {
    backgroundColor: "rgba(248,113,113,0.18)",
    borderRadius: 16,
    padding: 14,
  },
  errorText: { color: "#FCA5A5", fontSize: 13, textAlign: "center" },
  warningCard: {
    backgroundColor: "rgba(234,179,8,0.15)",
    borderRadius: 16,
    padding: 14,
  },
  warningText: { color: "#FDE68A", fontSize: 13, textAlign: "center" },
  supportActions: { flexDirection: "row", gap: 12, marginTop: 12 },
  supportButton: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    paddingVertical: 12,
    alignItems: "center",
  },
  supportButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "600" },
  terms: { fontSize: 12, color: "rgba(255,255,255,0.8)", textAlign: "center", lineHeight: 18 },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
  },
});
