import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableOpacity,
  Platform,
  StatusBar,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { ArrowRight } from "lucide-react-native";
import { useAppState } from "@/providers/AppStateProvider";
import * as Haptics from "expo-haptics";

const { width, height } = Dimensions.get("window");

interface AnimationStep {
  title: string;
  subtitle: string;
  description: string;
  gradient: string[];
}

const animationSteps: AnimationStep[] = [
  {
    title: "SCORE MORE",
    subtitle: "DATES",
    description: "Get matches that actually matter",
    gradient: ["#E3222B", "#FF4757"],
  },
  {
    title: "BE MORE",
    subtitle: "CONFIDENT",
    description: "Master the art of conversation",
    gradient: ["#FF4757", "#FF6B6B"],
  },
  {
    title: "SAY THE PERFECT",
    subtitle: "THINGS",
    description: "Never run out of words again",
    gradient: ["#FF6B6B", "#FF8E8E"],
  },
  {
    title: "LAND THE",
    subtitle: "DATE",
    description: "Turn conversations into connections",
    gradient: ["#FF8E8E", "#E3222B"],
  },
];

export default function OnboardingScreen() {
  const { completeOnboarding } = useAppState();
  const [currentStep, setCurrentStep] = useState(0);
  const [showQuestionnaire, setShowQuestionnaire] = useState(false);
  const [selectedSex, setSelectedSex] = useState<'male' | 'female' | 'other' | null>(null);
  const [selectedAge, setSelectedAge] = useState<'18-24' | '25-34' | '35-44' | '45+' | null>(null);
  
  // Main content animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.3)).current;
  const slideAnim = useRef(new Animated.Value(100)).current;
  
  // Logo animations
  const logoScale = useRef(new Animated.Value(0)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoRotate = useRef(new Animated.Value(0)).current;
  const logoPulse = useRef(new Animated.Value(1)).current;
  
  // Floating goat icons
  const floatingGoats = useRef(Array.from({ length: 8 }, () => ({
    translateY: new Animated.Value(0),
    opacity: new Animated.Value(0),
    rotate: new Animated.Value(0),
    scale: new Animated.Value(0),
  }))).current;
  
  // Particle effects - static positions
  const particleAnims = useRef(Array.from({ length: 15 }, (_, index) => ({
    translateY: new Animated.Value(0),
    opacity: new Animated.Value(0),
    scale: new Animated.Value(0),
    staticPosition: {
      left: (index % 5) * (width / 5) + (width / 10), // Evenly distribute in 5 columns
      bottom: Math.floor(index / 5) * 60 + 40, // 3 rows with 60px spacing
    },
  })));
  
  // Initialize particle animations once
  const [particleAnimsInitialized, setParticleAnimsInitialized] = useState(false);
  
  // Questionnaire animation
  const questionnaireAnim = useRef(new Animated.Value(0)).current;
  
  // Background pulse
  const backgroundPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    startAnimationSequence();
  }, []);

  useEffect(() => {
    if (showQuestionnaire) {
      Animated.spring(questionnaireAnim, {
        toValue: 1,
        friction: 8,
        tension: 100,
        useNativeDriver: true,
      }).start();
    }
  }, [showQuestionnaire]);

  const startAnimationSequence = () => {
    // Start background pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(backgroundPulse, {
          toValue: 1.05,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(backgroundPulse, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
    
    const stepDuration = 2500;
    const totalSteps = animationSteps.length;
    
    const animateStep = (stepIndex: number) => {
      setCurrentStep(stepIndex);
      
      // Animate floating goats for each step
      animateFloatingGoats(stepIndex);
      
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 6,
          tension: 80,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 8,
          tension: 100,
          useNativeDriver: true,
        }),
      ]).start(() => {
        if (stepIndex < totalSteps - 1) {
          setTimeout(() => {
            Animated.parallel([
              Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 500,
                useNativeDriver: true,
              }),
              Animated.timing(scaleAnim, {
                toValue: 0.3,
                duration: 500,
                useNativeDriver: true,
              }),
              Animated.timing(slideAnim, {
                toValue: -100,
                duration: 500,
                useNativeDriver: true,
              }),
            ]).start(() => {
              hideFloatingGoats();
              animateStep(stepIndex + 1);
            });
          }, stepDuration - 1200);
        } else {
          setTimeout(() => {
            hideFloatingGoats();
            showRizzGoatBranding();
          }, stepDuration - 1200);
        }
      });
    };
    
    animateStep(0);
  };
  
  const animateFloatingGoats = (stepIndex: number) => {
    floatingGoats.forEach((goat, index) => {
      const delay = index * 200;
      const duration = 1500 + Math.random() * 1000;
      
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(goat.opacity, {
            toValue: 0.15 + Math.random() * 0.15,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.spring(goat.scale, {
            toValue: 0.4 + Math.random() * 0.2,
            friction: 4,
            tension: 100,
            useNativeDriver: true,
          }),
          Animated.loop(
            Animated.sequence([
              Animated.timing(goat.translateY, {
                toValue: -20 - Math.random() * 30,
                duration: duration / 2,
                useNativeDriver: true,
              }),
              Animated.timing(goat.translateY, {
                toValue: 0,
                duration: duration / 2,
                useNativeDriver: true,
              }),
            ])
          ),
          Animated.loop(
            Animated.timing(goat.rotate, {
              toValue: 1,
              duration: 4000 + Math.random() * 2000,
              useNativeDriver: true,
            })
          ),
        ]).start();
      }, delay);
    });
  };
  
  const hideFloatingGoats = () => {
    floatingGoats.forEach((goat) => {
      Animated.parallel([
        Animated.timing(goat.opacity, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(goat.scale, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const showRizzGoatBranding = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.3,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setCurrentStep(-1);
      
      // Epic logo entrance
      Animated.sequence([
        Animated.parallel([
          Animated.timing(logoOpacity, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.spring(logoScale, {
            toValue: 1.2,
            friction: 4,
            tension: 50,
            useNativeDriver: true,
          }),
          Animated.timing(logoRotate, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]),
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 6,
          tension: 100,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Start logo pulse
        Animated.loop(
          Animated.sequence([
            Animated.timing(logoPulse, {
              toValue: 1.1,
              duration: 1000,
              useNativeDriver: true,
            }),
            Animated.timing(logoPulse, {
              toValue: 1,
              duration: 1000,
              useNativeDriver: true,
            }),
          ])
        ).start();
        
        startParticleAnimation();
        setTimeout(() => {
          setShowQuestionnaire(true);
        }, 2000);
      });
    });
  };

  const startParticleAnimation = () => {
    if (particleAnimsInitialized) return; // Prevent re-initialization
    
    setParticleAnimsInitialized(true);
    
    particleAnims.current.forEach((particle, index) => {
      const delay = index * 150;
      
      setTimeout(() => {
        Animated.loop(
          Animated.sequence([
            Animated.parallel([
              Animated.timing(particle.opacity, {
                toValue: 0.6,
                duration: 800,
                useNativeDriver: true,
              }),
              Animated.spring(particle.scale, {
                toValue: 0.8,
                friction: 4,
                tension: 100,
                useNativeDriver: true,
              }),
            ]),
            Animated.timing(particle.translateY, {
              toValue: -100 - Math.random() * 50,
              duration: 2500 + Math.random() * 1000,
              useNativeDriver: true,
            }),
            Animated.parallel([
              Animated.timing(particle.opacity, {
                toValue: 0,
                duration: 500,
                useNativeDriver: true,
              }),
              Animated.timing(particle.scale, {
                toValue: 0,
                duration: 500,
                useNativeDriver: true,
              }),
            ]),
            Animated.timing(particle.translateY, {
              toValue: 0,
              duration: 0,
              useNativeDriver: true,
            }),
          ])
        ).start();
      }, delay);
    });
  };

  const handleSexSelection = async (sex: 'male' | 'female' | 'other') => {
    if (Platform.OS !== "web") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSelectedSex(sex);
  };

  const handleAgeSelection = async (age: '18-24' | '25-34' | '35-44' | '45+') => {
    if (Platform.OS !== "web") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSelectedAge(age);
  };

  const handleComplete = async () => {
    if (selectedSex && selectedAge) {
      if (Platform.OS !== "web") {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      await completeOnboarding({ sex: selectedSex, ageRange: selectedAge });
    }
  };

  const currentStepData = animationSteps[currentStep];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" translucent />
      
      {/* Dynamic Background */}
      <Animated.View style={[StyleSheet.absoluteFillObject, { transform: [{ scale: backgroundPulse }] }]}>
        <LinearGradient
          colors={currentStep >= 0 && currentStepData ? currentStepData.gradient as [string, string] : ["#000000", "#000000"]}
          style={StyleSheet.absoluteFillObject}
          locations={[0, 1]}
        />
      </Animated.View>
      
      {/* Floating Goat Icons */}
      {currentStep >= 0 && floatingGoats.map((goat, index) => {
        const position = {
          left: (index % 4) * (width / 4) + Math.random() * (width / 8),
          top: Math.random() * height * 0.6 + height * 0.2,
        };
        
        return (
          <Animated.View
            key={`goat-${index}`}
            style={[
              styles.floatingGoat,
              position,
              {
                opacity: goat.opacity,
                transform: [
                  { scale: goat.scale },
                  { translateY: goat.translateY },
                  {
                    rotate: goat.rotate.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '360deg'],
                    }),
                  },
                ],
              },
            ]}
          >
            <Image 
              source={{ uri: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/npigoj3nywrwc96avmtqi' }}
              style={styles.floatingGoatImage}
              resizeMode="contain"
            />
          </Animated.View>
        );
      })}
      
      {/* Particle Effects */}
      {currentStep === -1 && particleAnims.current.map((particle, index) => {
        return (
          <Animated.View
            key={`particle-${index}`}
            style={[
              styles.particle,
              {
                left: particle.staticPosition.left,
                bottom: particle.staticPosition.bottom,
                opacity: particle.opacity,
                transform: [
                  { scale: particle.scale },
                  { translateY: particle.translateY },
                ],
              },
            ]}
          >
            <Image 
              source={{ uri: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/hvz4kgjgv7ihxryzvsx12' }}
              style={styles.particleGoat}
              resizeMode="contain"
            />
          </Animated.View>
        );
      })}
      
      <SafeAreaView style={styles.safeArea}>
        {/* Animation Steps */}
        {currentStep >= 0 && currentStepData && (
          <Animated.View
            style={[
              styles.stepContainer,
              {
                opacity: fadeAnim,
                transform: [
                  { scale: scaleAnim },
                  { translateY: slideAnim },
                ],
              },
            ]}
          >
            <View style={styles.iconContainer}>
              <Image 
                source={{ uri: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/npigoj3nywrwc96avmtqi' }}
                style={styles.stepGoatIcon}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.stepTitle}>{currentStepData.title}</Text>
            <Text style={styles.stepSubtitle}>{currentStepData.subtitle}</Text>
            <Text style={styles.stepDescription}>{currentStepData.description}</Text>
          </Animated.View>
        )}
        
        {/* RizzGoat Branding */}
        {currentStep === -1 && !showQuestionnaire && (
          <Animated.View
            style={[
              styles.brandingContainer,
              {
                opacity: logoOpacity,
                transform: [
                  { scale: logoScale },
                  {
                    rotate: logoRotate.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '360deg'],
                    }),
                  },
                ],
              },
            ]}
          >
            <Animated.View 
              style={[
                styles.logoContainer,
                {
                  transform: [{ scale: logoPulse }],
                },
              ]}
            >
              <Image 
                source={{ uri: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/npigoj3nywrwc96avmtqi' }}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </Animated.View>
            <View style={styles.brandingTextContainer}>
              <Text style={styles.brandingText}>RizzGoat</Text>
              <Text style={styles.brandingSubtext}>Master Your Game</Text>
            </View>
          </Animated.View>
        )}
        
        {/* Questionnaire */}
        {showQuestionnaire && (
          <Animated.View
            style={[
              styles.questionnaireContainer,
              {
                opacity: questionnaireAnim,
                transform: [
                  {
                    translateY: questionnaireAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [50, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <Text style={styles.questionnaireTitle}>Let&apos;s personalize your experience</Text>
            
            {/* Sex Selection */}
            <View style={styles.questionSection}>
              <Text style={styles.questionText}>What&apos;s your sex?</Text>
              <View style={styles.optionsContainer}>
                {(['male', 'female', 'other'] as const).map((sex) => (
                  <TouchableOpacity
                    key={sex}
                    onPress={() => handleSexSelection(sex)}
                    style={[
                      styles.optionButton,
                      selectedSex === sex && styles.optionButtonSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        selectedSex === sex && styles.optionTextSelected,
                      ]}
                    >
                      {sex.charAt(0).toUpperCase() + sex.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            
            {/* Age Selection */}
            <View style={styles.questionSection}>
              <Text style={styles.questionText}>What&apos;s your age range?</Text>
              <View style={styles.optionsContainer}>
                {(['18-24', '25-34', '35-44', '45+'] as const).map((age) => (
                  <TouchableOpacity
                    key={age}
                    onPress={() => handleAgeSelection(age)}
                    style={[
                      styles.optionButton,
                      selectedAge === age && styles.optionButtonSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        selectedAge === age && styles.optionTextSelected,
                      ]}
                    >
                      {age}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            
            {/* Continue Button */}
            {selectedSex && selectedAge && (
              <TouchableOpacity
                onPress={handleComplete}
                style={styles.continueButton}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={["#E3222B", "#FF6B6B"]}
                  style={styles.continueButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Text style={styles.continueButtonText}>Let&apos;s Go!</Text>
                  <ArrowRight size={20} color="#FFFFFF" />
                </LinearGradient>
              </TouchableOpacity>
            )}
          </Animated.View>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  safeArea: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: 'transparent',
  },
  stepContainer: {
    alignItems: "center",
    paddingHorizontal: 40,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    borderRadius: 25,
    paddingVertical: 30,
    marginHorizontal: 20,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 15,
  },
  iconContainer: {
    marginBottom: 30,
    shadowColor: "#E3222B",
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.4,
    shadowRadius: 25,
    elevation: 15,
  },
  stepGoatIcon: {
    width: 100,
    height: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 50,
    padding: 10,
  },
  stepTitle: {
    fontSize: 42,
    fontWeight: "900",
    color: "#FFFFFF",
    textAlign: "center",
    letterSpacing: 2,
    marginBottom: 5,
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 15,
    fontFamily: Platform.select({
      ios: 'TTCommons-DemiBold',
      android: 'TTCommons-DemiBold',
      web: 'TT Commons Pro, system-ui, -apple-system, sans-serif',
    }),
  },
  stepSubtitle: {
    fontSize: 46,
    fontWeight: "900",
    color: "#FFFFFF",
    textAlign: "center",
    letterSpacing: 3,
    marginBottom: 15,
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 15,
    fontFamily: Platform.select({
      ios: 'TTCommons-DemiBold',
      android: 'TTCommons-DemiBold',
      web: 'TT Commons Pro, system-ui, -apple-system, sans-serif',
    }),
  },
  stepDescription: {
    fontSize: 18,
    fontWeight: "600",
    color: "rgba(255,255,255,0.9)",
    textAlign: "center",
    letterSpacing: 1,
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 5,
  },
  brandingContainer: {
    alignItems: "center",
  },
  logoContainer: {
    marginBottom: 25,
    shadowColor: "#E3222B",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.6,
    shadowRadius: 40,
    elevation: 20,
  },
  logoImage: {
    width: 180,
    height: 180,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 90,
    padding: 25,
  },
  brandingTextContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    paddingHorizontal: 45,
    paddingVertical: 20,
    borderRadius: 30,
    borderWidth: 3,
    borderColor: "rgba(227, 34, 43, 0.6)",
    alignItems: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
  brandingText: {
    fontSize: 52,
    fontWeight: "900",
    color: "#E3222B",
    letterSpacing: 4,
    textAlign: "center",
    marginBottom: 5,
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
    fontFamily: Platform.select({
      ios: 'TTCommons-DemiBold',
      android: 'TTCommons-DemiBold',
      web: 'TT Commons Pro, system-ui, -apple-system, sans-serif',
    }),
  },
  brandingSubtext: {
    fontSize: 16,
    fontWeight: "700",
    color: "rgba(227, 34, 43, 0.8)",
    letterSpacing: 2,
    textAlign: "center",
    textTransform: "uppercase",
  },
  floatingGoat: {
    position: "absolute",
  },
  floatingGoatImage: {
    width: 30,
    height: 30,
    opacity: 0.6,
  },
  particle: {
    position: "absolute",
  },
  particleGoat: {
    width: 24,
    height: 24,
  },
  questionnaireContainer: {
    width: "100%",
    paddingHorizontal: 30,
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    borderRadius: 25,
    paddingVertical: 30,
    marginHorizontal: 20,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 15,
  },
  questionnaireTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 40,
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  questionSection: {
    width: "100%",
    marginBottom: 30,
  },
  questionText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 20,
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 5,
  },
  optionsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 12,
  },
  optionButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.3)",
    minWidth: 100,
  },
  optionButtonSelected: {
    backgroundColor: "rgba(255,255,255,0.3)",
    borderColor: "#FFFFFF",
  },
  optionText: {
    fontSize: 16,
    fontWeight: "600",
    color: "rgba(255,255,255,0.8)",
    textAlign: "center",
  },
  optionTextSelected: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  continueButton: {
    marginTop: 40,
    shadowColor: "#E3222B",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
  },
  continueButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 30,
    gap: 10,
  },
  continueButtonText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 1,
  },
});