import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Share,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { X, Users, Gift, Zap } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/providers/ThemeProvider";
import { useAppState } from "@/providers/AppStateProvider";

export default function ReferralScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { referralCount } = useAppState();
  
  const progressAnim = useRef(new Animated.Value(0)).current;
  const numberFlipAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(progressAnim, {
        toValue: referralCount / 5,
        duration: 1000,
        useNativeDriver: false,
      }),
      Animated.spring(numberFlipAnim, {
        toValue: 1,
        friction: 3,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, [referralCount]);

  const handleReferFriend = async () => {
    try {
      await Share.share({
        message: "Check out RizzGoat - the ultimate dating app assistant! Use my code RIZZ2024 for a free month of Pro. Download: https://rizzgoat.app",
      });
    } catch (error) {
      console.log("Share error:", error);
    }
  };

  const benefits = [
    { icon: Zap, title: "Unlimited Pickup Lines", description: "No daily limits" },
    { icon: Gift, title: "Advanced AI Analysis", description: "Deeper conversation insights" },
    { icon: Users, title: "Priority Support", description: "Get help faster" },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <LinearGradient
        colors={["#E3222B", "#FF7A59"]}
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
          <View style={styles.heroSection}>
            <Animated.View
              style={[
                styles.iconContainer,
                { transform: [{ scale: numberFlipAnim }] },
              ]}
            >
              <Users size={48} color="#FFFFFF" />
            </Animated.View>
            <Text style={styles.title}>Unlock Our Most Advanced Rizz</Text>
            <Text style={styles.subtitle}>
              Invite 5 friends and get Pro features forever
            </Text>
          </View>

          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressTitle}>Your Progress</Text>
              <Animated.Text
                style={[
                  styles.progressCount,
                  { transform: [{ scale: numberFlipAnim }] },
                ]}
              >
                {referralCount}/5
              </Animated.Text>
            </View>
            <View style={styles.progressBar}>
              <Animated.View
                style={[
                  styles.progressFill,
                  {
                    width: progressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ["0%", "100%"],
                    }),
                  },
                ]}
              />
              {[...Array(5)].map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.progressDot,
                    { left: `${index * 25}%` },
                    index < referralCount && styles.progressDotActive,
                  ]}
                />
              ))}
            </View>
            <Text style={styles.progressDescription}>
              {5 - referralCount} more friends to unlock Pro
            </Text>
          </View>

          <View style={styles.benefitsSection}>
            <Text style={styles.benefitsTitle}>What You'll Unlock</Text>
            {benefits.map((benefit, index) => (
              <View key={index} style={styles.benefitCard}>
                <View style={styles.benefitIcon}>
                  <benefit.icon size={24} color="#E3222B" />
                </View>
                <View style={styles.benefitContent}>
                  <Text style={styles.benefitTitle}>{benefit.title}</Text>
                  <Text style={styles.benefitDescription}>{benefit.description}</Text>
                </View>
              </View>
            ))}
          </View>

          <TouchableOpacity
            onPress={handleReferFriend}
            style={styles.referButton}
            activeOpacity={0.9}
          >
            <Text style={styles.referButtonText}>Refer a Friend</Text>
          </TouchableOpacity>

          <Text style={styles.terms}>
            Friends must sign up using your referral link and verify their account
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
    height: 400,
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
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
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
  progressSection: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 20,
    padding: 24,
    marginBottom: 32,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000000",
  },
  progressCount: {
    fontSize: 24,
    fontWeight: "800",
    color: "#E3222B",
  },
  progressBar: {
    height: 8,
    backgroundColor: "rgba(0, 0, 0, 0.1)",
    borderRadius: 4,
    position: "relative",
    marginBottom: 12,
  },
  progressFill: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: "#E3222B",
    borderRadius: 4,
  },
  progressDot: {
    position: "absolute",
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "rgba(0, 0, 0, 0.2)",
    top: -4,
    transform: [{ translateX: -8 }],
  },
  progressDotActive: {
    backgroundColor: "#E3222B",
  },
  progressDescription: {
    fontSize: 14,
    color: "rgba(0, 0, 0, 0.6)",
    textAlign: "center",
  },
  benefitsSection: {
    marginBottom: 32,
  },
  benefitsTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 16,
  },
  benefitCard: {
    flexDirection: "row",
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  benefitIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(227, 34, 43, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  benefitContent: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000000",
    marginBottom: 4,
  },
  benefitDescription: {
    fontSize: 14,
    color: "rgba(0, 0, 0, 0.6)",
  },
  referButton: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: "center",
    marginBottom: 16,
  },
  referButtonText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#E3222B",
  },
  terms: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.8)",
    textAlign: "center",
  },
});