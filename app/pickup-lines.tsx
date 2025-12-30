import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Animated,
  ActivityIndicator,
  Platform,
  Share,
  Alert,
  StatusBar,
  KeyboardAvoidingView,
  Keyboard,
  Easing,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  RefreshCw,
  Copy,
  Heart,
  Share2,
  Flame,
  Sparkles,
  Zap,
} from "lucide-react-native";
import { useTheme } from "@/providers/ThemeProvider";
import { useAppState } from "@/providers/AppStateProvider";
import { useLanguage } from "@/providers/LanguageProvider";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import { generatePickupLine } from "@/services/openai";



export default function PickupLinesScreen() {
  const router = useRouter();
  const { theme, isDark } = useTheme();
  const { addFavorite, favorites } = useAppState();
  const { t, currentLanguage } = useLanguage();
  
  const TONE_PRESETS = useMemo(() => [
    t('pickupLines.tones.playful'),
    t('pickupLines.tones.confident'),
    t('pickupLines.tones.wholesome'),
    t('pickupLines.tones.bold')
  ], [t]);
  
  const SPICE_LEVELS = useMemo(() => [
    t('pickupLines.spiceLevels.cute'),
    t('pickupLines.spiceLevels.medium'),
    t('pickupLines.spiceLevels.spicy')
  ], [t]);
  
  const [currentLine, setCurrentLine] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [spiceLevel, setSpiceLevel] = useState<number>(1);
  const [selectedTone, setSelectedTone] = useState<number>(0);
  const [context, setContext] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState<number>(0);
  
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const bubbleScale = useRef(new Animated.Value(1)).current;
  const confettiAnim = useRef(new Animated.Value(0)).current;
  const sliderAnim = useRef(new Animated.Value(0.5)).current;
  const isFirstRender = useRef<boolean>(true);
  const contextDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollRef = useRef<ScrollView | null>(null);

  const generateNewLine = useCallback(async () => {
    if (!currentLanguage || TONE_PRESETS.length === 0 || SPICE_LEVELS.length === 0) return;
    setLoading(true);
    
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    try {
      setError(null);
      console.log('Generating pickup line with:', {
        tone: TONE_PRESETS[selectedTone],
        spiceLevel: SPICE_LEVELS[spiceLevel],
        context,
        language: currentLanguage,
      });
      
      const line = await generatePickupLine({
        tone: TONE_PRESETS[selectedTone],
        spiceLevel: SPICE_LEVELS[spiceLevel],
        context: context.trim(),
        language: currentLanguage,
      });
      
      console.log('Generated line:', line);
      setCurrentLine(line);
      
      Animated.spring(bubbleScale, {
        toValue: 1,
        friction: 3,
        tension: 40,
        useNativeDriver: true,
      }).start();
    } catch (error) {
      console.error('Error generating pickup line:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      if (errorMessage.includes('429')) {
        setError(t('pickupLines.rateLimitError'));
        Alert.alert(t('pickupLines.rateLimitTitle'), t('pickupLines.rateLimitError'));
      } else if (errorMessage.includes('API key')) {
        setError(t('pickupLines.configError'));
        Alert.alert(t('common.error'), t('pickupLines.configError'));
      } else {
        setError(t('pickupLines.error'));
        Alert.alert(t('common.error'), t('pickupLines.error'));
      }
    } finally {
      setLoading(false);
      shimmerAnim.stopAnimation();
    }
  }, [selectedTone, spiceLevel, context, shimmerAnim, bubbleScale, currentLanguage, TONE_PRESETS, SPICE_LEVELS, t]);

  useEffect(() => {
    if (!currentLine) {
      generateNewLine();
    }
  }, [currentLine, generateNewLine]);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    generateNewLine();
  }, [spiceLevel, selectedTone, TONE_PRESETS, generateNewLine]);

  useEffect(() => {
    if (contextDebounceRef.current) {
      clearTimeout(contextDebounceRef.current);
    }
    contextDebounceRef.current = setTimeout(() => {
      generateNewLine();
    }, 600);
    return () => {
      if (contextDebounceRef.current) {
        clearTimeout(contextDebounceRef.current);
      }
    };
  }, [context, generateNewLine]);

  useEffect(() => {
    Animated.timing(sliderAnim, {
      toValue: spiceLevel / 2,
      duration: 240,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) {
        sliderAnim.setValue(spiceLevel / 2);
      }
    });
  }, [spiceLevel, sliderAnim]);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onShow = (e: any) => {
      const height = e?.endCoordinates?.height ?? 0;
      console.log('Keyboard show, height:', height);
      setKeyboardHeight(height);
      console.log('Keyboard shown - no auto scroll');
    };
    const onHide = () => {
      console.log('Keyboard hide');
      setKeyboardHeight(0);
    };

    const subShow = Keyboard.addListener(showEvent as any, onShow);
    const subHide = Keyboard.addListener(hideEvent as any, onHide);
    return () => {
      subShow.remove();
      subHide.remove();
    };
  }, []);

  const handleCopy = async (): Promise<void> => {
    await Clipboard.setStringAsync(currentLine);
    if (Platform.OS !== "web") {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    Alert.alert(t('pickupLines.copied'), t('pickupLines.copiedMessage'));
  };

  const handleSave = async (): Promise<void> => {
    addFavorite({
      id: Date.now().toString(),
      type: "pickup-line",
      content: currentLine,
      metadata: {
        tone: selectedTone,
        spiceLevel: SPICE_LEVELS[spiceLevel],
      },
    });
    
    if (Platform.OS !== "web") {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    
    if (favorites.length < 3) {
      Animated.sequence([
        Animated.timing(confettiAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(confettiAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start();
    }
  };

  const handleShare = async (): Promise<void> => {
    try {
      await Share.share({
        message: `${currentLine}\n\n#RizzGoat`,
      });
    } catch (error) {
      console.log("Share error:", error);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor="transparent" translucent />
      
      <LinearGradient
        colors={isDark ? ["#0a0a0a", "#1a1a1a", "#000000"] : ["#f8f9fa", "#ffffff", "#f1f3f4"]}
        style={styles.gradient}
        locations={[0, 0.5, 1]}
      />
      
      <Animated.View 
        style={[
          styles.floatingElement,
          styles.floatingElement1,
          {
            transform: [
              {
                translateY: shimmerAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -15],
                }),
              },
            ],
          },
        ]}
      >
        <LinearGradient
          colors={['rgba(255, 122, 89, 0.1)', 'rgba(255, 184, 140, 0.05)']}
          style={styles.floatingGradient}
        />
      </Animated.View>
      
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => {
              if ((router as any).canGoBack && (router as any).canGoBack()) {
                router.back();
              } else {
                router.replace('/');
              }
            }} 
            style={[styles.backButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}
          >
            <ArrowLeft size={20} color={theme.text} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: theme.text }]}>{t('pickupLines.title')}</Text>
            <View style={styles.headerSubtitle}>
              <Sparkles size={14} color={theme.primary} />
              <Text style={[styles.headerSubtitleText, { color: theme.primary }]}>{t('pickupLines.aiGenerated')}</Text>
            </View>
          </View>
          <TouchableOpacity 
            style={[styles.headerAction, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}
          >
            <Zap size={20} color={theme.text} />
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          style={styles.kav}
          behavior={Platform.OS === 'android' ? 'height' : undefined}
          keyboardVerticalOffset={0}
          testID="kav"
        >
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: styles.scrollContent.padding + keyboardHeight + 24 }]}
            showsVerticalScrollIndicator={false}
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            keyboardShouldPersistTaps="handled"
            contentInsetAdjustmentBehavior="always"
            automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
          >
          {/* Message Bubble */}
          <Animated.View
            style={[
              styles.messageBubbleWrapper,
              {
                transform: [{ scale: loading ? 0.95 : bubbleScale }],
              },
            ]}
          >
            <LinearGradient
              colors={loading ? 
                ['rgba(255, 122, 89, 0.8)', 'rgba(255, 184, 140, 0.6)'] :
                ['#E3222B', '#FF7A59', '#FFB88C']
              }
              style={styles.messageBubble}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              {loading ? (
                <View style={styles.shimmerContainer}>
                  <Animated.View
                    style={[
                      styles.shimmer,
                      {
                        opacity: shimmerAnim,
                      },
                    ]}
                  />
                  <View style={styles.loadingContent}>
                    <ActivityIndicator size="large" color="#FFFFFF" />
                    <Text style={styles.loadingText}>{t('pickupLines.generating')}</Text>
                  </View>
                </View>
              ) : (
                <View style={styles.messageContent}>
                  <View style={styles.quoteIcon}>
                    <Text style={styles.quoteText}>“</Text>
                  </View>
                  <Text style={styles.lineText}>{currentLine}</Text>
                  <View style={styles.quoteIconEnd}>
                    <Text style={styles.quoteText}>”</Text>
                  </View>
                  {error && (
                    <Text style={styles.errorText}>{error}</Text>
                  )}
                </View>
              )}
            </LinearGradient>
          </Animated.View>

          {/* Spice Slider */}
          <View style={styles.sliderSection} testID="spice-slider-section">
            <LinearGradient
              colors={isDark ? ['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.02)'] : ['rgba(0,0,0,0.02)', 'rgba(0,0,0,0.01)']}
              style={styles.sectionCard}
            >
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>
                  {t('pickupLines.spiceLevel')}
                </Text>
                <View style={styles.spiceBadge}>
                  <Flame size={14} color="#FF4444" />
                  <Text style={[styles.spiceBadgeText, { color: '#FF4444' }]}>
                    {SPICE_LEVELS[spiceLevel]}
                  </Text>
                </View>
              </View>
              
              <View style={styles.newSliderContainer} testID="spice-slider-container">
                {/* Slider Track with Fire Icons */}
                <View style={styles.sliderWithIcons}>
                  {/* Fire Icons positioned outside the track with gray background */}
                  <TouchableOpacity
                    onPress={() => setSpiceLevel(0)}
                    style={[
                      styles.fireIconButton,
                      styles.fireIconLeft,
                    ]}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    pressRetentionOffset={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    activeOpacity={0.7}
                    testID={`spice-icon-0`}
                  >
                    <View style={[styles.fireIconBackground, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}>
                      <Flame
                        size={22}
                        color={spiceLevel === 0 ? "#E3222B" : theme.textSecondary}
                      />
                    </View>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    onPress={() => {
                      setSpiceLevel(1);
                      Animated.timing(sliderAnim, {
                        toValue: 0.5,
                        duration: 220,
                        easing: Easing.out(Easing.cubic),
                        useNativeDriver: false,
                      }).start(({ finished }) => {
                        if (finished) sliderAnim.setValue(0.5);
                      });
                    }}
                    style={[
                      styles.fireIconButton,
                      styles.fireIconCenter,
                    ]}
                    hitSlop={{ top: 14, bottom: 14, left: 16, right: 16 }}
                    pressRetentionOffset={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    activeOpacity={0.7}
                    testID={`spice-icon-1`}
                  >
                    <View style={[styles.fireIconBackground, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}>
                      <Flame
                        size={22}
                        color={spiceLevel === 1 ? "#E3222B" : theme.textSecondary}
                      />
                    </View>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    onPress={() => setSpiceLevel(2)}
                    style={[
                      styles.fireIconButton,
                      styles.fireIconRight,
                    ]}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    pressRetentionOffset={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    activeOpacity={0.7}
                    testID={`spice-icon-2`}
                  >
                    <View style={[styles.fireIconBackground, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}>
                      <Flame
                        size={22}
                        color={spiceLevel === 2 ? "#E3222B" : theme.textSecondary}
                      />
                    </View>
                  </TouchableOpacity>
                  
                  {/* Slider Track (non-interactive) */}
                  <View
                    pointerEvents="none"
                    style={[styles.newSliderTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}
                  >
                    <Animated.View
                      style={[
                        styles.newSliderFill,
                        {
                          width: sliderAnim.interpolate({
                            inputRange: [0, 0.5, 1],
                            outputRange: ["0%", "49%", "100%"],
                          }),
                        },
                      ]}
                    />
                  </View>
                </View>
                
                {/* Labels Below Track */}
                <View style={styles.sliderLabelsContainer}>
                  <Text style={[styles.sliderLabelText, { color: theme.textSecondary }]}>{t('pickupLines.spiceLevels.cute')}</Text>
                  <Text style={[styles.sliderLabelText, { color: theme.textSecondary }]}>{t('pickupLines.spiceLevels.medium')}</Text>
                  <Text style={[styles.sliderLabelText, { color: theme.textSecondary }]}>{t('pickupLines.spiceLevels.spicy')}</Text>
                </View>
              </View>
            </LinearGradient>
          </View>

          {/* Tone Presets */}
          <View style={styles.toneSection}>
            <LinearGradient
              colors={isDark ? ['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.02)'] : ['rgba(0,0,0,0.02)', 'rgba(0,0,0,0.01)']}
              style={styles.sectionCard}
            >
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                {t('pickupLines.tone')}
              </Text>
              <View style={styles.toneGrid}>
                {TONE_PRESETS.map((tone, index) => (
                  <TouchableOpacity
                    key={tone}
                    onPress={() => setSelectedTone(index)}
                    style={styles.toneChipWrapper}
                    testID={`tone-${tone}`}
                  >
                    {selectedTone === index ? (
                      <LinearGradient
                        colors={['#E3222B', '#FF7A59']}
                        style={styles.toneChip}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      >
                        <Text style={styles.toneChipTextActive}>
                          {tone}
                        </Text>
                      </LinearGradient>
                    ) : (
                      <View style={[styles.toneChip, { 
                        backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                        borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'
                      }]}>
                        <Text style={[styles.toneChipText, { color: theme.text }]}>
                          {tone}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </LinearGradient>
          </View>

          {/* Context Input */}
          <View style={styles.contextSection}>
            <LinearGradient
              colors={isDark ? ['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.02)'] : ['rgba(0,0,0,0.02)', 'rgba(0,0,0,0.01)']}
              style={styles.sectionCard}
            >
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                {t('pickupLines.context')}
              </Text>
              <View style={[styles.inputWrapper, { 
                backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'
              }]} testID="context-input-wrapper">
                <TextInput
                  style={[styles.contextInput, { color: theme.text }]}
                  placeholder={t('pickupLines.contextPlaceholder')}
                  placeholderTextColor={theme.textSecondary}
                  value={context}
                  onChangeText={setContext}
                  multiline
                  returnKeyType="done"
                  blurOnSubmit
                  onSubmitEditing={() => Keyboard.dismiss()}
                  onFocus={() => console.log('Context input focused') }
                  testID="context-input"
                  autoCorrect
                  autoCapitalize="sentences"
                  selectionColor={theme.primary}
                  underlineColorAndroid="transparent"
                />
              </View>
            </LinearGradient>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              onPress={generateNewLine}
              style={styles.primaryButtonWrapper}
              disabled={loading}
              activeOpacity={0.8}
              testID="generate-button"
            >
              <LinearGradient
                colors={loading ? ['rgba(227, 34, 43, 0.6)', 'rgba(255, 122, 89, 0.6)'] : ['#E3222B', '#FF7A59']}
                style={styles.primaryButton}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <RefreshCw size={22} color="#FFFFFF" />
                <Text style={styles.primaryButtonText}>
                  {loading ? t('pickupLines.generating') : t('pickupLines.regenerate')}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.secondaryButtons}>
              <TouchableOpacity
                onPress={handleCopy}
                style={styles.iconButtonWrapper}
                disabled={!currentLine || loading}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={isDark ? ['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)'] : ['rgba(0,0,0,0.05)', 'rgba(0,0,0,0.02)']}
                  style={styles.iconButton}
                >
                  <Copy size={20} color={theme.text} />
                </LinearGradient>
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={handleSave}
                style={styles.iconButtonWrapper}
                disabled={!currentLine || loading}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={isDark ? ['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)'] : ['rgba(0,0,0,0.05)', 'rgba(0,0,0,0.02)']}
                  style={styles.iconButton}
                >
                  <Heart size={20} color={theme.text} />
                </LinearGradient>
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={handleShare}
                style={styles.iconButtonWrapper}
                disabled={!currentLine || loading}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={isDark ? ['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)'] : ['rgba(0,0,0,0.05)', 'rgba(0,0,0,0.02)']}
                  style={styles.iconButton}
                >
                  <Share2 size={20} color={theme.text} />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
          </ScrollView>
        </KeyboardAvoidingView>
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
    bottom: 0,
  },
  floatingElement: {
    position: "absolute",
    borderRadius: 100,
  },
  floatingElement1: {
    width: 180,
    height: 180,
    top: 80,
    right: -40,
  },
  floatingGradient: {
    flex: 1,
    borderRadius: 100,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    backdropFilter: "blur(10px)",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
  },
  headerSubtitle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  headerSubtitleText: {
    fontSize: 12,
    fontWeight: "600",
  },
  headerAction: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    backdropFilter: "blur(10px)",
  },
  scrollContent: {
    padding: 20,
  },
  messageBubbleWrapper: {
    marginBottom: 32,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  messageBubble: {
    borderRadius: 28,
    padding: 32,
    minHeight: 140,
    justifyContent: "center",
  },
  messageContent: {
    alignItems: "center",
    position: "relative",
  },
  quoteIcon: {
    position: "absolute",
    top: -20,
    left: -10,
  },
  quoteIconEnd: {
    position: "absolute",
    bottom: -20,
    right: -10,
  },
  quoteText: {
    fontSize: 40,
    color: "rgba(255, 255, 255, 0.3)",
    fontWeight: "900",
  },
  lineText: {
    fontSize: 20,
    color: "#FFFFFF",
    fontWeight: "700",
    lineHeight: 28,
    textAlign: "center",
    paddingHorizontal: 20,
  },
  shimmerContainer: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  shimmer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 28,
  },
  loadingContent: {
    alignItems: "center",
    gap: 16,
  },
  loadingText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  sliderSection: {
    marginBottom: 24,
  },
  sectionCard: {
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    backdropFilter: "blur(20px)",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  spiceBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: "rgba(255, 68, 68, 0.1)",
  },
  spiceBadgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  sliderContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sliderLabelContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  sliderLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  sliderTrack: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    position: "relative",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  sliderFill: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: "#E3222B",
    borderRadius: 22,
  },
  sliderDot: {
    position: "absolute",
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  sliderDotActive: {
    shadowColor: "#E3222B",
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  newSliderContainer: {
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 20,
  },
  sliderWithIcons: {
    width: "100%",
    position: "relative",
    paddingHorizontal: 16,
  },
  fireIconsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    paddingHorizontal: 0,
    marginBottom: 12,
  },
  fireIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  fireIconBackground: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  fireIconLeft: {
    position: "absolute",
    left: -28,
    top: "50%",
    marginTop: -18,
    zIndex: 2,
  },
  fireIconCenter: {
    position: "absolute",
    left: "50%",
    marginLeft: -4,
    top: "50%",
    marginTop: -18,
    zIndex: 2,
  },
  fireIconRight: {
    position: "absolute",
    right: -28,
    top: "50%",
    marginTop: -18,
    zIndex: 2,
  },
  newSliderTrack: {
    width: "100%",
    height: 10,
    borderRadius: 5,
    position: "relative",
    justifyContent: "center",
  },
  newSliderFill: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: "#E3222B",
    borderRadius: 5,
  },
  sliderThumb: {
    position: "absolute",
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 3,
    borderColor: "#E3222B",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    top: "50%",
    marginTop: -12,
  },
  sliderLabelsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    paddingHorizontal: 16,
    marginTop: 12,
  },
  sliderLabelText: {
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  toneSection: {
    marginBottom: 24,
  },
  toneGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 12,
  },
  toneChipWrapper: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  toneChip: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 18,
    borderWidth: 1,
  },
  toneChipText: {
    fontSize: 14,
    fontWeight: "600",
  },
  toneChipTextActive: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  contextSection: {
    marginBottom: 32,
  },
  inputWrapper: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    marginTop: 12,
  },
  contextInput: {
    padding: 20,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: "top",
  },
  actionButtons: {
    gap: 20,
  },
  primaryButtonWrapper: {
    shadowColor: "#E3222B",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingVertical: 18,
    borderRadius: 18,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
  },
  secondaryButtons: {
    flexDirection: "row",
    gap: 16,
    justifyContent: "center",
  },
  iconButtonWrapper: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  iconButton: {
    width: 56,
    height: 56,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
    textAlign: "center",
    marginTop: 12,
    fontStyle: "italic",
  },
  kav: {
    flex: 1,
  },
});