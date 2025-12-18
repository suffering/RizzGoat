import React, { useCallback, useMemo, useRef } from "react";
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
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import {
  ArrowLeft,
  Check,
  Crown,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
} from "lucide-react-native";

import { useTheme } from "@/providers/ThemeProvider";
import { PurchasesPackage, useRevenueCat } from "@/providers/RevenueCatProvider";

type PlanCardMeta = {
  label: string;
  sublabel: string;
  accent: readonly [string, string];
  pill?: string;
};

function getPlanMeta(pkg: PurchasesPackage): PlanCardMeta {
  const type = (pkg?.packageType ?? "").toLowerCase();
  const id = (pkg?.identifier ?? "").toLowerCase();
  const productId = (pkg?.product?.identifier ?? "").toLowerCase();

  const isWeekly = type.includes("weekly") || id.includes("weekly") || id.includes("week") || productId.includes("week");
  const isMonthly = type.includes("monthly") || id.includes("monthly") || id.includes("month") || productId.includes("month");
  const isAnnual = type.includes("annual") || id.includes("annual") || id.includes("year") || productId.includes("year");
  const isLifetime = type.includes("lifetime") || id.includes("lifetime") || productId.includes("lifetime");

  if (isLifetime) {
    return {
      label: "Lifetime",
      sublabel: "one-time",
      accent: ["#10B981", "#34D399"],
      pill: "Best value",
    };
  }

  if (isAnnual) {
    return {
      label: "Annual",
      sublabel: "per year",
      accent: ["#0EA5E9", "#38BDF8"],
      pill: "Save",
    };
  }

  if (isMonthly) {
    return {
      label: "Monthly",
      sublabel: "per month",
      accent: ["#E3222B", "#FF7A59"],
      pill: "Popular",
    };
  }

  if (isWeekly) {
    return {
      label: "Weekly",
      sublabel: "per week",
      accent: ["#A855F7", "#EC4899"],
      pill: "Flexible",
    };
  }

  return {
    label: pkg?.product?.title || "Plan",
    sublabel: "",
    accent: ["#E3222B", "#FF7A59"],
  };
}

const FEATURES: { title: string; detail: string }[] = [
  { title: "Unlimited picks", detail: "No limits on pickup lines or chats." },
  { title: "Screenshot advisor", detail: "Better analysis and suggested replies." },
  { title: "Priority responses", detail: "Faster turnaround during peak hours." },
  { title: "Pro-only tones", detail: "More styles to match your vibe." },
];

