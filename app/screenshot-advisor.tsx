import React, { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Animated,
  ActivityIndicator,
  Platform,
  Alert,
  StatusBar,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  Upload,
  Copy,
  Save,
  Shield,
  Zap,
  Flame,
  Camera,
  Sparkles,
} from "lucide-react-native";
import { useTheme } from "@/providers/ThemeProvider";
import { useAppState } from "@/providers/AppStateProvider";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import { generatePickupFromScreenshot } from "@/services/openai";

interface ReplyTab {
  type: "Safe" | "Witty" | "Bold";
  icon: any;
  color: string;
}

export default function ScreenshotAdvisorScreen() {
  const router = useRouter();
  const { theme, isDark } = useTheme();
  const { addFavorite } = useAppState();
  
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [pickupLine, setPickupLine] = useState<string>('');
  const [selectedReply, setSelectedReply] = useState<number>(0);
  const [lastBase64, setLastBase64] = useState<string | null>(null);
  
  const scanAnimation = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const pickImage = async (): Promise<void> => {
    console.log('[ScreenshotAdvisor] pickImage start');
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
      const b64 = result.assets[0].base64 ?? null;
      setLastBase64(b64);
      if (b64) {
        console.log('[ScreenshotAdvisor] image selected, generating line for Safe mode');
        analyzeImage(b64, "Safe");
      }
    }
  };

  const analyzeImage = async (
    base64: string,
    mode: "Safe" | "Witty" | "Bold",
  ) => {
    console.log('[ScreenshotAdvisor] generatePickupFromScreenshot', { mode });
    setAnalyzing(true);
    setPickupLine('');
    
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanAnimation, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(scanAnimation, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    ).start();

    try {
      const line = await generatePickupFromScreenshot(base64, mode);
      setPickupLine(line);
      const targetIndex = mode === 'Safe' ? 0 : mode === 'Witty' ? 1 : 2;
      setSelectedReply(targetIndex);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    } catch (err) {
      console.log('[ScreenshotAdvisor] analyzeImage error', err);
      Alert.alert("Error", "Couldn't analyze screenshot. Try cropping or using a clearer image.");
    } finally {
      setAnalyzing(false);
      scanAnimation.stopAnimation();
    }
  };

  const handleCopy = async (text: string) => {
    await Clipboard.setStringAsync(text);
    if (Platform.OS !== "web") {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    Alert.alert("Copied!", "Reply copied to clipboard");
  };

  const handleSave = async (mode: "Safe" | "Witty" | "Bold") => {
    addFavorite({
      id: Date.now().toString(),
      type: "reply",
      content: pickupLine,
      metadata: {
        type: mode,
      },
    });
    
    if (Platform.OS !== "web") {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    Alert.alert("Saved!", "Reply saved to favorites");
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
                translateY: scanAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -10],
                }),
              },
            ],
          },
        ]}
      >
        <LinearGradient
          colors={['rgba(227, 34, 43, 0.1)', 'rgba(255, 122, 89, 0.05)']}
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
            <Text style={[styles.headerTitle, { color: theme.text }]}>Screenshot Advisor</Text>
            <View style={styles.headerSubtitle}>
              <Camera size={14} color={theme.primary} />
              <Text style={[styles.headerSubtitleText, { color: theme.primary }]}>AI Analysis</Text>
            </View>
          </View>
          <TouchableOpacity 
            style={[styles.headerAction, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}
          >
            <Sparkles size={20} color={theme.text} />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {!selectedImage ? (
            <TouchableOpacity
              testID="upload-screenshot"
              onPress={pickImage}
              style={[styles.uploadArea, { backgroundColor: theme.card }]}
            >
              <LinearGradient
                colors={["#E3222B", "#FF7A59"]}
                style={styles.uploadIconContainer}
              >
                <Upload size={32} color="#FFFFFF" />
              </LinearGradient>
              <Text style={[styles.uploadTitle, { color: theme.text }]}>
                Upload Screenshot
              </Text>
              <Text style={[styles.uploadDescription, { color: theme.textSecondary }]}>
                Get AI-powered reply suggestions
              </Text>
            </TouchableOpacity>
          ) : (
            <>
              <View style={styles.imageContainer}>
                <Image source={{ uri: selectedImage }} style={styles.screenshot} />
                {analyzing && (
                  <Animated.View
                    testID="scan-line"
                    style={[
                      styles.scanLine,
                      {
                        transform: [
                          {
                            translateY: scanAnimation.interpolate({
                              inputRange: [0, 1],
                              outputRange: [0, 300],
                            }),
                          },
                        ],
                      },
                    ]}
                  />
                )}
                <TouchableOpacity
                  testID="change-image"
                  onPress={pickImage}
                  style={[styles.changeButton, { backgroundColor: theme.card }]}
                >
                  <Text style={[styles.changeButtonText, { color: theme.text }]}>
                    Change Image
                  </Text>
                </TouchableOpacity>
              </View>

              {analyzing && (
                <View style={styles.analyzingContainer}>
                  <ActivityIndicator size="large" color={theme.primary} />
                  <Text style={[styles.analyzingText, { color: theme.text }]}>
                    Analyzing conversation...
                  </Text>
                </View>
              )}

              {!!pickupLine && (
                <Animated.View style={{ opacity: fadeAnim }}>
                  <View style={styles.repliesHeader}>
                    <Text style={[styles.repliesTitle, { color: theme.text }]}>
                      Suggested Replies
                    </Text>
                    <View style={styles.replyTabs}>
                      {[
                        { type: 'Safe', icon: Shield, color: '#10B981' },
                        { type: 'Witty', icon: Zap, color: '#F59E0B' },
                        { type: 'Bold', icon: Flame, color: '#EF4444' },
                      ].map((reply, index) => (
                        <TouchableOpacity
                          testID={`reply-tab-${reply.type.toLowerCase()}`}
                          key={reply.type}
                          onPress={async () => {
                            setSelectedReply(index);
                            if (lastBase64 && !analyzing) {
                              try {
                                await analyzeImage(lastBase64, reply.type as 'Safe' | 'Witty' | 'Bold');
                              } catch {}
                            }
                          }}
                          style={[
                            styles.replyTab,
                            {
                              backgroundColor:
                                selectedReply === index ? reply.color : theme.card,
                            },
                          ]}
                        >
                          <reply.icon
                            size={16}
                            color={selectedReply === index ? "#FFFFFF" : theme.text}
                          />
                          <Text
                            style={[
                              styles.replyTabText,
                              {
                                color:
                                  selectedReply === index ? "#FFFFFF" : theme.text,
                              },
                            ]}
                          >
                            {reply.type}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <View
                    style={[
                      styles.replyCard,
                      {
                        backgroundColor: theme.card,
                        borderColor: selectedReply === 0 ? '#10B981' : selectedReply === 1 ? '#F59E0B' : '#EF4444',
                      },
                    ]}
                  >
                    <Text style={[styles.replyText, { color: theme.text }]}>
                      {pickupLine}
                    </Text>
                    <View style={styles.rationaleContainer}>
                      <Text style={[styles.rationaleLabel, { color: theme.textSecondary }]}>
                        Tip: Tap a mode to regenerate a fresh line.
                      </Text>
                    </View>
                    <View style={styles.replyActions}>
                      <TouchableOpacity
                        testID="copy-reply"
                        onPress={() => handleCopy(pickupLine)}
                        style={[styles.actionButton, { backgroundColor: theme.background }]}
                      >
                        <Copy size={18} color={theme.text} />
                        <Text style={[styles.actionButtonText, { color: theme.text }]}>
                          Copy
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        testID="save-reply"
                        onPress={() => handleSave((['Safe','Witty','Bold'][selectedReply] as 'Safe'|'Witty'|'Bold'))}
                        style={[styles.actionButton, { backgroundColor: theme.background }]}
                      >
                        <Save size={18} color={theme.text} />
                        <Text style={[styles.actionButtonText, { color: theme.text }]}>
                          Save
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </Animated.View>
              )}
            </>
          )}
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
    height: Dimensions.get("window").height,
  },
  floatingElement: {
    position: "absolute",
    borderRadius: 100,
  },
  floatingElement1: {
    width: 160,
    height: 160,
    top: 120,
    right: -30,
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
  uploadArea: {
    borderRadius: 24,
    padding: 40,
    alignItems: "center",
    marginTop: 40,
  },
  uploadIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  uploadTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 8,
  },
  uploadDescription: {
    fontSize: 14,
    textAlign: "center",
  },
  imageContainer: {
    position: "relative",
    marginBottom: 24,
  },
  screenshot: {
    width: "100%",
    height: 300,
    borderRadius: 14,
    resizeMode: "cover",
  },
  scanLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: "#E3222B",
    shadowColor: "#E3222B",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
  },
  changeButton: {
    position: "absolute",
    bottom: 10,
    right: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  changeButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  analyzingContainer: {
    alignItems: "center",
    paddingVertical: 40,
  },
  analyzingText: {
    marginTop: 16,
    fontSize: 16,
  },
  repliesHeader: {
    marginBottom: 20,
  },
  repliesTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 16,
  },
  replyTabs: {
    flexDirection: "row",
    gap: 12,
  },
  replyTab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  replyTabText: {
    fontSize: 14,
    fontWeight: "600",
  },
  replyCard: {
    borderRadius: 14,
    padding: 20,
    borderWidth: 2,
  },
  replyText: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 16,
  },
  rationaleContainer: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(0, 0, 0, 0.1)",
  },
  rationaleLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 4,
  },
  rationaleText: {
    fontSize: 14,
    lineHeight: 20,
  },
  replyActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
});