import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { Check, Crown, RotateCcw, Sparkles, Zap, X } from "lucide-react-native";
import type { PurchasesPackage } from "react-native-purchases";

import { useRevenueCat, PlanProductId } from "@/providers/RevenueCatProvider";
import { useAppState } from "@/providers/AppStateProvider";
import { useTheme } from "@/providers/ThemeProvider";

const FEATURES = [
  "Unlimited pickup lines",
  "Advanced screenshot analysis",
  "Priority AI responses",
  "Custom tone settings",
  "Save unlimited favorites",
  "Ad-free experience",
  "Early access to new drops",
  "24/7 priority support",
];

const TRIAL_ELIGIBLE = new Set<PlanProductId>(["weekly", "monthly"]);

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
    description: "Max flexibility while you test lines",
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
  pkg?: PurchasesPackage | null;
};

interface ProPaywallProps {
  onClose: () => void;
}

const renderBadgeIcon = (badge: PlanMeta["badge"]) => {
  if (badge === "sparkles") return <Sparkles size={14} color="#FFFFFF" style={styles.planTagIcon} />;
  if (badge === "crown") return <Crown size={14} color="#FFFFFF" style={styles.planTagIcon} />;
  return <Zap size={14} color="#FFFFFF" style={styles.planTagIcon} />;
};

