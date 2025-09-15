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
import { ArrowRight, Heart, MessageCircle, Sparkles } from "lucide-react-native";
import { useAppState } from "@/providers/AppStateProvider";
import * as Haptics from "expo-haptics";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

export default function OnboardingScreen() {
  const { completeOnboarding } = useAppState();
  const [currentPhase, setCurrentPhase] = useState<'logo-reveal' | 'purpose' | 'profile-demo' | 'finale' | 'questionnaire'>('logo-reveal');
  const [showQuestionnaire, setShowQuestionnaire] = useState(false);
  const [selectedSex, setSelectedSex] = useState<'male' | 'female' | 'other' | null>(null);
  const [selectedAge, setSelectedAge] = useState<'18-24' | '25-34' | '35-44' | '45+' | null>(null);
  
  // Master opacity for entire intro
  const masterOpacity = useRef(new Animated.Value(1)).current;
  
  // Logo Reveal Phase Animations
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0)).current;
  const logoGlow = useRef(new Animated.Value(0)).current;
  const logoTextOpacity = useRef(new Animated.Value(0)).current;
  const logoTextScale = useRef(new Animated.Value(0.5)).current;
  
  // Slapping animation values
  const logoSlapX = useRef(new Animated.Value(-screenWidth)).current;
  const logoSlapRotation = useRef(new Animated.Value(-45)).current;
  const textSlapX = useRef(new Animated.Value(screenWidth)).current;
  const textSlapRotation = useRef(new Animated.Value(45)).current;
  const logoImpactScale = useRef(new Animated.Value(1)).current;
  const textImpactScale = useRef(new Animated.Value(1)).current;
  
  // Particle effects for logo reveal
  const particleAnimations = useRef(Array.from({ length: 8 }, () => ({
    opacity: new Animated.Value(0),
    scale: new Animated.Value(0),
    translateX: new Animated.Value(0),
    translateY: new Animated.Value(0),
    rotate: new Animated.Value(0),
  }))).current;
  
  // Purpose Phase Animations
  const purposeOpacity = useRef(new Animated.Value(0)).current;
  const purposeScale = useRef(new Animated.Value(0.8)).current;
  const heartScale = useRef(new Animated.Value(0)).current;
  const messageScale = useRef(new Animated.Value(0)).current;
  const sparkleScale = useRef(new Animated.Value(0)).current;
  const purposeTextOpacity = useRef(new Animated.Value(0)).current;
  
  // Profile Demo Phase Animations
  const profileDemoOpacity = useRef(new Animated.Value(0)).current;
  const profileCardScale = useRef(new Animated.Value(0.8)).current;
  const profileCardOpacity = useRef(new Animated.Value(0)).current;
  
  // Typing animations
  const typingText1Opacity = useRef(new Animated.Value(0)).current;
  const typingText2Opacity = useRef(new Animated.Value(0)).current;
  const [displayText1, setDisplayText1] = useState('');
  const [displayText2, setDisplayText2] = useState('');
  const [showReplies, setShowReplies] = useState(false);
  
  // Reply bubbles animations
  const replyBubbles = useRef(Array.from({ length: 3 }, () => ({
    opacity: new Animated.Value(0),
    translateY: new Animated.Value(30),
    scale: new Animated.Value(0.8),
  }))).current;
  
  // Finale Phase Animations
  const finaleOpacity = useRef(new Animated.Value(0)).current;
  const finaleScale = useRef(new Animated.Value(0.5)).current;
  const finalePulse = useRef(new Animated.Value(1)).current;
  const buttonOpacity = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(0.8)).current;
  const buttonGlow = useRef(new Animated.Value(0)).current;
  
  // Floating ember particles
  const emberParticles = useRef(Array.from({ length: 15 }, () => ({
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
  
  // Bottom goat icon animations for questionnaire
  const goatIconAnimations = useRef([
    { translateY: new Animated.Value(0), scale: new Animated.Value(1), rotate: new Animated.Value(0) },
    { translateY: new Animated.Value(0), scale: new Animated.Value(1), rotate: new Animated.Value(0) },
    { translateY: new Animated.Value(0), scale: new Animated.Value(1), rotate: new Animated.Value(0) },
    { translateY: new Animated.Value(0), scale: new Animated.Value(1), rotate: new Animated.Value(0) },
    { translateY: new Animated.Value(0), scale: new Animated.Value(1), rotate: new Animated.Value(0) },
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
                  toValue: -20,
                  duration: 1200,
                  easing: Easing.inOut(Easing.sin),
                  useNativeDriver: true,
                }),
                Animated.timing(anim.translateY, {
                  toValue: 0,
                  duration: 1200,
                  easing: Easing.inOut(Easing.sin),
                  useNativeDriver: true,
                }),
              ]),
              Animated.sequence([
                Animated.timing(anim.scale, {
                  toValue: 1.3,
                  duration: 1200,
                  easing: Easing.inOut(Easing.sin),
                  useNativeDriver: true,
                }),
                Animated.timing(anim.scale, {
                  toValue: 1,
                  duration: 1200,
                  easing: Easing.inOut(Easing.sin),
                  useNativeDriver: true,
                }),
              ]),
              Animated.timing(anim.rotate, {
                toValue: 1,
                duration: 2400,
                easing: Easing.linear,
                useNativeDriver: true,
              }),
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
        // Phase 3: Profile Demo (6 seconds)
        profileDemoAnimation(() => {
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
      const delay = index * 150;
      setTimeout(() => {
        Animated.loop(
          Animated.sequence([
            Animated.parallel([
              Animated.timing(particle.opacity, {
                toValue: 0.6,
                duration: 1500,
                useNativeDriver: true,
              }),
              Animated.timing(particle.scale, {
                toValue: 0.3 + Math.random() * 0.7,
                duration: 1500,
                useNativeDriver: true,
              }),
              Animated.timing(particle.translateY, {
                toValue: -200,
                duration: 5000 + Math.random() * 3000,
                easing: Easing.out(Easing.quad),
                useNativeDriver: true,
              }),
              Animated.timing(particle.translateX, {
                toValue: Math.random() * screenWidth,
                duration: 5000,
                easing: Easing.inOut(Easing.sin),
                useNativeDriver: true,
              }),
            ]),
            Animated.parallel([
              Animated.timing(particle.opacity, {
                toValue: 0,
                duration: 1500,
                useNativeDriver: true,
              }),
              Animated.timing(particle.scale, {
                toValue: 0,
                duration: 1500,
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
      // PHASE 1: Icon slaps in from left with explosive impact
      Animated.parallel([
        // Icon slides in from left with rotation
        Animated.timing(logoSlapX, {
          toValue: 0,
          duration: 600,
          easing: Easing.out(Easing.back(1.7)),
          useNativeDriver: true,
        }),
        // Icon rotates as it slaps in
        Animated.timing(logoSlapRotation, {
          toValue: 0,
          duration: 600,
          easing: Easing.out(Easing.back(1.7)),
          useNativeDriver: true,
        }),
        // Icon appears
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 400,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        // Icon scales up
        Animated.spring(logoScale, {
          toValue: 1.2,
          friction: 3,
          tension: 40,
          useNativeDriver: true,
        }),
        // Glow effect
        Animated.timing(logoGlow, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
      
      // Impact effect on icon landing
      Animated.sequence([
        Animated.timing(logoImpactScale, {
          toValue: 1.4,
          duration: 150,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(logoImpactScale, {
          toValue: 1,
          duration: 200,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      
      // Explosive particle effect on impact
      Animated.delay(100),
      
      // PHASE 2: RizzGoat text slaps in from right
      Animated.parallel([
        // Text slides in from right with rotation
        Animated.timing(textSlapX, {
          toValue: 0,
          duration: 700,
          easing: Easing.out(Easing.back(1.5)),
          useNativeDriver: true,
        }),
        // Text rotates as it slaps in
        Animated.timing(textSlapRotation, {
          toValue: 0,
          duration: 700,
          easing: Easing.out(Easing.back(1.5)),
          useNativeDriver: true,
        }),
        // Text appears
        Animated.timing(logoTextOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        // Text scales up
        Animated.spring(logoTextScale, {
          toValue: 1.2,
          friction: 4,
          tension: 60,
          useNativeDriver: true,
        }),
      ]),
      
      // Impact effect on text landing
      Animated.sequence([
        Animated.timing(textImpactScale, {
          toValue: 1.3,
          duration: 150,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(textImpactScale, {
          toValue: 1,
          duration: 200,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      // Explosive particle effect after both elements land
      particleAnimations.forEach((particle, index) => {
        const angle = (index / 8) * Math.PI * 2;
        const distance = 150;
        
        Animated.sequence([
          Animated.delay(index * 50),
          Animated.parallel([
            Animated.timing(particle.opacity, {
              toValue: 1,
              duration: 300,
              useNativeDriver: true,
            }),
            Animated.spring(particle.scale, {
              toValue: 1,
              friction: 4,
              tension: 100,
              useNativeDriver: true,
            }),
            Animated.timing(particle.translateX, {
              toValue: Math.cos(angle) * distance,
              duration: 800,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
            Animated.timing(particle.translateY, {
              toValue: Math.sin(angle) * distance,
              duration: 800,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
            Animated.timing(particle.rotate, {
              toValue: 1,
              duration: 800,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
          ]),
          Animated.timing(particle.opacity, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
        ]).start();
      });
      
      setTimeout(callback, 1800);
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
      // Animate icons with bounce
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

  const typeText = (text: string, setter: (text: string) => void, callback?: () => void) => {
    let currentIndex = 0;
    const interval = setInterval(() => {
      if (currentIndex <= text.length) {
        setter(text.substring(0, currentIndex));
        currentIndex++;
      } else {
        clearInterval(interval);
        if (callback) callback();
      }
    }, 50);
  };
  
  const eraseText = (setter: (text: string) => void, currentText: string, callback?: () => void) => {
    let currentIndex = currentText.length;
    const interval = setInterval(() => {
      if (currentIndex >= 0) {
        setter(currentText.substring(0, currentIndex));
        currentIndex--;
      } else {
        clearInterval(interval);
        if (callback) callback();
      }
    }, 30);
  };

  const profileDemoAnimation = (callback: () => void) => {
    setCurrentPhase('profile-demo');
    
    // Fade out purpose
    Animated.timing(purposeOpacity, {
      toValue: 0,
      duration: 500,
      useNativeDriver: true,
    }).start();
    
    // Show profile demo
    Animated.sequence([
      // Show container
      Animated.timing(profileDemoOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      // Show profile card
      Animated.parallel([
        Animated.timing(profileCardOpacity, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.spring(profileCardScale, {
          toValue: 1,
          friction: 6,
          tension: 80,
          useNativeDriver: true,
        }),
      ]),
      // Brief pause to ensure picture lands before any text animations
      Animated.delay(300),
      // Show first typing text
      Animated.timing(typingText1Opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Start typing animation
      typeText('Upload a chat or bio', setDisplayText1, () => {
        setTimeout(() => {
          // Erase first text
          eraseText(setDisplayText1, 'Upload a chat or bio', () => {
            // Show second text
            Animated.timing(typingText2Opacity, {
              toValue: 1,
              duration: 300,
              useNativeDriver: true,
            }).start(() => {
              typeText('Get instant replies', setDisplayText2, () => {
                setTimeout(() => {
                  // Fade out typing texts and show replies
                  Animated.parallel([
                    Animated.timing(typingText1Opacity, {
                      toValue: 0,
                      duration: 300,
                      useNativeDriver: true,
                    }),
                    Animated.timing(typingText2Opacity, {
                      toValue: 0,
                      duration: 300,
                      useNativeDriver: true,
                    }),
                  ]).start(() => {
                    setShowReplies(true);
                    // Animate reply bubbles
                    replyBubbles.forEach((bubble, index) => {
                      Animated.sequence([
                        Animated.delay(index * 400),
                        Animated.parallel([
                          Animated.timing(bubble.opacity, {
                            toValue: 1,
                            duration: 400,
                            useNativeDriver: true,
                          }),
                          Animated.spring(bubble.translateY, {
                            toValue: 0,
                            friction: 6,
                            tension: 80,
                            useNativeDriver: true,
                          }),
                          Animated.spring(bubble.scale, {
                            toValue: 1,
                            friction: 6,
                            tension: 80,
                            useNativeDriver: true,
                          }),
                        ]),
                      ]).start();
                    });
                    
                    setTimeout(callback, 3000);
                  });
                }, 1000);
              });
            });
          });
        }, 1500);
      });
    });
  };

  const finaleAnimation = () => {
    setCurrentPhase('finale');
    
    // Fade out profile demo
    Animated.timing(profileDemoOpacity, {
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
          toValue: 1.3,
          friction: 4,
          tension: 60,
          useNativeDriver: true,
        }),
        Animated.timing(logoTextOpacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.spring(logoTextScale, {
          toValue: 1.4,
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

              {/* Goat Logo */}
              <Animated.View
                style={[
                  styles.logoContainer,
                  {
                    opacity: logoOpacity,
                    transform: [
                      { translateX: logoSlapX },
                      { scale: Animated.multiply(logoScale, logoImpactScale) },
                      {
                        rotate: logoSlapRotation.interpolate({
                          inputRange: [-45, 0],
                          outputRange: ['-45deg', '0deg'],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <Image
                  source={{ uri: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/ay01pgwiacxn125yge777' }}
                  style={styles.goatIcon}
                  resizeMode="contain"
                />
              </Animated.View>
              
              {/* RizzGoat Text */}
              <Animated.View
                style={[
                  styles.logoTextContainer,
                  {
                    opacity: logoTextOpacity,
                    transform: [
                      { translateX: textSlapX },
                      { scale: Animated.multiply(logoTextScale, textImpactScale) },
                      {
                        rotate: textSlapRotation.interpolate({
                          inputRange: [0, 45],
                          outputRange: ['0deg', '45deg'],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <Image
                  source={{ uri: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/xycqmecdu06shvcjclqr4' }}
                  style={styles.logoText}
                  resizeMode="contain"
                />
              </Animated.View>
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
              <Animated.View style={[styles.purposeTextContainer, { opacity: purposeTextOpacity }]}>
                <Text style={styles.purposeTitle}>Ai Powered Dating</Text>
                <Text style={styles.purposeSubtitle}>Level up your game with intelligent conversation</Text>
              </Animated.View>
            </Animated.View>
          )}
          
          {/* Profile Demo Phase */}
          {currentPhase === 'profile-demo' && (
            <Animated.View
              style={[
                styles.profileDemoContainer,
                { opacity: profileDemoOpacity },
              ]}
            >
              {/* Typing Text Above Card */}
              <View style={styles.typingContainer}>
                <Animated.Text
                  style={[
                    styles.typingText,
                    { opacity: typingText1Opacity },
                  ]}
                >
                  <Text>
                    {displayText1}
                    {displayText1.length > 0 && displayText1.length < 'Upload a chat or bio'.length && (
                      <Text style={styles.cursor}>|</Text>
                    )}
                  </Text>
                </Animated.Text>
                <Animated.Text
                  style={[
                    styles.typingText,
                    { opacity: typingText2Opacity },
                  ]}
                >
                  <Text>
                    {displayText2}
                    {displayText2.length > 0 && displayText2.length < 'Get instant replies'.length && (
                      <Text style={styles.cursor}>|</Text>
                    )}
                  </Text>
                </Animated.Text>
              </View>
              
              {/* Dating Profile Card */}
              <Animated.View
                style={[
                  styles.profileCard,
                  {
                    opacity: profileCardOpacity,
                    transform: [{ scale: profileCardScale }],
                  },
                ]}
              >
                <Image
                  source={{ uri: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/gi3hkmcdxg9zwdmf425p9' }}
                  style={styles.profileCardImage}
                  resizeMode="cover"
                />
              </Animated.View>
              
              {/* Reply Bubbles */}
              {showReplies && (
                <View style={styles.repliesContainer}>
                  {[
                    "Are you a magician? Because you just turned this swipe into my favorite trick.",
                    "I was today years old when I realized my type is exactly you 😉",
                    "So... when do we tell people we met on here, or do we keep it our little secret?"
                  ].map((reply, replyIndex) => (
                    <Animated.View
                      key={`reply-${replyIndex}`}
                      style={[
                        styles.replyBubble,
                        {
                          opacity: replyBubbles[replyIndex].opacity,
                          transform: [
                            { translateY: replyBubbles[replyIndex].translateY },
                            { scale: replyBubbles[replyIndex].scale },
                          ],
                        },
                      ]}
                    >
                      <Text style={styles.replyText}>{reply}</Text>
                    </Animated.View>
                  ))}
                </View>
              )}
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
                      {
                        rotate: goatIconAnimations[index].rotate.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['0deg', '360deg'],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <Image
                  source={{ uri: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/l6m65ldv3proi19kao2wp' }}
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
    overflow: 'hidden',
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
  explosiveParticle: {
    position: "absolute",
    width: 20,
    height: 20,
    backgroundColor: "#E3222B",
    borderRadius: 10,
    shadowColor: "#E3222B",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 15,
  },
  logoContainer: {
    width: 160,
    height: 160,
    justifyContent: "center",
    alignItems: "center",
  },

  goatIcon: {
    width: 160,
    height: 160,
  },
  logoTextContainer: {
    position: "absolute",
    bottom: -110,
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: {
    width: 700,
    height: 175,
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
    fontWeight: "800",
    color: "#FFFFFF",
    textAlign: "center",
    letterSpacing: 1.2,
    marginBottom: 10,
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      web: 'Inter, -apple-system, system-ui, Segoe UI, Roboto, Helvetica, Arial, sans-serif',
    }),
  },
  purposeSubtitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.9)",
    textAlign: "center",
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif',
      web: 'Inter, -apple-system, system-ui, Segoe UI, Roboto, Helvetica, Arial, sans-serif',
    }),
  },
  featuresContainer: {
    padding: 30,
    gap: 20,
  },
  profileDemoContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 15,
    paddingTop: 28,
    paddingBottom: 28,
  },
  typingContainer: {
    height: 60,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  typingText: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
    fontFamily: Platform.select({
      ios: 'TT Commons Pro',
      android: 'TT Commons Pro',
      web: 'TT Commons Pro, Arial, sans-serif',
    }),
  },
  cursor: {
    color: "#E3222B",
    fontSize: 24,
    fontWeight: "300",
  },
  profileCard: {
    width: screenWidth * 0.85,
    maxWidth: 350,
    aspectRatio: 0.75,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
    marginVertical: 20,
  },
  profileCardImage: {
    width: "100%",
    height: "100%",
  },
  repliesContainer: {
    width: "100%",
    maxWidth: screenWidth * 0.9,
    gap: 12,
    paddingHorizontal: 20,
  },
  replyBubble: {
    backgroundColor: "#E3222B",
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 14,
    alignSelf: "flex-end",
    maxWidth: "90%",
    minHeight: 44,
    justifyContent: "center",
    shadowColor: "#E3222B",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  replyText: {
    fontSize: 15,
    fontWeight: "500",
    color: "#FFFFFF",
    lineHeight: 22,
    textAlign: "left",
    flexWrap: "wrap",
    fontFamily: Platform.select({
      ios: 'TT Commons Pro',
      android: 'TT Commons Pro',
      web: 'TT Commons Pro, Arial, sans-serif',
    }),
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
    fontFamily: Platform.select({
      ios: 'TT Commons Pro',
      android: 'TT Commons Pro',
      web: 'TT Commons Pro, Arial, sans-serif',
    }),
  },
  emberParticle: {
    position: "absolute",
  },
  emberDot: {
    width: 8,
    height: 8,
    backgroundColor: "#E3222B",
    borderRadius: 4,
    shadowColor: "#E3222B",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
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
    fontFamily: Platform.select({
      ios: 'TT Commons Pro',
      android: 'TT Commons Pro',
      web: 'TT Commons Pro, Arial, sans-serif',
    }),
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
    fontFamily: Platform.select({
      ios: 'TT Commons Pro',
      android: 'TT Commons Pro',
      web: 'TT Commons Pro, Arial, sans-serif',
    }),
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
    fontFamily: Platform.select({
      ios: 'TT Commons Pro',
      android: 'TT Commons Pro',
      web: 'TT Commons Pro, Arial, sans-serif',
    }),
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
    fontFamily: Platform.select({
      ios: 'TT Commons Pro',
      android: 'TT Commons Pro',
      web: 'TT Commons Pro, Arial, sans-serif',
    }),
  },
  bottomGoatContainer: {
    position: "absolute",
    bottom: 30,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-evenly",
    paddingHorizontal: 20,
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
  purposeTextContainer: {
    alignItems: "center",
  },
});