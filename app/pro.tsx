import React, { useRef, useEffect, useMemo } from "react";
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
} from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/providers/ThemeProvider";
import { useAppState } from "@/providers/AppStateProvider";
import { PlanProductId, useRevenueCat } from "@/providers/RevenueCatProvider";
import * as Haptics from "expo-haptics";
import type { PurchasesPackage } from "react-native-purchases";

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
};

export default function ProScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { subscribe } = useAppState();
  const {
    isLoading: isRevenueCatLoading,
    isPurchasing,
    lastError,
    refreshOfferings,
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
      Animated.timing(featuresAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start();
  }, [featuresAnim, scaleAnim]);

  useEffect(() => {
    refreshOfferings().catch(() => {});
  }, [refreshOfferings]);

  const planOptions = useMemo<PlanOption[]>(() => {
    return PLAN_META.map((meta) => {
      const pkg = getPackageForPlan(meta.id);
      if (!pkg) return null;
      return { meta, pkg };
    }).filter((option): option is PlanOption => Boolean(option));
  }, [getPackageForPlan]);

  const isPlansLoading = isRevenueCatLoading && planOptions.length === 0;
  const planButtonLabel = isPurchasing ? "Processing..." : "Start 3-Day Trial";

  const handleSubscribe = async (plan: PlanProductId) => {
    try {
      if (Platform.OS !== "web") {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      await subscribe(plan);
      Alert.alert("Trial activated", "Enjoy every feature during your 3-day trial.");
      if (router.canGoBack()) router.back();
      else router.replace("/");
    } catch {
      Alert.alert("Error", "Subscription failed. Please try again.");
    }
  };

  const handleRefreshProducts = async () => {
    try {
      await refreshOfferings();
    } catch {
      Alert.alert("Error", "Could not refresh plans. Please try again.");
    }
  };

  const renderBadgeIcon = (badge: PlanMeta["badge"]) => {
    if (badge === "sparkles") return <Sparkles size={14} color="#FFFFFF" style={styles.planTagIcon} />;
    if (badge === "crown") return <Crown size={14} color="#FFFFFF" style={styles.planTagIcon} />;
    return <Zap size={14} color="#FFFFFF" style={styles.planTagIcon} />;
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]} testID="pro-screen">
      <LinearGradient colors={["#0F0F10", "#1A1A1B"]} style={styles.bg} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
      <LinearGradient colors={["rgba(227,34,43,0.25)", "rgba(255,122,89,0.1)"]} style={styles.topGlow} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />

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
          <Animated.View style={[styles.heroSection, { transform: [{ scale: scaleAnim }] }]}
            testID="pro-hero">
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
            <Text style={styles.title}>Start your 3-day free trial</Text>
            <Text style={styles.subtitle}>
              Choose any plan below to unlock every feature instantly. You won’t be charged until the trial ends.
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

          <View style={styles.ctaSection} testID="trial-info-card">
            <LinearGradient colors={["#E3222B", "#FF7A59"]} style={styles.ctaCard}>
              <Text style={styles.ctaTitle}>3-day trial included</Text>
              <Text style={styles.ctaSubtitle}>Pick any plan to unlock everything now. Cancel before day 3 to avoid charges.</Text>
            </LinearGradient>
          </View>

          <View style={styles.plansSection}>
            <View style={styles.plansHeader}>
              <Text style={styles.plansTitle}>Choose your plan</Text>
              <TouchableOpacity onPress={handleRefreshProducts} disabled={isPurchasing} testID="refresh-plans-btn">
                <Text style={styles.refreshLink}>Refresh</Text>
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
                <Text style={styles.emptySubtitle}>Tap refresh to pull them from RevenueCat now that the API key is set.</Text>
                <TouchableOpacity style={styles.refreshButton} onPress={handleRefreshProducts} testID="refresh-offerings-btn">
                  <Text style={styles.refreshButtonText}>Refresh products</Text>
                </TouchableOpacity>
              </View>
            )}

            {planOptions.map(({ meta, pkg }) => (
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
                  <View style={[styles.planTag, meta.badge === "zap" ? styles.planTagSuccess : styles.planTagAccent]}>
                    {renderBadgeIcon(meta.badge)}
                    <Text style={styles.planTagText}>{meta.tag}</Text>
                  </View>
                </View>
                <Text style={styles.planDescription}>{meta.description}</Text>
                <Text style={styles.planPrice}>{pkg.product.priceString}</Text>
                <Text style={styles.planPeriod}>{meta.periodLabel}</Text>
                <Text style={styles.planTrialText}>Includes 3-day free trial</Text>
                <LinearGradient colors={[...meta.gradient]} style={styles.planButton}>
                  <Text style={styles.planButtonText}>{planButtonLabel}</Text>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.terms}>
            • 3-day free trial then chosen plan applies{"\n"}
            • Cancel weekly or monthly anytime in Settings{"\n"}
            • Lifetime is a one-time purchase{"\n"}
            • Prices pulled live from RevenueCat offerings{"\n"}
            • Displayed in your local currency
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
  ctaSubtitle: { fontSize: 13, color: "#FFFFFF", opacity: 0.9 },
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
  planDescription: { fontSize: 14, color: "rgba(0,0,0,0.7)", marginBottom: 16 },
  planPrice: { fontSize: 32, fontWeight: "800", color: "#000000", marginBottom: 4 },
  planPeriod: { fontSize: 14, color: "rgba(0,0,0,0.6)", marginBottom: 8 },
  planTrialText: { fontSize: 13, color: "rgba(0,0,0,0.7)", fontWeight: "600", marginBottom: 12 },
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
  terms: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
    textAlign: "center",
    lineHeight: 18,
  },
});