export default function ProPaywall({ onClose }: ProPaywallProps) {
  const { theme } = useTheme();
  const { subscribe } = useAppState();
  const {
    isLoading,
    isPurchasing,
    lastError,
    refreshOfferings,
    restore,
    getPackageForPlan,
  } = useRevenueCat();

  const [selectedPlan, setSelectedPlan] = useState<PlanProductId | null>(null);
  const heroScale = useRef(new Animated.Value(0.85)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(heroScale, {
        toValue: 1,
        friction: 6,
        tension: 60,
        useNativeDriver: true,
      }),
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 450,
        useNativeDriver: true,
      }),
    ]).start();
  }, [contentOpacity, heroScale]);

  useEffect(() => {
    refreshOfferings().catch(() => undefined);
  }, [refreshOfferings]);

  const planOptions = useMemo<PlanOption[]>(() => {
    return PLAN_META.map((meta) => ({
      meta,
      pkg: getPackageForPlan(meta.id),
    }));
  }, [getPackageForPlan]);

  useEffect(() => {
    if (selectedPlan) return;
    const defaultPlan = planOptions.find(
      (option) => option.pkg && TRIAL_ELIGIBLE.has(option.meta.id),
    );
    if (defaultPlan) {
      setSelectedPlan(defaultPlan.meta.id);
    }
  }, [planOptions, selectedPlan]);

  const trialSelection = selectedPlan && TRIAL_ELIGIBLE.has(selectedPlan) ? selectedPlan : null;
  const lifetimePackage = planOptions.find((option) => option.meta.id === "lifetime")?.pkg ?? null;
  const isPlansLoading = isLoading && planOptions.every((option) => !option.pkg);
  const primaryCtaDisabled = !trialSelection || isPurchasing;

  const handleSelectPlan = async (plan: PlanProductId, pkg?: PurchasesPackage | null) => {
    if (!pkg) {
      Alert.alert("Plan unavailable", "Tap refresh to load the latest prices.");
      return;
    }

    if (Platform.OS !== "web") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    setSelectedPlan(plan);
  };

  const handleStartTrial = async () => {
    if (!trialSelection) {
      Alert.alert("Select a plan", "Pick weekly or monthly to start your free trial.");
      return;
    }

    try {
      if (Platform.OS !== "web") {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      await subscribe(trialSelection);
      Alert.alert("Trial activated", "Enjoy every RizzGoat Pro feature for 3 days.");
      onClose();
    } catch (error) {
      Alert.alert("Purchase failed", (error as Error)?.message ?? "Please try again.");
    }
  };

  const handlePurchaseLifetime = async () => {
    if (!lifetimePackage) {
      Alert.alert("Lifetime unavailable", "Refresh products and try again.");
      return;
    }

    try {
      if (Platform.OS !== "web") {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      await subscribe("lifetime");
      Alert.alert("Welcome", "Lifetime Pro unlocked immediately.");
      onClose();
    } catch (error) {
      Alert.alert(
        "Purchase failed",
        (error as Error)?.message ?? "Please try again or contact support.",
      );
    }
  };

  const handleRestore = async () => {
    try {
      await restore();
      Alert.alert("Restored", "We reapplied your previous purchases.");
      onClose();
    } catch (error) {
      Alert.alert("Restore failed", (error as Error)?.message ?? "Try again shortly.");
    }
  };

  const handleRefreshProducts = async () => {
    try {
      await refreshOfferings();
    } catch (error) {
      Alert.alert("Refresh failed", (error as Error)?.message ?? "Please try again.");
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]} testID="pro-screen">
      <LinearGradient
        colors={["#0F0F10", "#1A1A1B"]}
        style={styles.backgroundGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      <LinearGradient
        colors={["rgba(227,34,43,0.25)", "rgba(255,122,89,0.1)"]}
        style={styles.topGlow}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <View style={styles.header}>
        <TouchableOpacity style={styles.closeButton} onPress={onClose} testID="pro-close">
          <X size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View style={[styles.heroSection, { transform: [{ scale: heroScale }] }]} testID="pro-hero">
          <View style={styles.brandRow}>
            <LinearGradient colors={["#E3222B", "#FF7A59"]} style={styles.brandBadge}>
              <Crown size={18} color="#FFFFFF" />
            </LinearGradient>
            <Text style={styles.brandText}>RizzGoat Pro</Text>
          </View>
          <Text style={styles.title}>Start your 3-day free trial</Text>
          <Text style={styles.subtitle}>
            Choose weekly or monthly to unlock everything instantly. You won’t be charged until the trial ends.
          </Text>
        </Animated.View>

        <Animated.View style={[styles.featuresSection, { opacity: contentOpacity }]}
          testID="pro-features">
          {FEATURES.map((feature) => (
            <View key={feature} style={styles.featureRow}>
              <View style={styles.checkContainer}>
                <Check size={14} color="#10B981" />
              </View>
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </Animated.View>

        <View style={styles.plansHeader}>
          <Text style={styles.plansTitle}>Choose your plan</Text>
          <TouchableOpacity
            onPress={handleRefreshProducts}
            disabled={isPurchasing}
            testID="refresh-plans-btn"
          >
            <Text style={styles.refreshLink}>Refresh</Text>
          </TouchableOpacity>
        </View>

        {lastError ? (
          <View style={styles.errorCard} testID="revenuecat-error">
            <Text style={styles.errorText}>{lastError}</Text>
          </View>
        ) : null}

        {isPlansLoading ? (
          <View style={styles.loadingCard} testID="plans-loading">
            <ActivityIndicator color="#FF7A59" />
            <Text style={styles.loadingText}>Loading live prices…</Text>
          </View>
        ) : null}

        {!isPlansLoading && planOptions.every((option) => !option.pkg) ? (
          <View style={styles.emptyStateCard} testID="plans-empty">
            <Text style={styles.emptyTitle}>Products unavailable</Text>
            <Text style={styles.emptySubtitle}>
              Pull fresh offerings from RevenueCat with the refresh button above.
            </Text>
            <TouchableOpacity
              style={styles.refreshButton}
              onPress={handleRefreshProducts}
              testID="refresh-offerings-btn"
            >
              <Text style={styles.refreshButtonText}>Refresh products</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {planOptions.map(({ meta, pkg }) => {
          const isSelected = selectedPlan === meta.id;
          const disabled = !pkg || isPurchasing;
          const showTrial = TRIAL_ELIGIBLE.has(meta.id);

          return (
            <TouchableOpacity
              key={meta.id}
              onPress={() => handleSelectPlan(meta.id, pkg)}
              style={[styles.planCard, isSelected && styles.planCardSelected, !pkg && styles.planCardDisabled]}
              activeOpacity={0.9}
              disabled={disabled}
              testID={meta.testID}
            >
              <View style={styles.planHeader}>
                <Text style={styles.planName}>{pkg?.product.title ?? meta.label}</Text>
                <View style={[styles.planTag, meta.badge === "zap" ? styles.planTagSuccess : styles.planTagAccent]}>
                  {renderBadgeIcon(meta.badge)}
                  <Text style={styles.planTagText}>{meta.tag}</Text>
                </View>
              </View>
              <Text style={styles.planDescription}>{meta.description}</Text>
              <Text style={styles.planPrice}>{pkg?.product.priceString ?? "—"}</Text>
              <Text style={styles.planPeriod}>{meta.periodLabel}</Text>
              {showTrial ? (
                <Text style={styles.planTrialText}>Includes 3-day free trial</Text>
              ) : (
                <Text style={styles.planTrialText}>One-time secure purchase</Text>
              )}
              <LinearGradient colors={meta.gradient} style={styles.planButton}>
                <Text style={styles.planButtonText}>
                  {pkg ? (isSelected ? "Selected" : "Choose") : "Unavailable"}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          );
        })}

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.primaryButton, primaryCtaDisabled && styles.primaryButtonDisabled]}
            onPress={handleStartTrial}
            disabled={primaryCtaDisabled}
            testID="start-trial-btn"
          >
            <Text style={styles.primaryButtonText}>
              {isPurchasing ? "Processing…" : "Start Free Trial"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryButton, (!lifetimePackage || isPurchasing) && styles.secondaryButtonDisabled]}
            onPress={handlePurchaseLifetime}
            disabled={!lifetimePackage || isPurchasing}
            testID="buy-lifetime-btn"
          >
            <Text style={styles.secondaryButtonText}>
              {isPurchasing ? "Please wait…" : "Buy Lifetime Access"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.restoreButton}
            onPress={handleRestore}
            disabled={isPurchasing}
            testID="restore-purchases-btn"
          >
            <RotateCcw size={16} color="#FFFFFF" style={styles.restoreIcon} />
            <Text style={styles.restoreText}>Restore purchases</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.terms}>
          • Trial renews into the selected plan after 3 days
          {"\n"}• Cancel anytime in App Store or Play Store settings
          {"\n"}• Lifetime unlocks immediately without a trial
          {"\n"}• Prices shown are fetched live from RevenueCat offerings
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  backgroundGradient: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0 },
  topGlow: {
    position: "absolute",
    left: -80,
    right: -80,
    top: -50,
    height: 360,
    borderBottomLeftRadius: 300,
    borderBottomRightRadius: 300,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    alignItems: "flex-end",
  },
  closeButton: { padding: 10 },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 48,
  },
  heroSection: {
    marginBottom: 28,
    alignItems: "center",
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  brandBadge: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  brandText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.2,
    marginLeft: 10,
  },
  title: { fontSize: 28, fontWeight: "800", color: "#FFFFFF", textAlign: "center", marginBottom: 8 },
  subtitle: { color: "rgba(255,255,255,0.85)", fontSize: 14, textAlign: "center" },
  featuresSection: {
    backgroundColor: "rgba(255,255,255,0.96)",
    borderRadius: 20,
    padding: 20,
    marginBottom: 22,
  },
  featureRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  checkContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(16,185,129,0.12)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  featureText: { fontSize: 15, color: "#000000", flex: 1 },
  plansHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  plansTitle: { color: "#FFFFFF", fontSize: 18, fontWeight: "700" },
  refreshLink: { color: "#FF7A59", fontSize: 13, fontWeight: "600" },
  errorCard: {
    borderRadius: 16,
    backgroundColor: "rgba(227,34,43,0.18)",
    padding: 16,
    marginBottom: 16,
  },
  errorText: { color: "#FFB4A6", fontSize: 13 },
  loadingCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    padding: 20,
    alignItems: "center",
    marginBottom: 16,
  },
  loadingText: { marginTop: 10, color: "rgba(255,255,255,0.8)", fontSize: 14 },
  emptyStateCard: {
    borderRadius: 18,
    padding: 22,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#FFFFFF", marginBottom: 6 },
  emptySubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.75)",
    textAlign: "center",
    marginBottom: 14,
  },
  refreshButton: {
    borderRadius: 12,
    backgroundColor: "#FF7A59",
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  refreshButtonText: { color: "#FFFFFF", fontWeight: "700", fontSize: 14 },
  planCard: {
    backgroundColor: "rgba(255,255,255,0.96)",
    borderRadius: 20,
    padding: 22,
    marginBottom: 14,
  },
  planCardSelected: {
    borderWidth: 2,
    borderColor: "#FF7A59",
  },
  planCardDisabled: {
    opacity: 0.6,
  },
  planHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  planName: { fontSize: 20, fontWeight: "700", color: "#000000", flex: 1, marginRight: 12 },
  planTag: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  planTagIcon: { marginRight: 4 },
  planTagText: { color: "#FFFFFF", fontSize: 11, fontWeight: "700" },
  planTagAccent: { backgroundColor: "#E3222B" },
  planTagSuccess: { backgroundColor: "#10B981" },
  planDescription: { fontSize: 14, color: "rgba(0,0,0,0.7)", marginBottom: 14 },
  planPrice: { fontSize: 32, fontWeight: "800", color: "#000000", marginBottom: 4 },
  planPeriod: { fontSize: 13, color: "rgba(0,0,0,0.6)", marginBottom: 6 },
  planTrialText: { fontSize: 12, color: "rgba(0,0,0,0.7)", marginBottom: 12, fontWeight: "600" },
  planButton: { paddingVertical: 12, borderRadius: 12, alignItems: "center" },
  planButtonText: { fontSize: 15, fontWeight: "700", color: "#FFFFFF" },
  actions: { marginTop: 10 },
  primaryButton: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    backgroundColor: "#FF7A59",
    marginBottom: 12,
  },
  primaryButtonDisabled: { opacity: 0.5 },
  primaryButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  secondaryButton: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
    backgroundColor: "rgba(255,255,255,0.08)",
    marginBottom: 12,
  },
  secondaryButtonDisabled: { opacity: 0.5 },
  secondaryButtonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  restoreButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  restoreIcon: { marginRight: 6 },
  restoreText: { color: "rgba(255,255,255,0.85)", fontSize: 14, fontWeight: "600" },
  terms: {
    marginTop: 24,
    fontSize: 12,
    color: "rgba(255,255,255,0.75)",
    textAlign: "center",
    lineHeight: 18,
  },
});
