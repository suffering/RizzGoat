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
import { X, Check, Sparkles, Zap, Crown, Crown as CrownIcon } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/providers/ThemeProvider";
import { useAppState } from "@/providers/AppStateProvider";
import { useRevenueCat } from "@/providers/RevenueCatProvider";
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

type PlanProduct = "weekly" | "monthly" | "yearly";

const PLAN_ORDER: PlanProduct[] = ["weekly", "monthly", "yearly"];

const PLAN_META: Record<PlanProduct, { badge: string; badgeColor: string; gradient: [string, string]; outline?: string }> = {
  weekly: {
    badge: "FLEX",
    badgeColor: "#FEE2E2",
    gradient: ["#E3222B", "#FF7A59"],
  },
  monthly: {
    badge: "POPULAR",
    badgeColor: "#DDD6FE",
    gradient: ["#8B5CF6", "#A78BFA"],
  },
  yearly: {
    badge: "BEST VALUE",
    badgeColor: "#D1FAE5",
    gradient: ["#10B981", "#34D399"],
    outline: "#10B981",
  },
};

const formatDate = (input?: string | null) => {
  if (!input) return "N/A";
  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime())) {
    return "N/A";
  }
  return parsed.toLocaleDateString();
};

export default function ProScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { isTrialActive, startFreeTrial } = useAppState();
  const {
    isSupported: purchasesSupported,
    packages,
    purchasingProduct,
    purchaseProduct,
    refreshCustomerInfo,
    refreshOfferings,
    restorePurchases,
    presentCustomerCenter,
    customerInfo,
    customerInfoError,
    offeringsError,
    purchaseError,
    entitlementActive,
    customerInfoLoading,
    offeringsLoading,
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
  }, [featuresAnim, scaleAnim]);

  const latestExpirationDate = (customerInfo as typeof customerInfo & { latestExpirationDate?: string | null })?.latestExpirationDate ?? null;

  const planCards = useMemo(() => PLAN_ORDER.map((id) => ({ id, data: packages[id], meta: PLAN_META[id] })), [packages]);

  const handleStartTrial = async () => {
    try {
      if (Platform.OS !== "web") {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      await startFreeTrial(3);
      Alert.alert("Trial Activated", "Enjoy 3 days of Pro features.");
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace("/");
      }
    } catch {
      Alert.alert("Error", "Could not start trial. Please try again.");
    }
  };

  const handlePlanPress = async (productId: PlanProduct) => {
    try {
      if (Platform.OS !== "web") {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      await purchaseProduct(productId);
      Alert.alert("Success", "Your plan is now active.");
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace("/");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Subscription failed. Please try again.";
      Alert.alert("Purchase failed", message);
    }
  };

  const handleRestore = async () => {
    try {
      await restorePurchases();
      Alert.alert("Restored", "Purchases synced with RevenueCat.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to restore purchases.";
      Alert.alert("Restore failed", message);
    }
  };

  const handleCustomerCenter = async () => {
    try {
      await presentCustomerCenter();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Customer Center unavailable.";
      Alert.alert("Customer Center", message);
    }
  };

  const handleSync = async () => {
    await Promise.allSettled([refreshOfferings(), refreshCustomerInfo()]);
    Alert.alert("Updated", "RevenueCat data refreshed.");
  };

  const statusMessages = useMemo(() => {
    return [customerInfoError, offeringsError, purchaseError].filter(Boolean) as string[];
  }, [customerInfoError, offeringsError, purchaseError]);

  const disablePurchases = !purchasesSupported;

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
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace("/");
              }
            }}
            style={styles.closeButton}
            testID="pro-close"
          >
            <X size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Animated.View
            style={[
              styles.heroSection,
              { transform: [{ scale: scaleAnim }] },
            ]}
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
            <Text style={styles.title}>{isTrialActive ? "Choose your plan" : "Unlock the full experience"}</Text>
            <Text style={styles.subtitle}>
              {isTrialActive
                ? "Your 3-day trial is active. Pick a plan to continue afterward."
                : "Start a 3-day free trial. Cancel anytime."}
            </Text>
          </Animated.View>

          <Animated.View
            style={[
              styles.featuresSection,
              { opacity: featuresAnim },
            ]}
          >
            {FEATURES.map((feature, index) => (
              <View key={feature.text} style={styles.featureRow}>
                <View style={styles.checkContainer}>
                  <Check size={16} color="#10B981" />
                </View>
                <Text style={styles.featureText}>{feature.text}</Text>
              </View>
            ))}
          </Animated.View>

          <View style={styles.statusCard}>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>RizzGoat Pro</Text>
              <Text style={[styles.statusValue, entitlementActive ? styles.statusValueActive : styles.statusValueInactive]}>
                {entitlementActive ? "Active" : "Locked"}
              </Text>
            </View>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Customer ID</Text>
              <Text style={styles.statusValue}>{customerInfo?.originalAppUserId ?? "Not set"}</Text>
            </View>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Expires</Text>
              <Text style={styles.statusValue}>{formatDate(latestExpirationDate)}</Text>
            </View>
            {(customerInfoLoading || offeringsLoading) && (
              <Text style={styles.statusSyncText}>Syncing RevenueCat data…</Text>
            )}
            {disablePurchases && (
              <Text style={styles.statusWarning}>RevenueCat purchases are available on iOS/Android builds.</Text>
            )}
            {statusMessages.length > 0 && (
              <View style={styles.statusErrors}>
                {statusMessages.map((message) => (
                  <Text key={message} style={styles.statusErrorText}>{message}</Text>
                ))}
              </View>
            )}
            <View style={styles.statusButtonsRow}>
              <TouchableOpacity
                onPress={handleRestore}
                style={styles.statusButton}
                activeOpacity={0.9}
                disabled={disablePurchases}
                testID="restore-purchases"
              >
                <Text style={styles.statusButtonText}>Restore</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleCustomerCenter}
                style={styles.statusButton}
                activeOpacity={0.9}
                disabled={disablePurchases}
                testID="customer-center"
              >
                <Text style={styles.statusButtonText}>Customer Center</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSync}
                style={styles.statusButton}
                activeOpacity={0.9}
                testID="sync-revenuecat"
              >
                <Text style={styles.statusButtonText}>Refresh</Text>
              </TouchableOpacity>
            </View>
          </View>

          {!isTrialActive ? (
            <View style={styles.ctaSection}>
              <LinearGradient colors={["#E3222B", "#FF7A59"]} style={styles.ctaCard}>
                <Text style={styles.ctaTitle}>3-Day Free Trial</Text>
                <Text style={styles.ctaSubtitle}>Then $6.99/week, $19.99/month, or $119.99/year</Text>
                <TouchableOpacity
                  onPress={handleStartTrial}
                  activeOpacity={0.9}
                  style={styles.ctaButton}
                  testID="start-trial-btn"
                >
                  <Text style={styles.ctaButtonText}>Start Free Trial</Text>
                </TouchableOpacity>
              </LinearGradient>
            </View>
          ) : (
            <View style={styles.plansSection}>
              {planCards.map(({ id, data, meta }) => (
                <TouchableOpacity
                  key={id}
                  onPress={() => handlePlanPress(id)}
                  style={[
                    styles.planCard,
                    id === "yearly" && styles.bestValueCard,
                    meta.outline ? { borderColor: meta.outline } : null,
                    disablePurchases && styles.planDisabled,
                  ]}
                  activeOpacity={0.9}
                  disabled={disablePurchases || purchasingProduct === id}
                  testID={`plan-${id}`}
                >
                  {id === "yearly" && (
                    <View style={styles.bestValueBadge}>
                      <Zap size={16} color="#FFFFFF" />
                      <Text style={styles.bestValueText}>BEST VALUE</Text>
                    </View>
                  )}
                  <View style={styles.planHeader}>
                    <Text style={styles.planName}>{data.title}</Text>
                    <View style={[styles.popularBadge, { backgroundColor: meta.badgeColor }]}>
                      <Text style={styles.popularText}>{data.badge ?? meta.badge}</Text>
                    </View>
                  </View>
                  <Text style={styles.planPrice}>{data.price}</Text>
                  <Text style={styles.planPeriod}>{data.periodLabel}</Text>
                  {data.description && <Text style={styles.planDescription}>{data.description}</Text>}
                  <LinearGradient colors={meta.gradient} style={styles.planButton}>
                    {purchasingProduct === id ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={styles.planButtonText}>Continue</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <Text style={styles.terms}>
            • 3-day free trial then chosen plan applies{"\n"}
            • Cancel anytime in Settings{"\n"}
            • Prices in USD
          </Text>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  bg: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  topGlow: {
    position: "absolute",
    left: -60,
    right: -60,
    top: -40,
    height: 360,
    borderBottomLeftRadius: 300,
    borderBottomRightRadius: 300,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    alignItems: "flex-end",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  closeButton: {
    padding: 8,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  heroSection: {
    alignItems: "center",
    marginBottom: 32,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  brandBadge: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  brandText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  crownContainer: {
    position: "relative",
    marginBottom: 18,
  },
  sparkle1: {
    position: "absolute",
    top: -10,
    right: -20,
  },
  sparkle2: {
    position: "absolute",
    bottom: -5,
    left: -15,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.9)",
    textAlign: "center",
  },
  featuresSection: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 20,
    padding: 20,
    marginTop: 18,
    marginBottom: 22,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  checkContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  featureText: {
    fontSize: 15,
    color: "#000000",
    flex: 1,
  },
  statusCard: {
    backgroundColor: "rgba(15, 15, 16, 0.85)",
    borderRadius: 20,
    padding: 20,
    gap: 10,
    marginBottom: 24,
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statusLabel: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 14,
  },
  statusValue: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  statusValueActive: {
    color: "#34D399",
  },
  statusValueInactive: {
    color: "#F87171",
  },
  statusSyncText: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: 12,
  },
  statusWarning: {
    color: "#FBBF24",
    fontSize: 12,
  },
  statusErrors: {
    gap: 4,
  },
  statusErrorText: {
    color: "#F87171",
    fontSize: 12,
  },
  statusButtonsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 4,
  },
  statusButton: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  statusButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
  ctaSection: {
    marginBottom: 24,
  },
  ctaCard: {
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
  },
  ctaTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 6,
  },
  ctaSubtitle: {
    fontSize: 13,
    color: "#FFFFFF",
    opacity: 0.9,
    marginBottom: 14,
  },
  ctaButton: {
    backgroundColor: "#000000",
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 12,
  },
  ctaButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  plansSection: {
    gap: 16,
    marginBottom: 24,
  },
  planCard: {
    backgroundColor: "rgba(255, 255, 255, 0.96)",
    borderRadius: 20,
    padding: 24,
    position: "relative",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
  },
  planDisabled: {
    opacity: 0.65,
  },
  bestValueCard: {
    borderWidth: 2,
    borderColor: "#10B981",
  },
  bestValueBadge: {
    position: "absolute",
    top: -12,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#10B981",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  bestValueText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  planHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  planName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#000000",
  },
  popularBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  popularText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#1F2937",
  },
  planPrice: {
    fontSize: 32,
    fontWeight: "800",
    color: "#000000",
    marginBottom: 4,
  },
  planPeriod: {
    fontSize: 14,
    color: "rgba(0, 0, 0, 0.6)",
    marginBottom: 8,
  },
  planDescription: {
    fontSize: 13,
    color: "rgba(0,0,0,0.6)",
    marginBottom: 16,
  },
  planButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  planButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  terms: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.8)",
    textAlign: "center",
    lineHeight: 18,
  },
});
