import React, { useState, useRef, useEffect, useCallback } from "react";
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
  PanResponder,
  GestureResponderEvent,
  PanResponderGestureState,
  LayoutChangeEvent,
  KeyboardAvoidingView,
  Keyboard,
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
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import { generatePickupLine } from "@/services/openai";

const TONE_PRESETS = ["Playful", "Confident", "Wholesome", "Bold"];
const SPICE_LEVELS = ["Cute", "Cheeky", "Spicy"];

export default function PickupLinesScreen() {
  const router = useRouter();
  const { theme, isDark } = useTheme();
  const { addFavorite, favorites } = useAppState();
  
  const [currentLine, setCurrentLine] = useState<string>("Hey there! Mind if I steal a moment of your time?");
  const [loading, setLoading] = useState<boolean>(false);
  const [spiceLevel, setSpiceLevel] = useState<number>(1);
  const [selectedTone, setSelectedTone] = useState<string>("Playful");
  const [context, setContext] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState<number>(0);
  
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const bubbleScale = useRef(new Animated.Value(1)).current;
  const confettiAnim = useRef(new Animated.Value(0)).current;
  const sliderAnim = useRef(new Animated.Value(0.5)).current;
  const sliderTrackWidthRef = useRef<number>(0);
  const sliderTrackXRef = useRef<number>(0);
  const isFirstRender = useRef<boolean>(true);
  const contextDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollRef = useRef<ScrollView | null>(null);

  const generateNewLine = useCallback(async () => {
    setLoading(true);
    
    // Shimmer animation
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
        tone: selectedTone,
        spiceLevel: SPICE_LEVELS[spiceLevel],
        context,
      });
      
      const line = await generatePickupLine({
        tone: selectedTone,
        spiceLevel: SPICE_LEVELS[spiceLevel],
        context,
      });
      
      console.log('Generated line:', line);
      setCurrentLine(line);
      
      // Bubble pop animation
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
        setError('Rate limit reached. Please wait a moment and try again.');
        Alert.alert("Rate Limit", "Too many requests. Please wait a moment and try again.");
      } else if (errorMessage.includes('API key')) {
        setError('API configuration issue. Please check your setup.');
        Alert.alert("Configuration Error", "API key not configured properly.");
      } else {
        setError('Failed to generate pickup line. Please try again.');
        Alert.alert("Error", "Failed to generate pickup line. Please try again.");
      }
    } finally {
      setLoading(false);
      shimmerAnim.stopAnimation();
    }
  }, [selectedTone, spiceLevel, context, shimmerAnim, bubbleScale]);

  useEffect(() => {
    if (!currentLine || currentLine === "Hey there! Mind if I steal a moment of your time?") {
      generateNewLine();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    generateNewLine();
  }, [spiceLevel, selectedTone]);

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
  }, [context]);

  useEffect(() => {
    Animated.timing(sliderAnim, {
      toValue: spiceLevel / 2,
      duration: 300,
      useNativeDriver: false,
    }).start();
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
    Alert.alert("Copied!", "Pickup line copied to clipboard");
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
    
    // Confetti animation for first 3 saves
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
      
      {/* Background Gradient */}
      <LinearGradient
        colors={isDark ? ["#0a0a0a", "#1a1a1a", "#000000"] : ["#f8f9fa", "#ffffff", "#f1f3f4"]}
        style={styles.gradient}
        locations={[0, 0.5, 1]}
      />
      
      {/* Floating Background Elements */}
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
            onPress={() => router.back()} 
            style={[styles.backButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}
          >
            <ArrowLeft size={20} color={theme.text} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: theme.text }]}>Pickup Lines</Text>
            <View style={styles.headerSubtitle}>
              <Sparkles size={14} color={theme.primary} />
              <Text style={[styles.headerSubtitleText, { color: theme.primary }]}>AI Generated</Text>
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
                    <Text style={styles.loadingText}>Crafting the perfect line...</Text>
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
                  Spice Level
                </Text>
                <View style={styles.spiceBadge}>
                  <Flame size={14} color="#FF4444" />
                  <Text style={[styles.spiceBadgeText, { color: '#FF4444' }]}>
                    {SPICE_LEVELS[spiceLevel]}
                  </Text>
                </View>
              </View>
              
              <View style={styles.sliderContainer} testID="spice-slider-container">
                <Text style={[styles.sliderLabel, { color: theme.textSecondary }]}>
                  Cute
                </Text>
                <View
                  style={[styles.sliderTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}
                  onLayout={(e: LayoutChangeEvent) => {
                    const { x, width } = e.nativeEvent.layout;
                    sliderTrackXRef.current = x;
                    sliderTrackWidthRef.current = width;
                  }}
                  {...useRef(
                    PanResponder.create({
                      onMoveShouldSetPanResponder: (_evt: GestureResponderEvent, gestureState: PanResponderGestureState) => Math.abs(gestureState.dx) > 5,
                      onStartShouldSetPanResponder: () => true,
                      onPanResponderGrant: (evt: GestureResponderEvent) => {
                        const pageX = (evt.nativeEvent as any).pageX ?? 0;
                        const localX = Math.max(0, Math.min((pageX - sliderTrackXRef.current), sliderTrackWidthRef.current));
                        const ratio = sliderTrackWidthRef.current > 0 ? localX / sliderTrackWidthRef.current : 0;
                        sliderAnim.setValue(ratio);
                      },
                      onPanResponderMove: (_evt: GestureResponderEvent, gestureState: PanResponderGestureState) => {
                        const dx = gestureState.moveX - sliderTrackXRef.current;
                        const clamped = Math.max(0, Math.min(dx, sliderTrackWidthRef.current));
                        const ratio = sliderTrackWidthRef.current > 0 ? clamped / sliderTrackWidthRef.current : 0;
                        sliderAnim.setValue(ratio);
                      },
                      onPanResponderRelease: (_evt: GestureResponderEvent, gestureState: PanResponderGestureState) => {
                        const dx = gestureState.moveX - sliderTrackXRef.current;
                        const clamped = Math.max(0, Math.min(dx, sliderTrackWidthRef.current));
                        const ratio = sliderTrackWidthRef.current > 0 ? clamped / sliderTrackWidthRef.current : 0;
                        let level = 0;
                        if (ratio >= 0.66) level = 2; else if (ratio >= 0.33) level = 1; else level = 0;
                        setSpiceLevel(level);
                      },
                    })
                  ).current}
                >
                  <Animated.View
                    style={[
                      styles.sliderFill,
                      {
                        width: sliderAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: ["0%", "100%"],
                        }),
                      },
                    ]}
                  />
                  {[0, 1, 2].map((level) => (
                    <TouchableOpacity
                      key={level}
                      onPress={() => setSpiceLevel(level)}
                      style={[
                        styles.sliderDot,
                        { left: `${level * 50}%` },
                        spiceLevel === level && styles.sliderDotActive,
                        { backgroundColor: spiceLevel === level ? '#E3222B' : (isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)') }
                      ]}
                      activeOpacity={0.7}
                      testID={`spice-dot-${level}`}
                    >
                      <Flame
                        size={16}
                        color={spiceLevel === level ? "#FFFFFF" : theme.textSecondary}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={[styles.sliderLabel, { color: theme.textSecondary }]}>
                  Spicy
                </Text>
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
                Choose Your Vibe
              </Text>
              <View style={styles.toneGrid}>
                {TONE_PRESETS.map((tone) => (
                  <TouchableOpacity
                    key={tone}
                    onPress={() => setSelectedTone(tone)}
                    style={styles.toneChipWrapper}
                    testID={`tone-${tone}`}
                  >
                    {selectedTone === tone ? (
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
                Add Context (Optional)
              </Text>
              <View style={[styles.inputWrapper, { 
                backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'
              }]} testID="context-input-wrapper">
                <TextInput
                  style={[styles.contextInput, { color: theme.text }]}
                  placeholder="e.g., loves travel, dog person, works in tech..."
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
                  {loading ? 'Generating...' : 'Generate New Line'}
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
    gap: 24,
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
    transform: [{ translateX: -18 }],
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