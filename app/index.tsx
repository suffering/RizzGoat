import React, { useEffect, useRef } from "react";
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Menu, Camera, MessageCircle, Sparkles, Zap, Heart } from "lucide-react-native";
import { useTheme } from "@/providers/ThemeProvider";
import { useAppState } from "@/providers/AppStateProvider";
import { useRevenueCat } from "@/providers/RevenueCatProvider";
import { useLanguage } from "@/providers/LanguageProvider";
import OnboardingScreen from "./onboarding";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as StoreReview from "expo-store-review";



export default function HomeScreen() {
  const router = useRouter();
  const { theme, isDark } = useTheme();
  const { showOnboarding, isPro } = useAppState();
  const { isEntitledToPro, isConfigured } = useRevenueCat();
  const { t } = useLanguage();
  const prevShowOnboarding = useRef<boolean>(showOnboarding);
  
  const logoScale = useRef(new Animated.Value(0)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const cardTranslateY = useRef(new Animated.Value(50)).current;
  const scrollY = useRef(new Animated.Value(0)).current;
  const floatingAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;



  useEffect(() => {
    if (showOnboarding) return;
    
    
    // Logo bounce animation
    Animated.sequence([
      Animated.timing(logoScale, {
        toValue: 1.2,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 3,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    // Cards fade in
    Animated.parallel([
      Animated.timing(cardOpacity, {
        toValue: 1,
        duration: 600,
        delay: 300,
        useNativeDriver: true,
      }),
      Animated.timing(cardTranslateY, {
        toValue: 0,
        duration: 600,
        delay: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Floating animation for background elements
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatingAnim, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(floatingAnim, {
          toValue: 0,
          duration: 3000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Pulse animation for logo
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [logoScale, cardOpacity, cardTranslateY, floatingAnim, pulseAnim, showOnboarding]);

  
  useEffect(() => {
    const wasOnboarding = prevShowOnboarding.current;
    prevShowOnboarding.current = showOnboarding;

    if (wasOnboarding && !showOnboarding) {
      (async () => {
        try {
          const stored = await AsyncStorage.getItem("didShowProAfterOnboarding_v1");
          const alreadyShown = stored === "true";
          if (alreadyShown) {
            console.log("[ProGate] already shown after onboarding; skipping");
            return;
          }

          const shouldShowPaywall = !isEntitledToPro;
          console.log("[ProGate] onboarding complete", {
            isConfigured,
            isEntitledToPro,
            shouldShowPaywall,
          });

          if (shouldShowPaywall) {
            await AsyncStorage.setItem("didShowProAfterOnboarding_v1", "true");
            router.push("/pro" as any);
          } else {
            await AsyncStorage.setItem("didShowProAfterOnboarding_v1", "true");
          }
        } catch (e) {
          console.log("[ProGate] error gating after onboarding", e);
          router.push("/pro" as any);
        }
      })();
    }
  }, [isConfigured, isEntitledToPro, router, showOnboarding]);

  const handleRateUs = React.useCallback(async () => {
    console.log("[HomeScreen] Rate Us pressed", { platform: Platform.OS });

    if (Platform.OS !== "ios") {
      return;
    }

    try {
      const isAvailable = await StoreReview.isAvailableAsync();
      if (!isAvailable) {
        return;
      }

      await StoreReview.requestReview();
    } catch (error) {
      console.log("[HomeScreen] Rate Us requestReview error (ignored)", error);
    }
  }, []);

  if (showOnboarding) {
    return <OnboardingScreen />;
  }

  const handleCardPress = async (route: string) => {
    if (Platform.OS !== "web") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (!isPro && !isEntitledToPro) {
      router.push("/pro" as any);
      return;
    }
    router.push(route as any);
  };



  return (
    <View style={[styles.container, { backgroundColor: '#000000' }]}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" translucent />

      {/* Floating Background Elements */}
      <Animated.View 
        style={[
          styles.floatingElement,
          styles.floatingElement2,
          {
            transform: [
              {
                translateY: floatingAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 15],
                }),
              },
              {
                rotate: floatingAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0deg', '-3deg'],
                }),
              },
            ],
          },
        ]}
      >
        <LinearGradient
          colors={['rgba(139, 92, 246, 0.08)', 'rgba(167, 139, 250, 0.04)']}
          style={styles.floatingGradient}
        />
      </Animated.View>
      
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <ScrollView
          contentInsetAdjustmentBehavior="never"
          automaticallyAdjustContentInsets={false}
          contentContainerStyle={[styles.scrollContent, { backgroundColor: '#000000' }]}
          showsVerticalScrollIndicator={false}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: false }
          )}
          scrollEventThrottle={16}
          style={[styles.scrollView, { backgroundColor: '#000000' }]}
        >
          <View style={styles.scrollInner} testID="home_scroll_inner">
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <TouchableOpacity 
                  onPress={() => router.push("/settings")}
                  style={[styles.menuButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', zIndex: 100 }]}
                >
                  <Menu size={20} color={theme.text} />
                </TouchableOpacity>
              </View>
              <View style={styles.headerCenter} pointerEvents="none">
                <Animated.View style={[styles.headerLogoContainer, { transform: [{ scale: logoScale }] }]} pointerEvents="none">
                  <Animated.View style={[styles.headerPulseContainer, { transform: [{ scale: pulseAnim }] }]} pointerEvents="none">
                    <Image 
                      source={{ uri: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/ek2ke9nhbppv934qyqow5' }}
                      style={styles.headerLogoImage}
                      resizeMode="contain"
                    />
                  </Animated.View>
                </Animated.View>
              </View>
              <View style={styles.headerRight}>
                <TouchableOpacity 
                  onPress={handleRateUs}
                  style={[styles.notificationButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', zIndex: 100 }]}
                >
                  <Heart size={20} color={theme.text} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.taglineContainer}>
              <Text style={[styles.tagline, { color: theme.textSecondary }]}>
                {t('home.tagline')}
              </Text>
              <View style={styles.taglineAccent}>
                <Zap size={16} color={theme.primary} />
                <Text style={[styles.taglineAccentText, { color: theme.primary }]}>{t('home.aiPowered')}</Text>
              </View>
            </View>

          <Animated.View
            style={[
              styles.cardsContainer,
              {
                opacity: cardOpacity,
                transform: [{ translateY: cardTranslateY }],
              },
            ]}
          >
            <View testID="home_screenshot_card_measure">
              <TouchableOpacity
              testID="home_card_screenshot"
              activeOpacity={0.8}
              onPress={() => handleCardPress("/screenshot-advisor")}
              style={styles.cardWrapper}
            >
              <LinearGradient
                colors={isDark ? ['rgba(227, 34, 43, 0.15)', 'rgba(255, 122, 89, 0.1)'] : ['rgba(227, 34, 43, 0.05)', 'rgba(255, 122, 89, 0.02)']}
                style={[styles.card, { borderColor: isDark ? 'rgba(227, 34, 43, 0.3)' : 'rgba(227, 34, 43, 0.1)' }]}
              >
                <View style={styles.cardHeader}>
                  <LinearGradient
                    colors={["#E3222B", "#FF7A59"]}
                    style={styles.cardIcon}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Camera size={26} color="#FFFFFF" />
                  </LinearGradient>
                  <View style={styles.cardBadge}>
                    <Text style={styles.cardBadgeText}>{t('home.screenshotCard.badge')}</Text>
                  </View>
                </View>
                <View style={styles.cardContent}>
                  <Text style={[styles.cardTitle, { color: theme.text }]}>
                    {t('home.screenshotCard.title')}
                  </Text>
                  <Text style={[styles.cardDescription, { color: theme.textSecondary }]}>
                    {t('home.screenshotCard.description')}
                  </Text>
                  <View style={styles.cardFooter}>
                    <Text style={[styles.cardFooterText, { color: theme.primary }]}>{t('home.screenshotCard.cta')}</Text>
                  </View>
                </View>
              </LinearGradient>
            </TouchableOpacity>
            </View>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => handleCardPress("/pickup-lines")}
              style={styles.cardWrapper}
            >
              <LinearGradient
                colors={isDark ? ['rgba(255, 122, 89, 0.15)', 'rgba(255, 184, 140, 0.1)'] : ['rgba(255, 122, 89, 0.05)', 'rgba(255, 184, 140, 0.02)']}
                style={[styles.card, { borderColor: isDark ? 'rgba(255, 122, 89, 0.3)' : 'rgba(255, 122, 89, 0.1)' }]}
              >
                <View style={styles.cardHeader}>
                  <LinearGradient
                    colors={["#FF7A59", "#FFB88C"]}
                    style={styles.cardIcon}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Sparkles size={26} color="#FFFFFF" />
                  </LinearGradient>
                  <View style={[styles.cardBadge, { backgroundColor: '#FF7A59' }]}>
                    <Text style={styles.cardBadgeText}>{t('home.pickupCard.badge')}</Text>
                  </View>
                </View>
                <View style={styles.cardContent}>
                  <Text style={[styles.cardTitle, { color: theme.text }]}>
                    {t('home.pickupCard.title')}
                  </Text>
                  <Text style={[styles.cardDescription, { color: theme.textSecondary }]}>
                    {t('home.pickupCard.description')}
                  </Text>
                  <View style={styles.cardFooter}>
                    <Text style={[styles.cardFooterText, { color: '#FF7A59' }]}>{t('home.pickupCard.cta')}</Text>
                  </View>
                </View>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => handleCardPress("/chat")}
              style={styles.cardWrapper}
            >
              <LinearGradient
                colors={isDark ? ['rgba(139, 92, 246, 0.15)', 'rgba(167, 139, 250, 0.1)'] : ['rgba(139, 92, 246, 0.05)', 'rgba(167, 139, 250, 0.02)']}
                style={[styles.card, { borderColor: isDark ? 'rgba(139, 92, 246, 0.3)' : 'rgba(139, 92, 246, 0.1)' }]}
              >
                <View style={styles.cardHeader}>
                  <LinearGradient
                    colors={["#8B5CF6", "#A78BFA"]}
                    style={styles.cardIcon}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <MessageCircle size={26} color="#FFFFFF" />
                  </LinearGradient>
                  <View style={[styles.cardBadge, { backgroundColor: '#8B5CF6' }]}>
                    <Text style={styles.cardBadgeText}>{t('home.chatCard.badge')}</Text>
                  </View>
                </View>
                <View style={styles.cardContent}>
                  <Text style={[styles.cardTitle, { color: theme.text }]}>
                    {t('home.chatCard.title')}
                  </Text>
                  <Text style={[styles.cardDescription, { color: theme.textSecondary }]}>
                    {t('home.chatCard.description')}
                  </Text>
                  <View style={styles.cardFooter}>
                    <Text style={[styles.cardFooterText, { color: '#8B5CF6' }]}>{t('home.chatCard.cta')}</Text>
                  </View>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

          <View style={styles.footer}>
            <LinearGradient
              colors={isDark ? ['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.02)'] : ['rgba(0,0,0,0.02)', 'rgba(0,0,0,0.01)']}
              style={styles.footerCard}
            >
              <Text style={[styles.footerText, { color: theme.textSecondary }]}>
                {t('home.proTip')}
              </Text>
            </LinearGradient>
          </View>

          </View>
        </ScrollView>
      </SafeAreaView>
      

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  gradient: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  floatingElement: {
    position: "absolute",
    borderRadius: 100,
  },
  floatingElement1: {
    width: 200,
    height: 200,
    top: 100,
    right: -50,
  },
  floatingElement2: {
    width: 150,
    height: 150,
    bottom: 200,
    left: -30,
  },
  floatingGradient: {
    flex: 1,
    borderRadius: 100,
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 0,
    paddingBottom: 8,
  },
  headerLeft: {
    flex: 1,
  },
  headerCenter: {
    flex: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  headerLogoContainer: {
    alignItems: "center",
  },
  headerPulseContainer: {
    alignItems: "center",
  },
  headerLogoImage: {
    width: 735,
    height: 263,
  },
  headerRight: {
    flex: 1,
    alignItems: "flex-end",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: 2,
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    backdropFilter: "blur(10px)",
  },
  notificationButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    backdropFilter: "blur(10px)",
  },
  scrollView: {
    backgroundColor: '#000000',
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
    backgroundColor: '#000000',
    flexGrow: 1,
  },
  scrollInner: {
    backgroundColor: '#000000',
  },
  taglineContainer: {
    alignItems: "center",
    marginTop: -95,
    marginBottom: 16,
  },
  tagline: {
    fontSize: 22,
    marginTop: 0,
    fontWeight: "600",
    textAlign: "center",
  },
  taglineAccent: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
    gap: 6,
  },
  taglineAccentText: {
    fontSize: 16,
    fontWeight: "700",
  },
  cardsContainer: {
    paddingHorizontal: 20,
    marginTop: 0,
    gap: 12,
  },
  cardWrapper: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  card: {
    borderRadius: 28,
    padding: 14,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  cardBadge: {
    backgroundColor: "#E3222B",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  cardBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
  },
  cardContent: {
    gap: 6,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "800",
    lineHeight: 23,
  },
  cardDescription: {
    fontSize: 13,
    lineHeight: 19,
    opacity: 0.8,
  },
  cardFooter: {
    marginTop: 8,
  },
  cardFooterText: {
    fontSize: 14,
    fontWeight: "700",
  },
  footer: {
    alignItems: "center",
    marginTop: 16,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  footerCard: {
    borderRadius: 20,
    padding: 20,
    width: "100%",
  },
  footerText: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },

});