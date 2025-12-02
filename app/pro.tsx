import React, { useRef, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Alert,
  Platform,
  ActivityIndicator
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { X, Check, Sparkles, Zap, Crown, Crown as CrownIcon } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/providers/ThemeProvider";
import * as Haptics from "expo-haptics";
import Purchases from "react-native-purchases";

const FEATURES = [
  { text: "Unlimited pickup lines", pro: true },
  { text: "Advanced screenshot analysis", pro: true },
  { text: "Priority AI responses", pro: true },
  { text: "Custom tone settings", pro: true },
  { text: "Save unlimited favorites", pro: true },
  { text: "Ad-free experience", pro: true },
  { text: "Early access to new features", pro: true },
  { text: "24/7 priority support", pro: true }
];

export default function ProScreen() {
  const router = useRouter();
  const { theme } = useTheme();

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const featuresAnim = useRef(new Animated.Value(0)).current;

  const [offerings, setOfferings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 3,
        tension: 40,
        useNativeDriver: true
      }),
      Animated.timing(featuresAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true
      })
    ]).start();
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const o = await Purchases.getOfferings();
        setOfferings(o);
      } catch {}
      setLoading(false);
    }
    load();
  }, []);

  async function purchasePackage(pkg: any) {
    try {
      setPurchasing(true);
      if (Platform.OS !== "web") {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      const result = await Purchases.purchasePackage(pkg);
      if (result.customerInfo.entitlements.active["RizzGoat Pro"]) {
        router.back();
      }
    } catch (e: any) {
      if (!e.userCancelled) {
        Alert.alert("Error", "Purchase failed. Please try again.");
      }
    }
    setPurchasing(false);
  }

  async function restore() {
    try {
      setPurchasing(true);
      const info = await Purchases.restorePurchases();
      if (info.entitlements.active["RizzGoat Pro"]) {
        router.back();
      } else {
        Alert.alert("No Active Subscription", "We could not find an active subscription.");
      }
    } catch {
      Alert.alert("Error", "Could not restore purchases.");
    }
    setPurchasing(false);
  }

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background, justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color="#FFFFFF" />
      </View>
    );
  }

  const primaryOffering = offerings?.current?.availablePackages || [];

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
            <Text style={styles.subtitle}>Access every premium feature instantly</Text>
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

          <View style={styles.plansSection}>
            {primaryOffering.map((pkg: any, index: number) => (
              <TouchableOpacity
                key={index}
                onPress={() => purchasePackage(pkg)}
                activeOpacity={0.9}
                style={styles.planCard}
              >
                <View style={styles.planHeader}>
                  <Text style={styles.planName}>{pkg.product.title}</Text>
                  <View style={styles.popularBadge}>
                    <Text style={styles.popularText}>POPULAR</Text>
                  </View>
                </View>

                <Text style={styles.planPrice}>{pkg.product.priceString}</Text>
                <Text style={styles.planPeriod}>{pkg.product.description}</Text>

                <LinearGradient colors={["#E3222B", "#FF7A59"]} style={styles.planButton}>
                  <Text style={styles.planButtonText}>{purchasing ? "Processing..." : "Continue"}</Text>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity onPress={restore} style={{ marginTop: 20 }}>
            <Text style={{ color: "#FFF", textAlign: "center", fontSize: 14 }}>Restore Purchases</Text>
          </TouchableOpacity>

          <Text style={styles.terms}>• Cancel anytime{"\n"}• Prices vary by region</Text>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  bg: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0 },
  topGlow: { position: "absolute", left: -60, right: -60, top: -40, height: 360, borderBottomLeftRadius: 300, borderBottomRightRadius: 300 },
  safeArea: { flex: 1 },
  header: { alignItems: "flex-end", paddingHorizontal: 20, paddingVertical: 16 },
  closeButton: { padding: 8 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  heroSection: { alignItems: "center", marginBottom: 32 },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 },
  brandBadge: { width: 34, height: 34, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  brandText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  crownContainer: { position: "relative", marginBottom: 18 },
  sparkle1: { position: "absolute", top: -10, right: -20 },
  sparkle2: { position: "absolute", bottom: -5, left: -15 },
  title: { fontSize: 28, fontWeight: "800", color: "#FFFFFF", textAlign: "center", marginBottom: 10 },
  subtitle: { fontSize: 14, color: "rgba(255, 255, 255, 0.9)", textAlign: "center" },
  featuresSection: { backgroundColor: "rgba(255, 255, 255, 0.95)", borderRadius: 20, padding: 20, marginTop: 18, marginBottom: 22 },
  featureRow: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  checkContainer: { width: 24, height: 24, borderRadius: 12, backgroundColor: "rgba(16, 185, 129, 0.12)", justifyContent: "center", alignItems: "center", marginRight: 12 },
  featureText: { fontSize: 15, color: "#000000", flex: 1 },
  plansSection: { gap: 16, marginBottom: 24 },
  planCard: { backgroundColor: "rgba(255, 255, 255, 0.96)", borderRadius: 20, padding: 24, position: "relative" },
  planHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  planName: { fontSize: 20, fontWeight: "700", color: "#000000" },
  popularBadge: { backgroundColor: "#FEE2E2", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  popularText: { fontSize: 10, fontWeight: "700", color: "#E3222B" },
  planPrice: { fontSize: 32, fontWeight: "800", color: "#000000", marginBottom: 4 },
  planPeriod: { fontSize: 14, color: "rgba(0, 0, 0, 0.6)", marginBottom: 16 },
  planButton: { paddingVertical: 14, borderRadius: 12, alignItems: "center" },
  planButtonText: { fontSize: 16, fontWeight: "700", color: "#FFFFFF" },
  terms: { fontSize: 12, color: "rgba(255, 255, 255, 0.8)", textAlign: "center", lineHeight: 18, marginTop: 16 }
});
