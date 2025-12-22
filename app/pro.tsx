import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Animated,
  Easing,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Check, Crown, ShieldCheck, X } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useRevenueCat } from "@/providers/RevenueCatProvider";

type PaywallPackage = {
  id: string;
  title: string;
  subtitle: string;
  badge?: string;
};

function getPackageMeta(productId: string | null | undefined): PaywallPackage {
  switch (productId) {
    case "rizzgoat.weekly":
      return { id: "weekly", title: "Weekly", subtitle: "Flexible • Cancel anytime", badge: "Starter" };
    case "rizzgoat.monthly":
      return { id: "monthly", title: "Monthly", subtitle: "Best value for most", badge: "Popular" };
    case "rizzgoat.lifetime":
      return { id: "lifetime", title: "Lifetime", subtitle: "One-time purchase", badge: "Best" };
    default:
      return { id: "unknown", title: "Pro", subtitle: "Unlock everything" };
  }
}

function sortByKnownOrder(a: string, b: string): number {
  const order: Record<string, number> = {
    "rizzgoat.weekly": 1,
    "rizzgoat.monthly": 2,
    "rizzgoat.lifetime": 3,
  };
  return (order[a] ?? 999) - (order[b] ?? 999);
}

export default function ProScreen() {
  const router = useRouter();
  const {
    isConfigured,
    isEntitledToPro,
    activeProProductId,
    availablePackages,
    isLoading,
    lastErrorMessage,
    purchasePackage,
    restorePurchases,
    refresh,
  } = useRevenueCat();

  const sortedPackages = useMemo(() => {
    const pkgs = [...availablePackages];
    pkgs.sort((a, b) => sortByKnownOrder(a.product.identifier, b.product.identifier));
    return pkgs;
  }, [availablePackages]);

  const currentPlanRank = useMemo<number>(() => {
    const order: Record<string, number> = {
      "rizzgoat.weekly": 1,
      "rizzgoat.monthly": 2,
      "rizzgoat.lifetime": 3,
    };
    if (!activeProProductId) return 0;
    return order[activeProProductId] ?? 0;
  }, [activeProProductId]);

  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [isPurchasingId, setIsPurchasingId] = useState<string | null>(null);
  const successScale = useRef(new Animated.Value(0)).current;
  const successOpacity = useRef(new Animated.Value(0)).current;
  const successGlow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!selectedProductId) {
      setSelectedProductId(activeProProductId ?? sortedPackages[0]?.product.identifier ?? null);
    }
  }, [activeProProductId, selectedProductId, sortedPackages]);

  const playSuccessAnimation = useCallback(async () => {
    successScale.setValue(0.85);
    successOpacity.setValue(0);
    successGlow.setValue(0);

    Animated.parallel([
      Animated.timing(successOpacity, {
        toValue: 1,
        duration: 140,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(successScale, {
        toValue: 1,
        friction: 6,
        tension: 120,
        useNativeDriver: true,
      }),
      Animated.timing(successGlow, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    setTimeout(() => {
      Animated.parallel([
        Animated.timing(successOpacity, {
          toValue: 0,
          duration: 220,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(successGlow, {
          toValue: 0,
          duration: 260,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    }, 1100);
  }, [successGlow, successOpacity, successScale]);

  const close = useCallback(() => {
    if ((router as any).canGoBack && (router as any).canGoBack()) {
      router.back();
    } else {
      router.replace("/");
    }
  }, [router]);

  const onRestore = useCallback(async () => {
    if (Platform.OS !== "web") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    const res = await restorePurchases();
    const pro = res.customerInfo?.entitlements?.active?.pro != null;
    if (pro) {
      Alert.alert("Restored", "You're Pro again.");
    } else {
      Alert.alert("No purchases found", "We couldn't find any active purchases for this Apple ID.");
    }
  }, [restorePurchases]);

  const onPurchaseSelected = useCallback(async () => {
    const productId = selectedProductId;
    if (!productId) {
      Alert.alert("Purchase unavailable", "Please select a plan first.");
      return;
    }

    const pkg = sortedPackages.find((p) => p.product.identifier === productId);
    if (!pkg) {
      Alert.alert("Purchase unavailable", "This plan isn't available right now.");
      return;
    }

    if (!isConfigured) {
      Alert.alert("Purchases unavailable", "We can't connect to purchases right now.");
      return;
    }

    if (isLoading || isPurchasingId) return;

    const order: Record<string, number> = {
      "rizzgoat.weekly": 1,
      "rizzgoat.monthly": 2,
      "rizzgoat.lifetime": 3,
    };
    const selectedRank = order[productId] ?? 0;

    const isCurrent = activeProProductId != null && activeProProductId === productId;
    const isDowngrade = currentPlanRank > 0 && selectedRank > 0 && selectedRank < currentPlanRank;

    if (isCurrent) {
      return;
    }

    if (isDowngrade) {
      Alert.alert(
        "Downgrades",
        "Downgrades are managed via the App Store subscription settings."
      );
      return;
    }

    if (Platform.OS !== "web") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    setIsPurchasingId(productId);

    console.log("[Pro] purchase pressed", {
      selectedProductId: productId,
      activeProProductId,
      isEntitledToPro,
    });

    const res = await purchasePackage(pkg, {
      upgradeFromProductId: activeProProductId,
    });

    setIsPurchasingId(null);

    if (res.cancelled) {
      return;
    }

    const nowPro = res.customerInfo?.entitlements?.active?.pro != null;
    if (nowPro) {
      const newActiveProductId =
        ((res.customerInfo?.entitlements?.active as any)?.pro as any)?.productIdentifier ??
        null;

      console.log("[Pro] purchase synced", {
        selectedProductId: productId,
        newActiveProductId,
      });

      if (Platform.OS !== "web") {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      if (typeof newActiveProductId === "string" && newActiveProductId.length > 0) {
        setSelectedProductId(newActiveProductId);
      } else {
        setSelectedProductId(productId);
      }

      playSuccessAnimation();
    } else {
      await refresh();
      if (!isEntitledToPro) {
        Alert.alert(
          "Almost there",
          "Your purchase went through, but Pro hasn't synced yet. Please try Restore Purchases or wait a moment."
        );
      }
    }
  }, [
    activeProProductId,
    currentPlanRank,
    isConfigured,
    isEntitledToPro,
    isLoading,
    isPurchasingId,
    playSuccessAnimation,
    purchasePackage,
    refresh,
    selectedProductId,
    sortedPackages,
  ]);

  return (
    <View style={styles.container} testID="pro-screen">
      <LinearGradient
        colors={["#0A0A0A", "#120B0C", "#0A0A0A"]}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFillObject}
      />

      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <View style={styles.header}>
          <View style={styles.headerLeft} />
          <View style={styles.headerCenter}>
            <View style={styles.headerPill}>
              <Crown size={14} color="#FFD166" />
              <Text style={styles.headerPillText}>RizzGoat Pro</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity
              testID="pro-close"
              onPress={close}
              style={styles.closeButton}
              activeOpacity={0.8}
            >
              <X size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <Text style={styles.title}>Unlock the cheat codes.</Text>
            <Text style={styles.subtitle}>
              Better replies. Better openers. More wins. All powered by AI.
            </Text>

            {isEntitledToPro ? (
              <View style={styles.proStatus} testID="pro-status-pro">
                <ShieldCheck size={18} color="#7CFFB2" />
                <Text style={styles.proStatusText}>You&apos;re Pro</Text>
              </View>
            ) : (
              <View style={styles.proStatusMuted} testID="pro-status-free">
                <Text style={styles.proStatusMutedText}>Free plan</Text>
              </View>
            )}
          </View>

          <View style={styles.benefitsCard}>
            {[
              "Unlimited AI replies & rewrites",
              "Premium pickup lines",
              "Faster results, less overthinking",
            ].map((b, idx) => (
              <View key={`${idx}-${b}`} style={styles.benefitRow}>
                <View style={styles.checkDot}>
                  <Check size={14} color="#0A0A0A" />
                </View>
                <Text style={styles.benefitText}>{b}</Text>
              </View>
            ))}
          </View>

          <View style={styles.plansSection} testID="pro-plans">
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Choose your plan</Text>
                {isLoading ? (
                  <View style={styles.loadingPill}>
                    <ActivityIndicator color="#FFFFFF" size="small" />
                    <Text style={styles.loadingPillText}>Loading</Text>
                  </View>
                ) : null}
              </View>

              {!isConfigured ? (
                <View style={styles.notice} testID="pro-not-configured">
                  <Text style={styles.noticeTitle}>Purchases unavailable</Text>
                  <Text style={styles.noticeText}>
                    We&apos;re having trouble connecting to Apple purchases right now.
                  </Text>
                </View>
              ) : null}

              {lastErrorMessage ? (
                <View style={styles.notice} testID="pro-error">
                  <Text style={styles.noticeTitle}>Something went wrong</Text>
                  <Text style={styles.noticeText}>{lastErrorMessage}</Text>
                </View>
              ) : null}

              {isConfigured && sortedPackages.length === 0 ? (
                <View style={styles.notice} testID="pro-no-packages">
                  <Text style={styles.noticeTitle}>No plans available</Text>
                  <Text style={styles.noticeText}>
                    Please try again in a moment.
                  </Text>
                  <TouchableOpacity
                    testID="pro-refresh"
                    onPress={refresh}
                    style={styles.secondaryButton}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.secondaryButtonText}>Refresh</Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              {sortedPackages.map((pkg) => {
                const meta = getPackageMeta(pkg.product.identifier);
                const price = pkg.product.priceString ?? "";
                const isFeatured = meta.badge === "Popular";

                const order: Record<string, number> = {
                  "rizzgoat.weekly": 1,
                  "rizzgoat.monthly": 2,
                  "rizzgoat.lifetime": 3,
                };

                const rank = order[pkg.product.identifier] ?? 0;
                const isCurrent = activeProProductId != null && activeProProductId === pkg.product.identifier;
                const isDowngrade = currentPlanRank > 0 && rank > 0 && rank < currentPlanRank;
                const isSelected = selectedProductId === pkg.product.identifier;

                const isDisabled = !isConfigured || isLoading || isPurchasingId != null || isCurrent || isDowngrade;

                const title = isCurrent ? `${meta.title} – Current` : meta.title;

                return (
                  <TouchableOpacity
                    key={pkg.identifier}
                    testID={`pro-plan-${pkg.product.identifier}`}
                    onPress={() => {
                      if (isDisabled) return;
                      setSelectedProductId(pkg.product.identifier);
                    }}
                    activeOpacity={0.92}
                    disabled={isDisabled}
                    style={styles.planTouchable}
                  >
                    <LinearGradient
                      colors={
                        isCurrent
                          ? ["rgba(124,255,178,0.14)", "rgba(124,255,178,0.06)"]
                          : isFeatured
                            ? ["rgba(227, 34, 43, 0.28)", "rgba(255, 122, 89, 0.16)"]
                            : isSelected
                              ? ["rgba(255,255,255,0.10)", "rgba(255,255,255,0.05)"]
                              : ["rgba(255,255,255,0.06)", "rgba(255,255,255,0.03)"]
                      }
                      style={[
                        styles.planCard,
                        isFeatured && styles.planCardFeatured,
                        isSelected && styles.planCardSelected,
                        isCurrent && styles.planCardCurrent,
                        isDisabled && styles.planCardDisabled,
                      ]}
                    >
                      <View style={styles.planTopRow}>
                        <View style={styles.planLeft}>
                          <Text style={styles.planTitle}>{title}</Text>
                          <Text style={styles.planSubtitle}>{meta.subtitle}</Text>

                          {isDowngrade ? (
                            <Text style={styles.planNote}>Downgrades managed via App Store.</Text>
                          ) : null}
                        </View>
                        <View style={styles.planRight}>
                          {meta.badge && !isCurrent ? (
                            <View style={isFeatured ? styles.badgeFeatured : styles.badge}>
                              <Text style={isFeatured ? styles.badgeFeaturedText : styles.badgeText}>
                                {meta.badge}
                              </Text>
                            </View>
                          ) : null}
                          <Text style={styles.planPrice}>{price}</Text>
                        </View>
                      </View>

                      <View style={styles.planCtaRow}>
                        {isCurrent ? (
                          <View style={styles.currentPill}>
                            <ShieldCheck size={14} color="#0A0A0A" />
                            <Text style={styles.currentPillText}>Active</Text>
                          </View>
                        ) : isDowngrade ? (
                          <Text style={styles.planCtaTextMuted}>Manage in App Store</Text>
                        ) : (
                          <Text style={styles.planCtaText}>
                            {isSelected ? "Selected" : `Select ${meta.title}`}
                          </Text>
                        )}
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>
                );
              })}

              <View style={styles.purchaseBar} testID="pro-purchase-bar">
                <TouchableOpacity
                  testID="pro-cta"
                  onPress={onPurchaseSelected}
                  style={styles.primaryCtaWrap}
                  activeOpacity={0.9}
                  disabled={!isConfigured || isLoading || isPurchasingId != null || !selectedProductId}
                >
                  <LinearGradient
                    colors={isPurchasingId ? ["rgba(255,255,255,0.12)", "rgba(255,255,255,0.08)"] : ["#E3222B", "#FF7A59"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.primaryCta}
                  >
                    {isPurchasingId ? (
                      <View style={styles.primaryCtaInner}>
                        <ActivityIndicator color="#FFFFFF" />
                        <Text style={styles.primaryCtaText}>Processing…</Text>
                      </View>
                    ) : (
                      <Text style={styles.primaryCtaText}>
                        {isEntitledToPro ? "Upgrade" : "Continue"}
                      </Text>
                    )}

                    <Animated.View
                      pointerEvents="none"
                      style={[
                        styles.successOverlay,
                        {
                          opacity: successOpacity,
                          transform: [{ scale: successScale }],
                        },
                      ]}
                    >
                      <Animated.View
                        style={[
                          styles.successGlow,
                          {
                            opacity: successGlow,
                            transform: [{ scale: successGlow.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.1] }) }],
                          },
                        ]}
                      />
                      <View style={styles.successPill}>
                        <Check size={18} color="#0A0A0A" />
                        <Text style={styles.successText}>Unlocked</Text>
                      </View>
                    </Animated.View>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  testID="pro-restore"
                  onPress={onRestore}
                  style={styles.secondaryButton}
                  activeOpacity={0.85}
                  disabled={!isConfigured || isLoading || isPurchasingId != null}
                >
                  <Text style={styles.secondaryButtonText}>Restore</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.actionsRow}>
                <TouchableOpacity
                  testID="pro-close-secondary"
                  onPress={close}
                  style={styles.ghostButton}
                  activeOpacity={0.85}
                >
                  <Text style={styles.ghostButtonText}>Not now</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.legal}>
                Payment will be charged to your Apple ID account. Subscription automatically renews unless canceled at least 24 hours before the end of the current period.
              </Text>
            </View>

          {isEntitledToPro ? (
            <View style={styles.proSection} testID="pro-manage-section">
              <View style={styles.noticePro}>
                <Text style={styles.noticeTitle}>Your subscription</Text>
                <Text style={styles.noticeText}>
                  {activeProProductId ? `Current plan: ${getPackageMeta(activeProProductId).title}` : "Pro is active."}
                </Text>
              </View>
            </View>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A0A0A",
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 6,
  },
  headerLeft: {
    width: 44,
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  headerRight: {
    width: 44,
    alignItems: "flex-end",
  },
  headerPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  headerPillText: {
    color: "rgba(255,255,255,0.92)",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  hero: {
    paddingTop: 12,
    paddingBottom: 12,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 30,
    fontWeight: "900",
    letterSpacing: -0.4,
  },
  subtitle: {
    marginTop: 10,
    color: "rgba(255,255,255,0.72)",
    fontSize: 15,
    lineHeight: 21,
  },
  proStatus: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: "rgba(124,255,178,0.10)",
    borderWidth: 1,
    borderColor: "rgba(124,255,178,0.22)",
    alignSelf: "flex-start",
  },
  proStatusText: {
    color: "rgba(255,255,255,0.92)",
    fontSize: 14,
    fontWeight: "800",
  },
  proStatusMuted: {
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    alignSelf: "flex-start",
  },
  proStatusMutedText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 13,
    fontWeight: "700",
  },
  benefitsCard: {
    borderRadius: 18,
    padding: 14,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    gap: 10,
  },
  benefitRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  checkDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#FFD166",
    alignItems: "center",
    justifyContent: "center",
  },
  benefitText: {
    flex: 1,
    color: "rgba(255,255,255,0.9)",
    fontSize: 14,
    fontWeight: "600",
  },
  plansSection: {
    marginTop: 18,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  sectionTitle: {
    color: "rgba(255,255,255,0.92)",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.1,
  },
  loadingPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  loadingPillText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
    fontWeight: "700",
  },
  notice: {
    marginBottom: 10,
    borderRadius: 16,
    padding: 14,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  noticePro: {
    marginTop: 18,
    borderRadius: 16,
    padding: 14,
    backgroundColor: "rgba(124,255,178,0.08)",
    borderWidth: 1,
    borderColor: "rgba(124,255,178,0.18)",
  },
  noticeTitle: {
    color: "rgba(255,255,255,0.92)",
    fontSize: 15,
    fontWeight: "800",
  },
  noticeText: {
    marginTop: 6,
    color: "rgba(255,255,255,0.72)",
    fontSize: 13,
    lineHeight: 18,
  },
  planTouchable: {
    marginTop: 10,
  },
  planCard: {
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  planCardFeatured: {
    borderColor: "rgba(227, 34, 43, 0.35)",
  },
  planCardSelected: {
    borderColor: "rgba(255,255,255,0.22)",
  },
  planCardCurrent: {
    borderColor: "rgba(124,255,178,0.35)",
  },
  planCardDisabled: {
    opacity: 0.55,
  },
  planTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  planLeft: {
    flex: 1,
  },
  planRight: {
    alignItems: "flex-end",
    gap: 8,
  },
  planTitle: {
    color: "rgba(255,255,255,0.95)",
    fontSize: 16,
    fontWeight: "900",
  },
  planSubtitle: {
    marginTop: 4,
    color: "rgba(255,255,255,0.68)",
    fontSize: 13,
    fontWeight: "600",
  },
  planNote: {
    marginTop: 8,
    color: "rgba(255,255,255,0.55)",
    fontSize: 12,
    fontWeight: "700",
  },
  planPrice: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: -0.2,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  badgeText: {
    color: "rgba(255,255,255,0.88)",
    fontSize: 12,
    fontWeight: "800",
  },
  badgeFeatured: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(227, 34, 43, 0.22)",
    borderWidth: 1,
    borderColor: "rgba(227, 34, 43, 0.40)",
  },
  badgeFeaturedText: {
    color: "#FFD166",
    fontSize: 12,
    fontWeight: "900",
  },
  planCtaRow: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.10)",
  },
  planCtaText: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 13,
    fontWeight: "800",
  },
  planCtaTextMuted: {
    color: "rgba(255,255,255,0.62)",
    fontSize: 13,
    fontWeight: "800",
  },
  currentPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(124,255,178,0.85)",
    alignSelf: "flex-start",
  },
  currentPillText: {
    color: "#0A0A0A",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.2,
  },
  purchaseBar: {
    marginTop: 14,
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  primaryCtaWrap: {
    flex: 1,
    borderRadius: 16,
    overflow: "hidden",
  },
  primaryCta: {
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 50,
  },
  primaryCtaInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  primaryCtaText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 0.2,
  },
  successOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  successGlow: {
    position: "absolute",
    top: -24,
    left: -24,
    right: -24,
    bottom: -24,
    borderRadius: 20,
    backgroundColor: "rgba(124,255,178,0.20)",
  },
  successPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(124,255,178,0.95)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  successText: {
    color: "#0A0A0A",
    fontSize: 13,
    fontWeight: "900",
  },
  actionsRow: {
    marginTop: 14,
    flexDirection: "row",
    gap: 10,
  },
  actionsRowSingle: {
    marginTop: 12,
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  secondaryButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  secondaryButtonText: {
    color: "rgba(255,255,255,0.88)",
    fontSize: 13,
    fontWeight: "800",
  },
  ghostButton: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
  },
  ghostButtonText: {
    color: "rgba(255,255,255,0.70)",
    fontSize: 13,
    fontWeight: "800",
  },
  primaryButton: {
    flex: 1,
    borderRadius: 14,
    overflow: "hidden",
  },
  primaryButtonGradient: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 14,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0.2,
  },
  legal: {
    marginTop: 12,
    color: "rgba(255,255,255,0.55)",
    fontSize: 12,
    lineHeight: 16,
  },
  proSection: {
    marginTop: 6,
  },
});