export default function ProScreen() {
  const router = useRouter();
  const { theme } = useTheme();

  const {
    offeringsResponse,
    availablePackages,
    isLoading,
    isPurchasing,
    isRestoring,
    purchase,
    restore,
    hasActiveEntitlement,
    refetchOfferings,
  } = useRevenueCat();

  const packages = useMemo(() => {
    const fromCurrent = offeringsResponse?.current?.availablePackages ?? null;
    if (fromCurrent && Array.isArray(fromCurrent)) return fromCurrent;
    if (Array.isArray(availablePackages)) return availablePackages;
    return [] as PurchasesPackage[];
  }, [availablePackages, offeringsResponse]);

  const isPro = useMemo(() => hasActiveEntitlement("pro"), [hasActiveEntitlement]);

  const ctaScale = useRef(new Animated.Value(1)).current;

  const handleClose = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/");
    }
  }, [router]);

  const handleRestore = useCallback(async () => {
    try {
      if (Platform.OS !== "web") {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      await restore();

      const nowPro = hasActiveEntitlement("pro");
      if (nowPro) {
        Alert.alert("Restored", "Your Pro access has been restored.");
        handleClose();
      } else {
        Alert.alert("No Purchases", "No active subscriptions were found for this account.");
      }
    } catch {
      Alert.alert("Error", "Could not restore purchases. Please try again.");
    }
  }, [handleClose, hasActiveEntitlement, restore]);

  const handlePurchase = useCallback(
    async (pkg: PurchasesPackage) => {
      try {
        if (Platform.OS !== "web") {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }

        if (Platform.OS === "web") {
          Alert.alert(
            "Unavailable",
            "Purchases aren’t available on web preview. Scan the QR code to try on a device.",
          );
          return;
        }

        console.log("Pro: purchasing package", pkg?.identifier, pkg?.packageType);
        await purchase(pkg);

        Animated.sequence([
          Animated.spring(ctaScale, { toValue: 1.03, useNativeDriver: true }),
          Animated.spring(ctaScale, { toValue: 1, useNativeDriver: true }),
        ]).start();

        Alert.alert("Success", "You’re now Pro.");
        handleClose();
      } catch (err: any) {
        if (err?.userCancelled) {
          console.log("Pro: user cancelled purchase");
          return;
        }
        console.log("Pro: purchase failed", err);
        Alert.alert("Error", "Subscription failed. Please try again.");
      }
    },
    [ctaScale, handleClose, purchase],
  );

  const headerTitle = isPro ? "You’re Pro" : "Go Pro";

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]} testID="pro-screen">
      <LinearGradient
        colors={["#0B0B0C", "#141416", "#0B0B0C"]}
        style={styles.bg}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      <LinearGradient
        colors={["rgba(227,34,43,0.28)", "rgba(255,122,89,0.08)"]}
        style={styles.glow}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
      />

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.headerButton} testID="pro-close">
            <ArrowLeft size={22} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>{headerTitle}</Text>
            <Text style={styles.headerSubtitle}>Unlock the full RizzGoat experience</Text>
          </View>

          <TouchableOpacity
            onPress={() => {
              console.log("Pro: refetchOfferings pressed");
              refetchOfferings();
            }}
            style={styles.headerButton}
            testID="pro-refetch"
          >
            <RefreshCcw size={20} color="rgba(255,255,255,0.9)" />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            <View style={styles.heroBadge}>
              <LinearGradient colors={["#E3222B", "#FF7A59"]} style={styles.heroBadgeInner}>
                <Crown size={18} color="#FFFFFF" />
                <Text style={styles.heroBadgeText}>Pro</Text>
              </LinearGradient>
              <Sparkles size={18} color="rgba(255,255,255,0.9)" />
            </View>

            <Text style={styles.heroTitle}>More confidence. More replies. More wins.</Text>
            <Text style={styles.heroCopy}>
              Prices and plans are loaded live from RevenueCat.
              {Platform.OS === "web" ? " (Web preview can’t purchase.)" : ""}
            </Text>
          </View>

          <View style={styles.featuresCard} testID="pro-features">
            {FEATURES.map((f) => (
              <View key={f.title} style={styles.featureRow}>
                <View style={styles.featureIcon}>
                  <Check size={16} color="#10B981" />
                </View>
                <View style={styles.featureTextWrap}>
                  <Text style={styles.featureTitle}>{f.title}</Text>
                  <Text style={styles.featureDetail}>{f.detail}</Text>
                </View>
              </View>
            ))}
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Choose a plan</Text>
            <View style={styles.sectionPill}>
              <ShieldCheck size={14} color="rgba(255,255,255,0.92)" />
              <Text style={styles.sectionPillText}>Cancel anytime</Text>
            </View>
          </View>

          {isLoading ? (
            <View style={styles.stateCard} testID="plans-loading">
              <ActivityIndicator color="#FFFFFF" />
              <Text style={styles.stateTitle}>Loading plans…</Text>
              <Text style={styles.stateSubtitle}>Fetching offerings from RevenueCat.</Text>
            </View>
          ) : packages.length === 0 ? (
            <View style={styles.stateCard} testID="plans-empty">
              <Text style={styles.stateTitle}>No plans available</Text>
              <Text style={styles.stateSubtitle}>
                {Platform.OS === "web"
                  ? "RevenueCat purchases don’t run on web preview. Scan the QR code to see plans on-device."
                  : "We couldn’t load subscription options right now. Try again."}
              </Text>

              <TouchableOpacity
                onPress={() => {
                  console.log("Pro: retry fetch offerings");
                  refetchOfferings();
                }}
                style={styles.retryButton}
                activeOpacity={0.9}
                testID="plans-retry"
              >
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.plans} testID="plans-list">
              {packages.map((pkg, index) => {
                const meta = getPlanMeta(pkg);
                const price = pkg?.product?.priceString ?? "";
                const title = meta.label || pkg?.product?.title || "Plan";

                return (
                  <TouchableOpacity
                    key={`${pkg?.identifier ?? "pkg"}-${index}`}
                    onPress={() => handlePurchase(pkg)}
                    disabled={isPurchasing || Platform.OS === "web"}
                    activeOpacity={0.92}
                    style={styles.planCard}
                    testID={`plan-${pkg?.identifier ?? index}`}
                  >
                    <LinearGradient colors={meta.accent} style={styles.planAccent} />

                    <View style={styles.planTopRow}>
                      <Text style={styles.planName}>{title}</Text>
                      {!!meta.pill && (
                        <View style={styles.planPill}>
                          <Text style={styles.planPillText}>{meta.pill}</Text>
                        </View>
                      )}
                    </View>

                    <Text style={styles.planPrice}>{price || "—"}</Text>
                    {!!meta.sublabel && <Text style={styles.planPeriod}>{meta.sublabel}</Text>}

                    <Animated.View style={{ transform: [{ scale: ctaScale }] }}>
                      <View style={[styles.planCta, (isPurchasing || Platform.OS === "web") && styles.planCtaDisabled]}>
                        <Text style={styles.planCtaText}>
                          {Platform.OS === "web" ? "Try on device" : isPurchasing ? "Processing…" : "Continue"}
                        </Text>
                      </View>
                    </Animated.View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {Platform.OS !== "web" && (
            <TouchableOpacity
              onPress={handleRestore}
              disabled={isRestoring}
              style={styles.restoreRow}
              testID="restore-purchases"
            >
              <Text style={styles.restoreText}>{isRestoring ? "Restoring…" : "Restore purchases"}</Text>
            </TouchableOpacity>
          )}

          <Text style={styles.footnote} testID="pro-legal">
            Subscriptions renew automatically unless cancelled at least 24 hours before the end of the current period.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  bg: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  glow: {
    position: "absolute",
    left: -60,
    right: -60,
    top: -60,
    height: 380,
    borderBottomLeftRadius: 320,
    borderBottomRightRadius: 320,
  },
  safeArea: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: { flex: 1 },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  headerSubtitle: {
    marginTop: 2,
    color: "rgba(255,255,255,0.72)",
    fontSize: 12,
    fontWeight: "600",
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 28,
  },
  hero: {
    marginTop: 10,
    padding: 18,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    overflow: "hidden",
  },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  heroBadgeInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
  },
  heroBadgeText: {
    color: "#FFFFFF",
    fontWeight: "900",
    letterSpacing: 0.2,
  },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: 0.2,
  },
  heroCopy: {
    marginTop: 8,
    color: "rgba(255,255,255,0.78)",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
  },
  featuresCard: {
    marginTop: 14,
    padding: 16,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.92)",
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 10,
  },
  featureIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(16,185,129,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  featureTextWrap: { flex: 1 },
  featureTitle: {
    color: "#0B0B0C",
    fontSize: 14,
    fontWeight: "900",
  },
  featureDetail: {
    marginTop: 2,
    color: "rgba(11,11,12,0.65)",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
  },
  sectionHeader: {
    marginTop: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
  },
  sectionPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  sectionPillText: {
    color: "rgba(255,255,255,0.92)",
    fontSize: 12,
    fontWeight: "800",
  },
  stateCard: {
    marginTop: 12,
    padding: 16,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    gap: 8,
  },
  stateTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
  },
  stateSubtitle: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 12,
    textAlign: "center",
    lineHeight: 16,
    fontWeight: "700",
  },
  retryButton: {
    marginTop: 8,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  retryText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
  },
  plans: {
    marginTop: 12,
    gap: 12,
  },
  planCard: {
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.94)",
    padding: 16,
    overflow: "hidden",
  },
  planAccent: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 5,
  },
  planTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  planName: {
    color: "#0B0B0C",
    fontSize: 16,
    fontWeight: "900",
    flex: 1,
  },
  planPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(11,11,12,0.06)",
  },
  planPillText: {
    color: "rgba(11,11,12,0.70)",
    fontSize: 11,
    fontWeight: "900",
  },
  planPrice: {
    marginTop: 10,
    color: "#0B0B0C",
    fontSize: 28,
    fontWeight: "1000",
  },
  planPeriod: {
    marginTop: 2,
    color: "rgba(11,11,12,0.60)",
    fontSize: 12,
    fontWeight: "800",
  },
  planCta: {
    marginTop: 14,
    borderRadius: 14,
    backgroundColor: "#0B0B0C",
    paddingVertical: 12,
    alignItems: "center",
  },
  planCtaDisabled: {
    opacity: 0.55,
  },
  planCtaText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 0.2,
  },
  restoreRow: {
    marginTop: 14,
    alignItems: "center",
    paddingVertical: 12,
  },
  restoreText: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 13,
    fontWeight: "800",
    textDecorationLine: "underline",
  },
  footnote: {
    marginTop: 8,
    color: "rgba(255,255,255,0.55)",
    fontSize: 11,
    lineHeight: 15,
    textAlign: "center",
    fontWeight: "700",
  },
});
