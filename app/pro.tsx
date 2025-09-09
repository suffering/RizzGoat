import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { X, Check, Sparkles, Zap, Crown } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/providers/ThemeProvider";

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

  const handleSubscribe = (plan: string) => {
    Alert.alert(
      "Subscribe to Pro",
      `You selected the ${plan} plan. Payment processing would happen here.`,
      [{ text: "OK" }]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <LinearGradient
        colors={["#8B5CF6", "#EC4899"]}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
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
            <View style={styles.crownContainer}>
              <Crown size={64} color="#FFFFFF" />
              <Sparkles
                size={24}
                color="#FFFFFF"
                style={styles.sparkle1}
              />
              <Sparkles
                size={20}
                color="#FFFFFF"
                style={styles.sparkle2}
              />
            </View>
            <Text style={styles.title}>Upgrade to RizzGoat Pro</Text>
            <Text style={styles.subtitle}>
              Unlock your full potential with premium features
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

          <View style={styles.plansSection}>
            <TouchableOpacity
              onPress={() => handleSubscribe("Monthly")}
              style={styles.planCard}
              activeOpacity={0.9}
            >
              <View style={styles.planHeader}>
                <Text style={styles.planName}>Monthly</Text>
                <View style={styles.popularBadge}>
                  <Text style={styles.popularText}>POPULAR</Text>
                </View>
              </View>
              <Text style={styles.planPrice}>$9.99</Text>
              <Text style={styles.planPeriod}>per month</Text>
              <LinearGradient
                colors={["#E3222B", "#FF7A59"]}
                style={styles.planButton}
              >
                <Text style={styles.planButtonText}>Start Free Trial</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleSubscribe("Annual")}
              style={[styles.planCard, styles.bestValueCard]}
              activeOpacity={0.9}
            >
              <View style={styles.bestValueBadge}>
                <Zap size={16} color="#FFFFFF" />
                <Text style={styles.bestValueText}>BEST VALUE</Text>
              </View>
              <View style={styles.planHeader}>
                <Text style={styles.planName}>Annual</Text>
                <Text style={styles.saveBadge}>Save 50%</Text>
              </View>
              <Text style={styles.planPrice}>$59.99</Text>
              <Text style={styles.planPeriod}>per year</Text>
              <LinearGradient
                colors={["#8B5CF6", "#EC4899"]}
                style={styles.planButton}
              >
                <Text style={styles.planButtonText}>Start Free Trial</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <Text style={styles.terms}>
            • 7-day free trial then auto-renews{"\n"}
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
  gradient: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: 450,
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
    marginBottom: 40,
  },
  crownContainer: {
    position: "relative",
    marginBottom: 24,
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
    fontSize: 32,
    fontWeight: "800",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.9)",
    textAlign: "center",
  },
  featuresSection: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 20,
    padding: 24,
    marginBottom: 32,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  checkContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  featureText: {
    fontSize: 15,
    color: "#000000",
    flex: 1,
  },
  plansSection: {
    gap: 16,
    marginBottom: 24,
  },
  planCard: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 20,
    padding: 24,
    position: "relative",
  },
  bestValueCard: {
    borderWidth: 2,
    borderColor: "#8B5CF6",
  },
  bestValueBadge: {
    position: "absolute",
    top: -12,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#8B5CF6",
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
    fontSize: 36,
    fontWeight: "800",
    color: "#000000",
    marginBottom: 4,
  },
  planPeriod: {
    fontSize: 14,
    color: "rgba(0, 0, 0, 0.6)",
    marginBottom: 20,
  },
  planButton: {
    paddingVertical: 16,
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