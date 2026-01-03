import React, { useEffect, useRef } from "react"
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Platform,
  StatusBar,
  Image,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { LinearGradient } from "expo-linear-gradient"
import { useRouter } from "expo-router"
import { Menu, Camera, MessageCircle, Sparkles, Zap, Heart } from "lucide-react-native"
import { useTheme } from "@/providers/ThemeProvider"
import { useAppState } from "@/providers/AppStateProvider"
import { useRevenueCat } from "@/providers/RevenueCatProvider"
import { useLanguage } from "@/providers/LanguageProvider"
import OnboardingScreen from "./onboarding"
import * as Haptics from "expo-haptics"
import * as StoreReview from "expo-store-review"

export default function HomeScreen() {
  const router = useRouter()
  const { theme, isDark } = useTheme()
  const { showOnboarding, isPro } = useAppState()
  const { isEntitledToPro } = useRevenueCat()
  const { t } = useLanguage()

  const cardOpacity = useRef(new Animated.Value(0)).current
  const cardTranslateY = useRef(new Animated.Value(24)).current
  const pulseAnim = useRef(new Animated.Value(1)).current

  useEffect(() => {
    if (showOnboarding) return

    Animated.parallel([
      Animated.timing(cardOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(cardTranslateY, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start()

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.04,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start()
  }, [showOnboarding])

  if (showOnboarding) return <OnboardingScreen />

  const handleCardPress = async (route: string) => {
    if (Platform.OS !== "web") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    }
    if (!isPro && !isEntitledToPro) {
      router.push("/pro" as any)
      return
    }
    router.push(route as any)
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => router.push("/settings")}
              style={styles.headerButton}
            >
              <Menu size={20} color={theme.text} />
            </TouchableOpacity>

            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <Image
                source={{ uri: "https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/ek2ke9nhbppv934qyqow5" }}
                style={styles.logo}
                resizeMode="contain"
              />
            </Animated.View>

            <TouchableOpacity
              onPress={async () => {
                if (Platform.OS === "ios" && (await StoreReview.isAvailableAsync())) {
                  await StoreReview.requestReview()
                }
              }}
              style={styles.headerButton}
            >
              <Heart size={20} color={theme.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.taglineContainer}>
            <Text style={[styles.tagline, { color: theme.textSecondary }]}>
              {t("home.tagline")}
            </Text>
            <View style={styles.taglineAccent}>
              <Zap size={16} color={theme.primary} />
              <Text style={[styles.taglineAccentText, { color: theme.primary }]}>
                {t("home.aiPowered")}
              </Text>
            </View>
          </View>

          <Animated.View
            style={[
              styles.cardsContainer,
              { opacity: cardOpacity, transform: [{ translateY: cardTranslateY }] },
            ]}
          >
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => handleCardPress("/screenshot-advisor")}
            >
              <LinearGradient
                colors={["rgba(227,34,43,0.18)", "rgba(255,122,89,0.12)"]}
                style={styles.card}
              >
                <View style={styles.cardHeader}>
                  <LinearGradient colors={["#E3222B", "#FF7A59"]} style={styles.cardIcon}>
                    <Camera size={26} color="#fff" />
                  </LinearGradient>
                  <View style={styles.badge}><Text style={styles.badgeText}>{t("home.screenshotCard.badge")}</Text></View>
                </View>
                <Text style={styles.cardTitle}>{t("home.screenshotCard.title")}</Text>
                <Text style={styles.cardDesc}>{t("home.screenshotCard.description")}</Text>
                <Text style={styles.cardCTA}>{t("home.screenshotCard.cta")}</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => handleCardPress("/pickup-lines")}
            >
              <LinearGradient
                colors={["rgba(255,122,89,0.18)", "rgba(255,184,140,0.12)"]}
                style={styles.card}
              >
                <View style={styles.cardHeader}>
                  <LinearGradient colors={["#FF7A59", "#FFB88C"]} style={styles.cardIcon}>
                    <Sparkles size={26} color="#fff" />
                  </LinearGradient>
                  <View style={styles.badge}><Text style={styles.badgeText}>{t("home.pickupCard.badge")}</Text></View>
                </View>
                <Text style={styles.cardTitle}>{t("home.pickupCard.title")}</Text>
                <Text style={styles.cardDesc}>{t("home.pickupCard.description")}</Text>
                <Text style={styles.cardCTA}>{t("home.pickupCard.cta")}</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => handleCardPress("/chat")}
            >
              <LinearGradient
                colors={["rgba(139,92,246,0.18)", "rgba(167,139,250,0.12)"]}
                style={styles.card}
              >
                <View style={styles.cardHeader}>
                  <LinearGradient colors={["#8B5CF6", "#A78BFA"]} style={styles.cardIcon}>
                    <MessageCircle size={26} color="#fff" />
                  </LinearGradient>
                  <View style={styles.badge}><Text style={styles.badgeText}>{t("home.chatCard.badge")}</Text></View>
                </View>
                <Text style={styles.cardTitle}>{t("home.chatCard.title")}</Text>
                <Text style={styles.cardDesc}>{t("home.chatCard.description")}</Text>
                <Text style={styles.cardCTA}>{t("home.chatCard.cta")}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

          <View style={styles.footer}>
            <LinearGradient colors={["rgba(255,255,255,0.06)", "rgba(255,255,255,0.02)"]} style={styles.footerCard}>
              <Text style={styles.footerText}>{t("home.proTip")}</Text>
            </LinearGradient>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  safeArea: { flex: 1, backgroundColor: "#000" },
  scrollContent: { paddingBottom: 32 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  logo: { width: 170, height: 60 },
  taglineContainer: { alignItems: "center", marginBottom: 16 },
  tagline: { fontSize: 22, fontWeight: "600" },
  taglineAccent: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  taglineAccentText: { fontSize: 16, fontWeight: "700" },
  cardsContainer: { paddingHorizontal: 20, gap: 14 },
  card: { borderRadius: 28, padding: 16 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  cardIcon: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  badge: { backgroundColor: "#E3222B", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "800" },
  cardTitle: { fontSize: 18, fontWeight: "800", color: "#fff" },
  cardDesc: { fontSize: 13, lineHeight: 19, color: "rgba(255,255,255,0.75)", marginTop: 2 },
  cardCTA: { marginTop: 8, fontSize: 14, fontWeight: "700", color: "#FF7A59" },
  footer: { paddingHorizontal: 20, marginTop: 20 },
  footerCard: { borderRadius: 20, padding: 20 },
  footerText: { textAlign: "center", color: "rgba(255,255,255,0.75)" },
})
