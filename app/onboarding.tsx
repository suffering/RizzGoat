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
  Easing,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { ArrowRight, Heart, MessageCircle, Sparkles, Zap, Flame, Crown } from "lucide-react-native";
import { useAppState } from "@/providers/AppStateProvider";
import * as Haptics from "expo-haptics";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

export default function OnboardingScreen() {
  const { completeOnboarding } = useAppState();
  const [currentPhase, setCurrentPhase] = useState<'logo-reveal' | 'purpose' | 'features' | 'finale' | 'questionnaire'>('logo-reveal');
  const [showQuestionnaire, setShowQuestionnaire] = useState(false);
  const [selectedSex, setSelectedSex] = useState<'male' | 'female' | 'other' | null>(null);
  const [selectedAge, setSelectedAge] = useState<'18-24' | '25-34' | '35-44' | '45+' | null>(null);
  
  // Master opacity for entire intro
  const masterOpacity = useRef(new Animated.Value(1)).current;
  
  // Logo Reveal Phase Animations
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0)).current;
  const logoRotate = useRef(new Animated.Value(0)).current;
  const logoGlow = useRef(new Animated.Value(0)).current;
  const logoTextOpacity = useRef(new Animated.Value(0)).current;
  const logoTextScale = useRef(new Animated.Value(0.5)).current;
  const logoTextSlide = useRef(new Animated.Value(50)).current;
  
  // Glowing streaks
  const streak1 = useRef(new Animated.Value(0)).current;
  const streak2 = useRef(new Animated.Value(0)).current;
  const streak3 = useRef(new Animated.Value(0)).current;
  
  // Purpose Phase Animations
  const purposeOpacity = useRef(new Animated.Value(0)).current;
  const purposeScale = useRef(new Animated.Value(0.8)).current;
  const heartScale = useRef(new Animated.Value(0)).current;
  const messageScale = useRef(new Animated.Value(0)).current;
  const sparkleScale = useRef(new Animated.Value(0)).current;
  const purposeTextOpacity = useRef(new Animated.Value(0)).current;
  
  // Features Phase Animations
  const featuresOpacity = useRef(new Animated.Value(0)).current;
  const feature1Slide = useRef(new Animated.Value(-screenWidth)).current;
  const feature2Slide = useRef(new Animated.Value(screenWidth)).current;
  const feature3Slide = useRef(new Animated.Value(-screenWidth)).current;
  
  // Finale Phase Animations
  const finaleOpacity = useRef(new Animated.Value(0)).current;
  const finaleScale = useRef(new Animated.Value(0.5)).current;
  const finalePulse = useRef(new Animated.Value(1)).current;
  const buttonOpacity = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(0.8)).current;
  const buttonGlow = useRef(new Animated.Value(0)).current;
  
  // Ember particles
  const emberParticles = useRef(Array.from({ length: 20 }, () => ({
    translateX: new Animated.Value(Math.random() * screenWidth),
    translateY: new Animated.Value(screenHeight),
    opacity: new Animated.Value(0),
    scale: new Animated.Value(0),
  }))).current;
  
  // Background animations
  const bgGradientRotate = useRef(new Animated.Value(0)).current;
  const bgPulse = useRef(new Animated.Value(1)).current;
  
  // Questionnaire animations
  const questionnaireOpacity = useRef(new Animated.Value(0)).current;
  const questionnaireScale = useRef(new Animated.Value(0.8)).current;
  
  // Bottom goat icon animations
  const goatIconAnimations = useRef([
    { translateY: new Animated.Value(0), scale: new Animated.Value(1) },
    { translateY: new Animated.Value(0), scale: new Animated.Value(1) },
    { translateY: new Animated.Value(0), scale: new Animated.Value(1) },
    { translateY: new Animated.Value(0), scale: new Animated.Value(1) },
    { translateY: new Animated.Value(0), scale: new Animated.Value(1) },
  ]).current;

  useEffect(() => {
    startEpicIntroSequence();
  }, []);

  useEffect(() => {
    if (showQuestionnaire) {
      Animated.parallel([
        Animated.spring(questionnaireOpacity, {
          toValue: 1,
          friction: 8,
          tension: 100,
          useNativeDriver: true,
        }),
        Animated.spring(questionnaireScale, {
          toValue: 1,
          friction: 6,
          tension: 80,
          useNativeDriver: true,
        }),
      ]).start();
      
      // Start goat icon animations
      goatIconAnimations.forEach((anim, index) => {
        Animated.loop(
          Animated.sequence([
            Animated.delay(index * 200),
            Animated.parallel([
              Animated.sequence([
                Animated.timing(anim.translateY, {
                  toValue: -15,
                  duration: 1000,
                  easing: Easing.inOut(Easing.sin),
                  useNativeDriver: true,
                }),
                Animated.timing(anim.translateY, {
                  toValue: 0,
                  duration: 1000,
                  easing: Easing.inOut(Easing.sin),
                  useNativeDriver: true,
                }),
              ]),
              Animated.sequence([
                Animated.timing(anim.scale, {
                  toValue: 1.2,
                  duration: 1000,
                  easing: Easing.inOut(Easing.sin),
                  useNativeDriver: true,
                }),
                Animated.timing(anim.scale, {
                  toValue: 1,
                  duration: 1000,
                  easing: Easing.inOut(Easing.sin),
                  useNativeDriver: true,
                }),
              ]),
            ]),
          ])
        ).start();
      });
    }
  }, [showQuestionnaire, goatIconAnimations, questionnaireOpacity, questionnaireScale]);

  const startEpicIntroSequence = () => {
    // Start background animations
    startBackgroundAnimations();
    startEmberAnimation();
    
    // Phase 1: Logo Reveal (3 seconds)
    logoRevealAnimation(() => {
      // Phase 2: Purpose Showcase (4 seconds)
      purposeShowcaseAnimation(() => {
        // Phase 3: Features (3.5 seconds)
        featuresAnimation(() => {
          // Phase 4: Finale (2.5 seconds)
          finaleAnimation();
        });
      });
    });
  };

  const startBackgroundAnimations = () => {
    // Rotating gradient background
    Animated.loop(
      Animated.timing(bgGradientRotate, {
        toValue: 1,
        duration: 20000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
    
    // Pulsing background
    Animated.loop(
      Animated.sequence([
        Animated.timing(bgPulse, {
          toValue: 1.05,
          duration: 3000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(bgPulse, {
          toValue: 1,
          duration: 3000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const startEmberAnimation = () => {
    emberParticles.forEach((particle, index) => {
      const delay = index * 100;
      setTimeout(() => {
        Animated.loop(
          Animated.sequence([
            Animated.parallel([
              Animated.timing(particle.opacity, {
                toValue: 0.8,
                duration: 1000,
                useNativeDriver: true,
              }),
              Animated.timing(particle.scale, {
                toValue: 0.5 + Math.random() * 0.5,
                duration: 1000,
                useNativeDriver: true,
              }),
              Animated.timing(particle.translateY, {
                toValue: -100,
                duration: 4000 + Math.random() * 2000,
                easing: Easing.out(Easing.quad),
                useNativeDriver: true,
              }),
              Animated.timing(particle.translateX, {
                toValue: Math.random() * screenWidth,
                duration: 4000,
                easing: Easing.inOut(Easing.sin),
                useNativeDriver: true,
              }),
            ]),
            Animated.parallel([
              Animated.timing(particle.opacity, {
                toValue: 0,
                duration: 1000,
                useNativeDriver: true,
              }),
              Animated.timing(particle.scale, {
                toValue: 0,
                duration: 1000,
                useNativeDriver: true,
              }),
            ]),
          ]),
          { iterations: -1 }
        ).start();
      }, delay);
    });
  };

  const logoRevealAnimation = (callback: () => void) => {
    setCurrentPhase('logo-reveal');
    
    Animated.sequence([
      // Goat icon emerges with glow
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 800,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(logoScale, {
          toValue: 1.2,
          friction: 4,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(logoGlow, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        // Animated streaks
        Animated.stagger(100, [
          Animated.timing(streak1, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(streak2, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(streak3, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ]),
      ]),
      // Rotate and pulse
      Animated.parallel([
        Animated.timing(logoRotate, {
          toValue: 1,
          duration: 1000,
          easing: Easing.out(Easing.back(2)),
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(logoScale, {
            toValue: 1.5,
            duration: 400,
            easing: Easing.out(Easing.back(2)),
            useNativeDriver: true,
          }),
          Animated.timing(logoScale, {
            toValue: 1.2,
            duration: 400,
            easing: Easing.in(Easing.back(2)),
            useNativeDriver: true,
          }),
        ]),
      ]),
      // RizzGoat text appears
      Animated.parallel([
        Animated.timing(logoTextOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(logoTextScale, {
          toValue: 1,
          friction: 4,
          tension: 60,
          useNativeDriver: true,
        }),
        Animated.timing(logoTextSlide, {
          toValue: 0,
          duration: 600,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      setTimeout(callback, 500);
    });
  };

  const purposeShowcaseAnimation = (callback: () => void) => {
    setCurrentPhase('purpose');
    
    // Fade out logo
    Animated.parallel([
      Animated.timing(logoOpacity, {
        toValue: 0.3,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(logoTextOpacity, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
    
    // Show purpose elements
    Animated.sequence([
      Animated.parallel([
        Animated.timing(purposeOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(purposeScale, {
          toValue: 1,
          friction: 5,
          tension: 80,
          useNativeDriver: true,
        }),
      ]),
      // Animate icons
      Animated.stagger(200, [
        Animated.spring(heartScale, {
          toValue: 1,
          friction: 3,
          tension: 100,
          useNativeDriver: true,
        }),
        Animated.spring(messageScale, {
          toValue: 1,
          friction: 3,
          tension: 100,
          useNativeDriver: true,
        }),
        Animated.spring(sparkleScale, {
          toValue: 1,
          friction: 3,
          tension: 100,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(purposeTextOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Pulse animation for icons
      Animated.loop(
        Animated.sequence([
          Animated.timing(heartScale, {
            toValue: 1.2,
            duration: 800,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(heartScale, {
            toValue: 1,
            duration: 800,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
        { iterations: 2 }
      ).start(() => {
        setTimeout(callback, 500);
      });
    });
  };

  const featuresAnimation = (callback: () => void) => {
    setCurrentPhase('features');
    
    // Fade out purpose
    Animated.timing(purposeOpacity, {
      toValue: 0,
      duration: 500,
      useNativeDriver: true,
    }).start();
    
    // Show features with slide animations
    Animated.sequence([
      Animated.timing(featuresOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.stagger(300, [
        Animated.spring(feature1Slide, {
          toValue: 0,
          friction: 6,
          tension: 80,
          useNativeDriver: true,
        }),
        Animated.spring(feature2Slide, {
          toValue: 0,
          friction: 6,
          tension: 80,
          useNativeDriver: true,
        }),
        Animated.spring(feature3Slide, {
          toValue: 0,
          friction: 6,
          tension: 80,
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      setTimeout(callback, 1500);
    });
  };

  const finaleAnimation = () => {
    setCurrentPhase('finale');
    
    // Fade out features
    Animated.timing(featuresOpacity, {
      toValue: 0,
      duration: 500,
      useNativeDriver: true,
    }).start();
    
    // Epic finale
    Animated.sequence([
      // Logo and text reappear
      Animated.parallel([
        Animated.timing(finaleOpacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.spring(finaleScale, {
          toValue: 1,
          friction: 3,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.spring(logoScale, {
          toValue: 1.5,
          friction: 4,
          tension: 60,
          useNativeDriver: true,
        }),
      ]),
      // Button appears
      Animated.parallel([
        Animated.timing(buttonOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(buttonScale, {
          toValue: 1,
          friction: 5,
          tension: 80,
          useNativeDriver: true,
        }),
        Animated.timing(buttonGlow, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      // Continuous pulse
      Animated.loop(
        Animated.sequence([
          Animated.timing(finalePulse, {
            toValue: 1.1,
            duration: 1500,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(finalePulse, {
            toValue: 1,
            duration: 1500,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      ).start();
    });
  };

  const handleGetStarted = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
    
    // Fade out intro
    Animated.timing(masterOpacity, {
      toValue: 0,
      duration: 500,
      useNativeDriver: true,
    }).start(() => {
      setCurrentPhase('questionnaire');
      setShowQuestionnaire(true);
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

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" translucent />
      
      {/* Animated Background */}
      <Animated.View 
        style={[
          StyleSheet.absoluteFillObject,
          {
            transform: [
              { scale: bgPulse },
              {
                rotate: bgGradientRotate.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0deg', '360deg'],
                }),
              },
            ],
          },
        ]}
      >
        <LinearGradient
          colors={["#000000", "#1a0000", "#000000"]}
          style={StyleSheet.absoluteFillObject}
          locations={[0, 0.5, 1]}
        />
      </Animated.View>
      
      {/* Ember Particles */}
      {emberParticles.map((particle, index) => (
        <Animated.View
          key={`ember-${index}`}
          style={[
            styles.emberParticle,
            {
              opacity: particle.opacity,
              transform: [
                { translateX: particle.translateX },
                { translateY: particle.translateY },
                { scale: particle.scale },
              ],
            },
          ]}
        >
          <View style={styles.emberDot} />
        </Animated.View>
      ))}
      
      {/* Main Intro Content */}
      {!showQuestionnaire && (
        <Animated.View style={[styles.introContent, { opacity: masterOpacity }]}>
          {/* Logo Reveal Phase */}
          {(currentPhase === 'logo-reveal' || currentPhase === 'finale') && (
            <View style={styles.centerContent}>
              {/* Glowing Streaks */}
              <Animated.View
                style={[
                  styles.streak,
                  styles.streak1,
                  {
                    opacity: streak1,
                    transform: [
                      {
                        translateX: streak1.interpolate({
                          inputRange: [0, 1],
                          outputRange: [-200, 0],
                        }),
                      },
                    ],
                  },
                ]}
              />
              <Animated.View
                style={[
                  styles.streak,
                  styles.streak2,
                  {
                    opacity: streak2,
                    transform: [
                      {
                        translateX: streak2.interpolate({
                          inputRange: [0, 1],
                          outputRange: [200, 0],
                        }),
                      },
                    ],
                  },
                ]}
              />
              <Animated.View
                style={[
                  styles.streak,
                  styles.streak3,
                  {
                    opacity: streak3,
                    transform: [
                      {
                        translateY: streak3.interpolate({
                          inputRange: [0, 1],
                          outputRange: [200, 0],
                        }),
                      },
                    ],
                  },
                ]}
              />
              
              {/* Goat Logo */}
              <Animated.View
                style={[
                  styles.logoContainer,
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
                    styles.logoGlow,
                    {
                      opacity: logoGlow,
                      transform: [{ scale: logoGlow }],
                    },
                  ]}
                />
                <Image
                  source={{ uri: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/npigoj3nywrwc96avmtqi' }}
                  style={styles.goatIcon}
                  resizeMode="contain"
                />
              </Animated.View>
              
              {/* RizzGoat Text */}
              <Animated.Text
                style={[
                  styles.logoText,
                  {
                    opacity: logoTextOpacity,
                    transform: [
                      { scale: logoTextScale },
                      { translateY: logoTextSlide },
                    ],
                  },
                ]}
              >
                RIZZGOAT
              </Animated.Text>
            </View>
          )}
          
          {/* Purpose Showcase Phase */}
          {currentPhase === 'purpose' && (
            <Animated.View
              style={[
                styles.purposeContainer,
                {
                  opacity: purposeOpacity,
                  transform: [{ scale: purposeScale }],
                },
              ]}
            >
              <View style={styles.iconsRow}>
                <Animated.View style={[styles.iconWrapper, { transform: [{ scale: heartScale }] }]}>
                  <Heart size={50} color="#E3222B" fill="#E3222B" />
                </Animated.View>
                <Animated.View style={[styles.iconWrapper, { transform: [{ scale: messageScale }] }]}>
                  <MessageCircle size={50} color="#FF6B6B" fill="#FF6B6B" />
                </Animated.View>
                <Animated.View style={[styles.iconWrapper, { transform: [{ scale: sparkleScale }] }]}>
                  <Sparkles size={50} color="#FFD700" fill="#FFD700" />
                </Animated.View>
              </View>
              <Animated.View style={{ opacity: purposeTextOpacity }}>
                <Text style={styles.purposeTitle}>AI-POWERED DATING</Text>
                <Text style={styles.purposeSubtitle}>Level up your game with intelligent conversation</Text>
              </Animated.View>
            </Animated.View>
          )}
          
          {/* Features Phase */}
          {currentPhase === 'features' && (
            <Animated.View
              style={[
                styles.featuresContainer,
                { opacity: featuresOpacity },
              ]}
            >
              <Animated.View
                style={[
                  styles.featureCard,
                  { transform: [{ translateX: feature1Slide }] },
                ]}
              >
                <Zap size={40} color="#E3222B" />
                <Text style={styles.featureTitle}>INSTANT RIZZ</Text>
                <Text style={styles.featureText}>Generate perfect responses in seconds</Text>
              </Animated.View>
              
              <Animated.View
                style={[
                  styles.featureCard,
                  { transform: [{ translateX: feature2Slide }] },
                ]}
              >
                <Flame size={40} color="#FF6B6B" />
                <Text style={styles.featureTitle}>HOT OPENERS</Text>
                <Text style={styles.featureText}>Break the ice with confidence</Text>
              </Animated.View>
              
              <Animated.View
                style={[
                  styles.featureCard,
                  { transform: [{ translateX: feature3Slide }] },
                ]}
              >
                <Crown size={40} color="#FFD700" />
                <Text style={styles.featureTitle}>ELITE STATUS</Text>
                <Text style={styles.featureText}>Join the top 1% of daters</Text>
              </Animated.View>
            </Animated.View>
          )}
          
          {/* Finale Phase */}
          {currentPhase === 'finale' && (
            <Animated.View
              style={[
                styles.finaleContainer,
                {
                  opacity: finaleOpacity,
                  transform: [{ scale: Animated.multiply(finaleScale, finalePulse) }],
                },
              ]}
            >
              <TouchableOpacity
                onPress={handleGetStarted}
                activeOpacity={0.8}
              >
                <Animated.View
                  style={[
                    {
                      opacity: buttonOpacity,
                      transform: [{ scale: buttonScale }],
                    },
                  ]}
                >
                  <LinearGradient
                    colors={["#E3222B", "#FF6B6B"]}
                    style={styles.getStartedButton}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Animated.View
                      style={[
                        styles.buttonGlow,
                        {
                          opacity: buttonGlow,
                          transform: [{ scale: buttonGlow }],
                        },
                      ]}
                    />
                    <Text style={styles.getStartedText}>GET STARTED</Text>
                    <ArrowRight size={24} color="#FFFFFF" />
                  </LinearGradient>
                </Animated.View>
              </TouchableOpacity>
            </Animated.View>
          )}
        </Animated.View>
      )}
      
      {/* Questionnaire */}
      {showQuestionnaire && (
        <SafeAreaView style={styles.safeArea}>
          <Animated.View
            style={[
              styles.questionnaireContainer,
              {
                opacity: questionnaireOpacity,
                transform: [{ scale: questionnaireScale }],
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
          
          {/* Bottom Goat Icon Animations */}
          <View style={styles.bottomGoatContainer}>
            {[0, 1, 2, 3, 4].map((index) => (
              <Animated.View
                key={index}
                style={[
                  styles.goatIconItem,
                  {
                    transform: [
                      { translateY: goatIconAnimations[index].translateY },
                      { scale: goatIconAnimations[index].scale },
                    ],
                  },
                ]}
              >
                <Image
                  source={{ uri: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/npigoj3nywrwc96avmtqi' }}
                  style={styles.bottomGoatIcon}
                  resizeMode="contain"
                />
              </Animated.View>
            ))}
          </View>
        </SafeAreaView>
      )}
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
  },
  introContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  centerContent: {
    alignItems: "center",
    justifyContent: "center",
  },
  streak: {
    position: "absolute",
    width: 300,
    height: 4,
    backgroundColor: "#E3222B",
    shadowColor: "#E3222B",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 20,
  },
  streak1: {
    top: -100,
    transform: [{ rotate: '45deg' }],
  },
  streak2: {
    top: 100,
    transform: [{ rotate: '-45deg' }],
  },
  streak3: {
    width: 4,
    height: 300,
  },
  logoContainer: {
    width: 200,
    height: 200,
    justifyContent: "center",
    alignItems: "center",
  },
  logoGlow: {
    position: "absolute",
    width: 300,
    height: 300,
    backgroundColor: "#E3222B",
    borderRadius: 150,
    opacity: 0.3,
  },
  goatIcon: {
    width: 150,
    height: 150,
  },
  logoText: {
    fontSize: 56,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: 6,
    marginTop: 30,
    textShadowColor: "#E3222B",
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 20,
  },
  purposeContainer: {
    alignItems: "center",
    padding: 40,
  },
  iconsRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 40,
    gap: 30,
  },
  iconWrapper: {
    padding: 20,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 40,
    shadowColor: "#E3222B",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  purposeTitle: {
    fontSize: 32,
    fontWeight: "900",
    color: "#FFFFFF",
    textAlign: "center",
    letterSpacing: 3,
    marginBottom: 10,
  },
  purposeSubtitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.8)",
    textAlign: "center",
  },
  featuresContainer: {
    padding: 30,
    gap: 20,
  },
  featureCard: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 20,
    padding: 25,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(227, 34, 43, 0.3)",
    shadowColor: "#E3222B",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
  },
  featureTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#FFFFFF",
    marginTop: 15,
    marginBottom: 8,
    letterSpacing: 2,
  },
  featureText: {
    fontSize: 16,
    fontWeight: "500",
    color: "rgba(255, 255, 255, 0.7)",
    textAlign: "center",
  },
  finaleContainer: {
    position: "absolute",
    bottom: 100,
  },
  getStartedButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 50,
    paddingVertical: 20,
    borderRadius: 35,
    gap: 15,
    shadowColor: "#E3222B",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 25,
    elevation: 10,
  },
  buttonGlow: {
    position: "absolute",
    top: -20,
    left: -20,
    right: -20,
    bottom: -20,
    backgroundColor: "#E3222B",
    borderRadius: 45,
    opacity: 0.2,
  },
  getStartedText: {
    fontSize: 20,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: 2,
  },
  emberParticle: {
    position: "absolute",
  },
  emberDot: {
    width: 6,
    height: 6,
    backgroundColor: "#E3222B",
    borderRadius: 3,
    shadowColor: "#E3222B",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
  },
  questionnaireContainer: {
    width: "100%",
    maxWidth: 400,
    paddingHorizontal: 30,
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    borderRadius: 25,
    paddingVertical: 40,
    borderWidth: 1,
    borderColor: "rgba(227, 34, 43, 0.2)",
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
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.2)",
    minWidth: 100,
  },
  optionButtonSelected: {
    backgroundColor: "rgba(227, 34, 43, 0.3)",
    borderColor: "#E3222B",
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
  bottomGoatContainer: {
    position: "absolute",
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-evenly",
    paddingHorizontal: 30,
  },
  goatIconItem: {
    alignItems: "center",
    justifyContent: "center",
  },
  bottomGoatIcon: {
    width: 40,
    height: 40,
    opacity: 0.8,
  },
});