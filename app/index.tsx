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
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Menu, Camera, MessageCircle, Sparkles, Zap, Heart } from "lucide-react-native";
import { useTheme } from "@/providers/ThemeProvider";
import { useAppState } from "@/providers/AppStateProvider";
import { useRevenueCat } from "@/providers/RevenueCatProvider";
import OnboardingScreen from "./onboarding";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width: screenWidth } = Dimensions.get('window');

interface FloatingIcon {
  id: number;
  x: Animated.Value;
  y: Animated.Value;
  opacity: Animated.Value;
  scale: Animated.Value;
}

export default function HomeScreen() {
  const router = useRouter();
  const { theme, isDark } = useTheme();
  const { showOnboarding, isPro } = useAppState();
  const { isEntitledToPro, isConfigured } = useRevenueCat();
  const prevShowOnboarding = useRef<boolean>(showOnboarding);
  
  const logoScale = useRef(new Animated.Value(0)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const cardTranslateY = useRef(new Animated.Value(50)).current;
  const scrollY = useRef(new Animated.Value(0)).current;
  const floatingAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const floatingIcons = useRef<FloatingIcon[]>([]).current;


  useEffect(() => {
    if (showOnboarding) return;
    
    // Initialize floating icons
    if (floatingIcons.length === 0) {
      for (let i = 0; i < 10; i++) {
        floatingIcons.push({
          id: i,
          x: new Animated.Value(Math.random() * screenWidth),
          y: new Animated.Value(600),
          opacity: new Animated.Value(0),
          scale: new Animated.Value(0.3 + Math.random() * 0.4),
        });
      }
    }

    // Animate floating icons
    floatingIcons.forEach((icon, index) => {
      const delay = index * 300;
      const duration = 4000 + Math.random() * 2000;
      
      const animateIcon = () => {
        icon.x.setValue(Math.random() * screenWidth);
        icon.y.setValue(600);
        icon.opacity.setValue(0);
        
        Animated.parallel([
          Animated.timing(icon.y, {
            toValue: -100,
            duration: duration,
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(icon.opacity, {
              toValue: 0.6,
              duration: duration * 0.2,
              useNativeDriver: true,
            }),
            Animated.timing(icon.opacity, {
              toValue: 0.6,
              duration: duration * 0.6,
              useNativeDriver: true,
            }),
            Animated.timing(icon.opacity, {
              toValue: 0,
              duration: duration * 0.2,
              useNativeDriver: true,
            }),
          ]),
        ]).start(() => {
          setTimeout(animateIcon, Math.random() * 2000);
        });
      };
      
      setTimeout(animateIcon, delay);
    });
    
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
  }, [logoScale, cardOpacity, cardTranslateY, floatingAnim, pulseAnim, showOnboarding, floatingIcons]);

  
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
      
      {/* Single consistent background */}
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#000000' }]} />

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
      
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity 
              onPress={() => router.push("/settings")}
              style={[styles.menuButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}
            >
              <Menu size={20} color={theme.text} />
            </TouchableOpacity>
          </View>
          <View style={styles.headerCenter}>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity 
              style={[styles.notificationButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}
            >
              <Heart size={20} color={theme.text} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={[styles.scrollContent, { backgroundColor: '#000000' }]}
          showsVerticalScrollIndicator={false}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: false }
          )}
          scrollEventThrottle={16}
          style={[styles.scrollView, { backgroundColor: '#000000' }]}
          bounces={false}
          overScrollMode="never"
        >
          <View style={styles.scrollInner} testID="home_scroll_inner">

            <Animated.View style={[styles.logoContainer, { transform: [{ scale: logoScale }] }]}>
            <Animated.View style={[styles.pulseContainer, { transform: [{ scale: pulseAnim }] }]}>
              <View style={styles.logoImageContainer}>
                <Image 
                  source={{ uri: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/gfyt5wf0zoi6wrlcu8elw' }}
                  style={styles.logoImage}
                  resizeMode="contain"
                />
              </View>
            </Animated.View>
            <Text style={[styles.tagline, { color: theme.textSecondary }]}>
              Level up your dating game
            </Text>
            <View style={styles.taglineAccent}>
              <Zap size={16} color={theme.primary} />
              <Text style={[styles.taglineAccentText, { color: theme.primary }]}>AI-Powered</Text>
            </View>
          </Animated.View>

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
                    <Camera size={28} color="#FFFFFF" />
                  </LinearGradient>
                  <View style={styles.cardBadge}>
                    <Text style={styles.cardBadgeText}>HOT</Text>
                  </View>
                </View>
                <View style={styles.cardContent}>
                  <Text style={[styles.cardTitle, { color: theme.text }]}>
                    Upload a Screenshot
                  </Text>
                  <Text style={[styles.cardDescription, { color: theme.textSecondary }]}>
                    Get AI-powered reply suggestions from your conversations
                  </Text>
                  <View style={styles.cardFooter}>
                    <Text style={[styles.cardFooterText, { color: theme.primary }]}>Tap to analyze →</Text>
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
                    <Sparkles size={28} color="#FFFFFF" />
                  </LinearGradient>
                  <View style={[styles.cardBadge, { backgroundColor: '#FF7A59' }]}>
                    <Text style={styles.cardBadgeText}>NEW</Text>
                  </View>
                </View>
                <View style={styles.cardContent}>
                  <Text style={[styles.cardTitle, { color: theme.text }]}>
                    Pickup Lines Generator
                  </Text>
                  <Text style={[styles.cardDescription, { color: theme.textSecondary }]}>
                    Smart, witty, and tasteful one-liners that actually work
                  </Text>
                  <View style={styles.cardFooter}>
                    <Text style={[styles.cardFooterText, { color: '#FF7A59' }]}>Generate now →</Text>
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
                    <MessageCircle size={28} color="#FFFFFF" />
                  </LinearGradient>
                  <View style={[styles.cardBadge, { backgroundColor: '#8B5CF6' }]}>
                    <Text style={styles.cardBadgeText}>AI</Text>
                  </View>
                </View>
                <View style={styles.cardContent}>
                  <Text style={[styles.cardTitle, { color: theme.text }]}>
                    Chat with AI Coach
                  </Text>
                  <Text style={[styles.cardDescription, { color: theme.textSecondary }]}>
                    Get personalized dating advice and conversation tips
                  </Text>
                  <View style={styles.cardFooter}>
                    <Text style={[styles.cardFooterText, { color: '#8B5CF6' }]}>Start chatting →</Text>
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
                💡 Pro tip: Save your favorites and track your success rate
              </Text>
            </LinearGradient>
          </View>

          </View>
        </ScrollView>
      </SafeAreaView>
      
      {/* Floating Goat Icons */}
      {!showOnboarding && floatingIcons.map((icon) => (
        <Animated.View
          key={icon.id}
          pointerEvents="none"
          style={[
            styles.floatingIcon,
            {
              transform: [
                { translateX: icon.x },
                { translateY: icon.y },
                { scale: icon.scale },
              ],
              opacity: icon.opacity,
            },
          ]}
        >
          <Image
            source={{ uri: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/2cefmmmkms69ivsdi900x' }}
            style={styles.floatingIconImage}
            resizeMode="contain"
          />
        </Animated.View>
      ))}
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
    paddingBottom: 2,
  },
  headerLeft: {
    flex: 1,
  },
  headerCenter: {
    flex: 2,
    alignItems: "center",
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
    paddingBottom: 40,
    backgroundColor: '#000000',
  },
  scrollInner: {
    flex: 1,
  },
  logoContainer: {
    alignItems: "center",
    marginTop: -40,
    marginBottom: -20,
  },
  pulseContainer: {
    alignItems: "center",
  },
  logoImageContainer: {
    shadowColor: "#E3222B",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  logoImage: {
    width: 640,
    height: 230,
  },
  tagline: {
    fontSize: 22,
    marginTop: -20,
    fontWeight: "600",
    textAlign: "center",
  },
  taglineAccent: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: -4,
    gap: 6,
  },
  taglineAccentText: {
    fontSize: 16,
    fontWeight: "700",
  },
  cardsContainer: {
    paddingHorizontal: 20,
    marginTop: -30,
    gap: 14,
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
    padding: 24,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  cardIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
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
    gap: 8,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "800",
    lineHeight: 26,
  },
  cardDescription: {
    fontSize: 15,
    lineHeight: 22,
    opacity: 0.8,
  },
  cardFooter: {
    marginTop: 12,
  },
  cardFooterText: {
    fontSize: 14,
    fontWeight: "700",
  },
  footer: {
    alignItems: "center",
    marginTop: 18,
    paddingHorizontal: 20,
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
  floatingIcon: {
    position: 'absolute',
    bottom: 0,
    zIndex: 1,
  },
  floatingIconImage: {
    width: 40,
    height: 40,
    opacity: 0.8,
  },
});