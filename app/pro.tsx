import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Alert,
  Platform,
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

export default function ProScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { isTrialActive, startFreeTrial, subscribe } = useAppState();
  const { 
    getPackagePrice, 
    getPackage, 
    purchase, 
    isPurchasing, 
    isLoading: isRevenueCatLoading,
    restore,
    isRestoring,
    hasActiveEntitlement,
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
  }, []);

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

  const handleSubscribe = async (p: "weekly" | "monthly" | "annual") => {
    try {
      if (Platform.OS !== "web") {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      
      const pkg = getPackage(p);
      if (pkg && Platform.OS !== "web") {
        console.log("Pro: Purchasing package", pkg.identifier);
        await purchase(pkg);
      } else {
        console.log("Pro: No package found or web platform, using local subscribe");
        await subscribe(p);
      }
      
      Alert.alert("Subscribed", "Your plan is now active.");
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace("/");
      }
    } catch (err: any) {
      if (err?.userCancelled) {
        console.log("Pro: User cancelled purchase");
        return;
      }
      Alert.alert("Error", "Subscription failed. Please try again.");
    }
  };

  const handleRestore = async () => {
    try {
      if (Platform.OS !== "web") {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      await restore();
      
      if (hasActiveEntitlement()) {
        Alert.alert("Restored", "Your subscription has been restored.");
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace("/");
        }
      } else {
        Alert.alert("No Purchases", "No previous purchases found.");
      }
    } catch {
      Alert.alert("Error", "Could not restore purchases. Please try again.");
    }
  };

  const weeklyPrice = getPackagePrice("weekly");
  const monthlyPrice = getPackagePrice("monthly");
  const annualPrice = getPackagePrice("annual");

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
          <TouchableOpacity onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/');
            }
          }} style={styles.closeButton} testID="pro-close">
            <X size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
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
              {isTrialActive ? "Your 3-day trial is active. Pick a plan to continue afterward." : "Start a 3-day free trial. Cancel anytime."}
            </Text>
          </Animated.View>

          <Animated.View
            style={[
              styles.featuresSection,
              { opacity: featuresAnim },
            ]}
          >
            {FEATURES.map((feature, index) => (
              <View key={index} style={styles.featureRow}>
                <View style={styles.checkContainer}>
                  <Check size={16} color="#10B981" />
                </View>
                <Text style={styles.featureText}>{feature.text}</Text>
              </View>
            ))}
          </Animated.View>

          {!isTrialActive ? (
            <View style={styles.ctaSection}>
              <LinearGradient colors={["#E3222B", "#FF7A59"]} style={styles.ctaCard}>
                <Text style={styles.ctaTitle}>3-Day Free Trial</Text>
                <Text style={styles.ctaSubtitle}>Then {weeklyPrice.priceString}/week, {monthlyPrice.priceString}/month, or {annualPrice.priceString}/year</Text>
                <TouchableOpacity onPress={handleStartTrial} activeOpacity={0.9} style={styles.ctaButton} testID="start-trial-btn">
                  <Text style={styles.ctaButtonText}>Start Free Trial</Text>
                </TouchableOpacity>
              </LinearGradient>
            </View>
          ) : (
            <View style={styles.plansSection}>
              <TouchableOpacity onPress={() => handleSubscribe("weekly")} style={styles.planCard} activeOpacity={0.9} testID="plan-weekly" disabled={isPurchasing}>
                <View style={styles.planHeader}>
                  <Text style={styles.planName}>Weekly</Text>
                  <View style={styles.popularBadge}>
                    <Text style={styles.popularText}>FLEX</Text>
                  </View>
                </View>
                <Text style={styles.planPrice}>{isRevenueCatLoading ? "..." : weeklyPrice.priceString}</Text>
                <Text style={styles.planPeriod}>per week</Text>
                <LinearGradient colors={["#E3222B", "#FF7A59"]} style={[styles.planButton, isPurchasing && styles.disabledButton]}>
                  <Text style={styles.planButtonText}>{isPurchasing ? "Processing..." : "Continue"}</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => handleSubscribe("monthly")} style={styles.planCard} activeOpacity={0.9} testID="plan-monthly" disabled={isPurchasing}>
                <View style={styles.planHeader}>
                  <Text style={styles.planName}>Monthly</Text>
                  <View style={styles.popularBadge}>
                    <Text style={styles.popularText}>POPULAR</Text>
                  </View>
                </View>
                <Text style={styles.planPrice}>{isRevenueCatLoading ? "..." : monthlyPrice.priceString}</Text>
                <Text style={styles.planPeriod}>per month</Text>
                <LinearGradient colors={["#8B5CF6", "#A78BFA"]} style={[styles.planButton, isPurchasing && styles.disabledButton]}>
                  <Text style={styles.planButtonText}>{isPurchasing ? "Processing..." : "Continue"}</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => handleSubscribe("annual")} style={[styles.planCard, styles.bestValueCard]} activeOpacity={0.9} testID="plan-annual" disabled={isPurchasing}>
                <View style={styles.bestValueBadge}>
                  <Zap size={16} color="#FFFFFF" />
                  <Text style={styles.bestValueText}>BEST VALUE</Text>
                </View>
                <View style={styles.planHeader}>
                  <Text style={styles.planName}>Annual</Text>
                  <Text style={styles.saveBadge}>Save more</Text>
                </View>
                <Text style={styles.planPrice}>{isRevenueCatLoading ? "..." : annualPrice.priceString}</Text>
                <Text style={styles.planPeriod}>per year</Text>
                <LinearGradient colors={["#10B981", "#34D399"]} style={[styles.planButton, isPurchasing && styles.disabledButton]}>
                  <Text style={styles.planButtonText}>{isPurchasing ? "Processing..." : "Continue"}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}

          <Text style={styles.terms}>
            • 3-day free trial then chosen plan applies{"\n"}
            • Cancel anytime in Settings{"\n"}
            • Prices in USD
          </Text>

          {Platform.OS !== "web" && (
            <TouchableOpacity 
              onPress={handleRestore} 
              style={styles.restoreButton} 
              disabled={isRestoring}
              testID="restore-purchases"
            >
              <Text style={styles.restoreText}>
                {isRestoring ? "Restoring..." : "Restore Purchases"}
              </Text>
            </TouchableOpacity>
          )}
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
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  popularText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#E3222B",
  },
  saveBadge: {
    fontSize: 14,
    fontWeight: "600",
    color: "#10B981",
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
  restoreButton: {
    marginTop: 16,
    paddingVertical: 12,
    alignItems: "center" as const,
  },
  restoreText: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.7)",
    textDecorationLine: "underline" as const,
  },
  disabledButton: {
    opacity: 0.6,
  },
});