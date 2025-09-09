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
    title: "BECOME THE",
    subtitle: "GOAT",
    description: "Master the game of attraction",
    gradient: ["#E3222B", "#FF1744"],
  },
  {
    title: "UNLOCK YOUR",
    subtitle: "RIZZ",
    description: "Confidence that speaks volumes",
    gradient: ["#FF1744", "#FF4569"],
  },
  {
    title: "DOMINATE THE",
    subtitle: "GAME",
    description: "Turn matches into memories",
    gradient: ["#FF4569", "#FF6B8A"],
  },
  {
    title: "LEGENDARY",
    subtitle: "STATUS",
    description: "Join the elite dating league",
    gradient: ["#FF6B8A", "#E3222B"],
  },
];

export default function OnboardingScreen() {
  const { completeOnboarding } = useAppState();
  const [currentStep, setCurrentStep] = useState(0);
  const [showQuestionnaire, setShowQuestionnaire] = useState(false);
  const [selectedSex, setSelectedSex] = useState<'male' | 'female' | 'other' | null>(null);
  const [selectedAge, setSelectedAge] = useState<'18-24' | '25-34' | '35-44' | '45+' | null>(null);
  const [showIntro, setShowIntro] = useState(true);
  
  // Intro animations
  const introGoatScale = useRef(new Animated.Value(0)).current;
  const introGoatRotate = useRef(new Animated.Value(0)).current;
  const introGoatOpacity = useRef(new Animated.Value(0)).current;
  const introGlow = useRef(new Animated.Value(0)).current;
  const introTextOpacity = useRef(new Animated.Value(0)).current;
  
  // Main content animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.3)).current;
  const slideAnim = useRef(new Animated.Value(100)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  
  // Step icon animations
  const stepIconScale = useRef(new Animated.Value(0)).current;
  const stepIconRotate = useRef(new Animated.Value(0)).current;
  const stepIconGlow = useRef(new Animated.Value(0)).current;
  
  // Logo animations
  const logoScale = useRef(new Animated.Value(0)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoRotate = useRef(new Animated.Value(0)).current;
  const logoPulse = useRef(new Animated.Value(1)).current;
  const logoGlow = useRef(new Animated.Value(0)).current;
  
  // Energy particles
  const energyParticles = useRef(Array.from({ length: 20 }, () => ({
    translateX: new Animated.Value(0),
    translateY: new Animated.Value(0),
    opacity: new Animated.Value(0),
    scale: new Animated.Value(0),
  }))).current;
  
  // Explosion particles
  const explosionParticles = useRef(Array.from({ length: 30 }, () => ({
    translateX: new Animated.Value(0),
    translateY: new Animated.Value(0),
    opacity: new Animated.Value(0),
    scale: new Animated.Value(0),
    rotate: new Animated.Value(0),
  }))).current;
  
  // Background animations
  const backgroundScale = useRef(new Animated.Value(1)).current;
  const backgroundRotate = useRef(new Animated.Value(0)).current;
  const backgroundOpacity = useRef(new Animated.Value(1)).current;
  
  // Questionnaire animation
  const questionnaireAnim = useRef(new Animated.Value(0)).current;
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
    startIntroAnimation();
  }, []);

  useEffect(() => {
    if (showQuestionnaire) {
      Animated.spring(questionnaireAnim, {
        toValue: 1,
        friction: 8,
        tension: 100,
        useNativeDriver: true,
      }).start();
      
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
  }, [showQuestionnaire]);

  const startIntroAnimation = () => {
    // Epic intro sequence
    Animated.sequence([
      // Fade in goat with glow
      Animated.parallel([
        Animated.timing(introGoatOpacity, {
          toValue: 1,
          duration: 800,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(introGoatScale, {
          toValue: 1.5,
          friction: 4,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(introGlow, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
      // Pulse and rotate
      Animated.parallel([
        Animated.sequence([
          Animated.timing(introGoatScale, {
            toValue: 1.8,
            duration: 400,
            easing: Easing.out(Easing.back(2)),
            useNativeDriver: true,
          }),
          Animated.timing(introGoatScale, {
            toValue: 1.5,
            duration: 400,
            easing: Easing.in(Easing.back(2)),
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(introGoatRotate, {
          toValue: 1,
          duration: 800,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      // Show text
      Animated.timing(introTextOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Explosion effect
      createExplosion();
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(introGoatOpacity, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(introTextOpacity, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(introGlow, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
        ]).start(() => {
          setShowIntro(false);
          startMainSequence();
        });
      }, 1500);
    });
  };
  
  const createExplosion = () => {
    explosionParticles.forEach((particle, index) => {
      const angle = (index / explosionParticles.length) * Math.PI * 2;
      const distance = 150 + Math.random() * 100;
      const duration = 800 + Math.random() * 400;
      
      Animated.parallel([
        Animated.timing(particle.opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(particle.scale, {
          toValue: 0.5 + Math.random() * 0.5,
          duration: duration,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(particle.translateX, {
          toValue: Math.cos(angle) * distance,
          duration: duration,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(particle.translateY, {
          toValue: Math.sin(angle) * distance,
          duration: duration,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(particle.rotate, {
          toValue: Math.random() * 4 - 2,
          duration: duration,
          useNativeDriver: true,
        }),
      ]).start(() => {
        Animated.timing(particle.opacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start();
      });
    });
  };
  
  const startMainSequence = () => {
    // Start background animation
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(backgroundScale, {
            toValue: 1.1,
            duration: 3000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(backgroundScale, {
            toValue: 1,
            duration: 3000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(backgroundRotate, {
          toValue: 1,
          duration: 20000,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ])
    ).start();
    
    const stepDuration = 3000;
    const totalSteps = animationSteps.length;
    
    const animateStep = (stepIndex: number) => {
      setCurrentStep(stepIndex);
      
      // Animate energy particles
      animateEnergyParticles();
      
      // Step icon animation
      Animated.sequence([
        Animated.parallel([
          Animated.spring(stepIconScale, {
            toValue: 1,
            friction: 3,
            tension: 100,
            useNativeDriver: true,
          }),
          Animated.timing(stepIconRotate, {
            toValue: 1,
            duration: 1000,
            easing: Easing.out(Easing.back(2)),
            useNativeDriver: true,
          }),
          Animated.timing(stepIconGlow, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
        Animated.loop(
          Animated.sequence([
            Animated.timing(stepIconScale, {
              toValue: 1.1,
              duration: 1000,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
            Animated.timing(stepIconScale, {
              toValue: 1,
              duration: 1000,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
          ])
        ),
      ]);
      
      // Main content animation with 3D effect
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 4,
          tension: 60,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 6,
          tension: 80,
          useNativeDriver: true,
        }),
        Animated.timing(rotateAnim, {
          toValue: 0,
          duration: 800,
          easing: Easing.out(Easing.back(1.5)),
          useNativeDriver: true,
        }),
      ]).start(() => {
        if (stepIndex < totalSteps - 1) {
          setTimeout(() => {
            // Exit animation
            Animated.parallel([
              Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 400,
                easing: Easing.in(Easing.cubic),
                useNativeDriver: true,
              }),
              Animated.timing(scaleAnim, {
                toValue: 0.5,
                duration: 400,
                easing: Easing.in(Easing.cubic),
                useNativeDriver: true,
              }),
              Animated.timing(slideAnim, {
                toValue: -150,
                duration: 400,
                easing: Easing.in(Easing.cubic),
                useNativeDriver: true,
              }),
              Animated.timing(rotateAnim, {
                toValue: -0.5,
                duration: 400,
                useNativeDriver: true,
              }),
              Animated.timing(stepIconScale, {
                toValue: 0,
                duration: 400,
                useNativeDriver: true,
              }),
              Animated.timing(stepIconGlow, {
                toValue: 0,
                duration: 400,
                useNativeDriver: true,
              }),
            ]).start(() => {
              stepIconRotate.setValue(0);
              rotateAnim.setValue(0.5);
              slideAnim.setValue(150);
              animateStep(stepIndex + 1);
            });
          }, stepDuration);
        } else {
          setTimeout(() => {
            hideEnergyParticles();
            showEpicFinale();
          }, stepDuration);
        }
      });
    };
    
    animateStep(0);
  };
  
  const animateEnergyParticles = () => {
    energyParticles.forEach((particle, index) => {
      const delay = index * 50;
      const angle = (index / energyParticles.length) * Math.PI * 2;
      const radius = 100 + Math.random() * 50;
      
      setTimeout(() => {
        Animated.loop(
          Animated.sequence([
            Animated.parallel([
              Animated.timing(particle.opacity, {
                toValue: 0.8,
                duration: 500,
                useNativeDriver: true,
              }),
              Animated.spring(particle.scale, {
                toValue: 0.3 + Math.random() * 0.3,
                friction: 4,
                tension: 100,
                useNativeDriver: true,
              }),
              Animated.timing(particle.translateX, {
                toValue: Math.cos(angle) * radius,
                duration: 2000,
                easing: Easing.inOut(Easing.sin),
                useNativeDriver: true,
              }),
              Animated.timing(particle.translateY, {
                toValue: Math.sin(angle) * radius,
                duration: 2000,
                easing: Easing.inOut(Easing.sin),
                useNativeDriver: true,
              }),
            ]),
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
          ])
        ).start();
      }, delay);
    });
  };
  
  const hideEnergyParticles = () => {
    energyParticles.forEach((particle) => {
      Animated.parallel([
        Animated.timing(particle.opacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(particle.scale, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const showEpicFinale = () => {
    // Clear previous animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(stepIconScale, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setCurrentStep(-1);
      
      // Epic finale sequence
      Animated.sequence([
        // Logo entrance with dramatic effect
        Animated.parallel([
          Animated.timing(logoOpacity, {
            toValue: 1,
            duration: 800,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.spring(logoScale, {
            toValue: 1.5,
            friction: 3,
            tension: 40,
            useNativeDriver: true,
          }),
          Animated.timing(logoRotate, {
            toValue: 2,
            duration: 1500,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(logoGlow, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]),
        // Settle animation
        Animated.spring(logoScale, {
          toValue: 1.2,
          friction: 5,
          tension: 80,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Start continuous animations
        Animated.loop(
          Animated.sequence([
            Animated.timing(logoPulse, {
              toValue: 1.15,
              duration: 1500,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
            Animated.timing(logoPulse, {
              toValue: 1,
              duration: 1500,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
          ])
        ).start();
        
        // Start glow animation
        Animated.loop(
          Animated.sequence([
            Animated.timing(logoGlow, {
              toValue: 1.5,
              duration: 2000,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
            Animated.timing(logoGlow, {
              toValue: 1,
              duration: 2000,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
          ])
        ).start();
        
        setTimeout(() => {
          setShowQuestionnaire(true);
        }, 2000);
      });
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
      
      {/* Intro Animation */}
      {showIntro && (
        <View style={StyleSheet.absoluteFillObject}>
          <LinearGradient
            colors={["#000000", "#1a0000"]}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={styles.introContainer}>
            <Animated.View
              style={[
                styles.introGoatContainer,
                {
                  opacity: introGoatOpacity,
                  transform: [
                    { scale: introGoatScale },
                    {
                      rotate: introGoatRotate.interpolate({
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
                  styles.introGlowEffect,
                  {
                    opacity: introGlow,
                    transform: [{ scale: introGlow }],
                  },
                ]}
              />
              <Image
                source={{ uri: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/npigoj3nywrwc96avmtqi' }}
                style={styles.introGoatImage}
                resizeMode="contain"
              />
            </Animated.View>
            <Animated.Text
              style={[
                styles.introText,
                { opacity: introTextOpacity },
              ]}
            >
              RIZZGOAT
            </Animated.Text>
          </View>
          
          {/* Explosion Particles */}
          {explosionParticles.map((particle, index) => (
            <Animated.View
              key={`explosion-${index}`}
              style={[
                styles.explosionParticle,
                {
                  opacity: particle.opacity,
                  transform: [
                    { translateX: particle.translateX },
                    { translateY: particle.translateY },
                    { scale: particle.scale },
                    {
                      rotate: particle.rotate.interpolate({
                        inputRange: [-2, 2],
                        outputRange: ['-720deg', '720deg'],
                      }),
                    },
                  ],
                },
              ]}
            >
              <View style={styles.explosionDot} />
            </Animated.View>
          ))}
        </View>
      )}
      
      {/* Dynamic Background */}
      {!showIntro && (
        <Animated.View 
          style={[
            StyleSheet.absoluteFillObject, 
            { 
              transform: [
                { scale: backgroundScale },
                {
                  rotate: backgroundRotate.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0deg', '45deg'],
                  }),
                },
              ],
            },
          ]}
        >
          <LinearGradient
            colors={currentStep >= 0 && currentStepData ? currentStepData.gradient as [string, string] : ["#000000", "#1a0000"]}
            style={StyleSheet.absoluteFillObject}
            locations={[0, 1]}
          />
        </Animated.View>
      )}
      
      {/* Energy Particles */}
      {currentStep >= 0 && energyParticles.map((particle, index) => (
        <Animated.View
          key={`energy-${index}`}
          style={[
            styles.energyParticle,
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
          <Image
            source={{ uri: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/npigoj3nywrwc96avmtqi' }}
            style={styles.energyParticleImage}
            resizeMode="contain"
          />
        </Animated.View>
      ))}
      
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
                  {
                    rotate: rotateAnim.interpolate({
                      inputRange: [-0.5, 0, 0.5],
                      outputRange: ['-15deg', '0deg', '15deg'],
                    }),
                  },
                ],
              },
            ]}
          >
            <Animated.View 
              style={[
                styles.iconContainer,
                {
                  transform: [
                    { scale: stepIconScale },
                    {
                      rotate: stepIconRotate.interpolate({
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
                  styles.iconGlow,
                  {
                    opacity: stepIconGlow,
                    transform: [{ scale: stepIconGlow }],
                  },
                ]}
              />
              <Image 
                source={{ uri: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/npigoj3nywrwc96avmtqi' }}
                style={styles.stepGoatIcon}
                resizeMode="contain"
              />
            </Animated.View>
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
                      inputRange: [0, 2],
                      outputRange: ['0deg', '720deg'],
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
              <Animated.View
                style={[
                  styles.logoGlowEffect,
                  {
                    opacity: logoGlow,
                    transform: [
                      { 
                        scale: logoGlow.interpolate({
                          inputRange: [0, 1, 1.5],
                          outputRange: [1, 1.5, 2],
                        }),
                      },
                    ],
                  },
                ]}
              />
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
        
        {/* Bottom Goat Icon Animations */}
        {showQuestionnaire && (
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
  introContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  introGoatContainer: {
    width: 200,
    height: 200,
    justifyContent: "center",
    alignItems: "center",
  },
  introGoatImage: {
    width: 150,
    height: 150,
  },
  introGlowEffect: {
    position: "absolute",
    width: 250,
    height: 250,
    backgroundColor: "#E3222B",
    borderRadius: 125,
    opacity: 0.3,
  },
  introText: {
    fontSize: 48,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: 5,
    marginTop: 30,
    textShadowColor: "#E3222B",
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 20,
  },
  explosionParticle: {
    position: "absolute",
    top: height / 2,
    left: width / 2,
  },
  explosionDot: {
    width: 8,
    height: 8,
    backgroundColor: "#E3222B",
    borderRadius: 4,
    shadowColor: "#E3222B",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
  },
  energyParticle: {
    position: "absolute",
    top: height / 2,
    left: width / 2,
  },
  energyParticleImage: {
    width: 20,
    height: 20,
    opacity: 0.8,
  },
  iconGlow: {
    position: "absolute",
    width: 150,
    height: 150,
    backgroundColor: "#E3222B",
    borderRadius: 75,
    opacity: 0.2,
  },
  logoGlowEffect: {
    position: "absolute",
    width: 250,
    height: 250,
    backgroundColor: "#E3222B",
    borderRadius: 125,
    opacity: 0.2,
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