import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ArrowLeft, Send } from "lucide-react-native";
import { useTheme } from "@/providers/ThemeProvider";
import { getChatAdvice } from "@/services/openai";

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

const STARTER_CHIPS = [
  "Openers for her travel bio",
  "How to keep conversation flowing",
  "When to ask for a date",
  "Red flags to watch for",
];

export default function ChatScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const scrollViewRef = useRef<ScrollView>(null);
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  
  const typingDots = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;

  useEffect(() => {
    if (isTyping) {
      const animations = typingDots.map((dot, index) =>
        Animated.loop(
          Animated.sequence([
            Animated.delay(index * 200),
            Animated.timing(dot, {
              toValue: 1,
              duration: 400,
              useNativeDriver: true,
            }),
            Animated.timing(dot, {
              toValue: 0,
              duration: 400,
              useNativeDriver: true,
            }),
          ])
        )
      );
      
      animations.forEach(anim => anim.start());
      
      return () => {
        animations.forEach(anim => anim.stop());
      };
    }
  }, [isTyping]);

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;
    
    const userMessage: Message = {
      id: Date.now().toString(),
      text,
      isUser: true,
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputText("");
    setIsTyping(true);
    
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
    
    try {
      const advice = await getChatAdvice({ message: text });
      
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: advice,
        isUser: false,
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: "Sorry, I couldn't process that. Please try again.",
        isUser: false,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  const handleChipPress = (text: string) => {
    sendMessage(text);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            RizzGoat Chat
          </Text>
          <View style={{ width: 44 }} />
        </View>

        <KeyboardAvoidingView
          style={styles.chatContainer}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={0}
        >
          <ScrollView
            ref={scrollViewRef}
            contentContainerStyle={styles.messagesContainer}
            showsVerticalScrollIndicator={false}
          >
            {messages.length === 0 && (
              <View style={styles.emptyState}>
                <Text style={[styles.emptyTitle, { color: theme.text }]}>
                  Ask RizzGoat Anything
                </Text>
                <Text style={[styles.emptyDescription, { color: theme.textSecondary }]}>
                  Get personalized dating advice and conversation tips
                </Text>
                <View style={styles.starterChips}>
                  {STARTER_CHIPS.map((chip) => (
                    <TouchableOpacity
                      key={chip}
                      onPress={() => handleChipPress(chip)}
                      style={[styles.chip, { backgroundColor: theme.card }]}
                    >
                      <Text style={[styles.chipText, { color: theme.text }]}>
                        {chip}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
            
            {messages.map((message) => (
              <View
                key={message.id}
                style={[
                  styles.messageRow,
                  message.isUser && styles.messageRowUser,
                ]}
              >
                <View
                  style={[
                    styles.messageBubble,
                    message.isUser
                      ? [styles.messageBubbleUser, { backgroundColor: theme.primary }]
                      : [styles.messageBubbleAI, { backgroundColor: theme.card }],
                  ]}
                >
                  <Text
                    style={[
                      styles.messageText,
                      { color: message.isUser ? "#FFFFFF" : theme.text },
                    ]}
                  >
                    {message.text}
                  </Text>
                </View>
              </View>
            ))}
            
            {isTyping && (
              <View style={styles.messageRow}>
                <View style={[styles.typingIndicator, { backgroundColor: theme.card }]}>
                  {typingDots.map((dot, index) => (
                    <Animated.View
                      key={index}
                      style={[
                        styles.typingDot,
                        {
                          backgroundColor: theme.textSecondary,
                          transform: [
                            {
                              translateY: dot.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0, -8],
                              }),
                            },
                          ],
                        },
                      ]}
                    />
                  ))}
                </View>
              </View>
            )}
          </ScrollView>

          <View style={[styles.inputContainer, { backgroundColor: theme.background }]}>
            <View style={[styles.inputWrapper, { backgroundColor: theme.card }]}>
              <TextInput
                style={[styles.input, { color: theme.text }]}
                placeholder="Type your message..."
                placeholderTextColor={theme.textSecondary}
                value={inputText}
                onChangeText={setInputText}
                multiline
                maxLength={500}
              />
              <TouchableOpacity
                onPress={() => sendMessage(inputText)}
                disabled={!inputText.trim() || isTyping}
                style={[
                  styles.sendButton,
                  { backgroundColor: inputText.trim() ? theme.primary : theme.border },
                ]}
              >
                <Send size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0, 0, 0, 0.1)",
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  chatContainer: {
    flex: 1,
  },
  messagesContainer: {
    padding: 20,
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 24,
  },
  starterChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginBottom: 8,
  },
  chipText: {
    fontSize: 14,
  },
  messageRow: {
    marginBottom: 12,
    alignItems: "flex-start",
  },
  messageRowUser: {
    alignItems: "flex-end",
  },
  messageBubble: {
    maxWidth: "80%",
    padding: 12,
    borderRadius: 18,
  },
  messageBubbleUser: {
    borderBottomRightRadius: 4,
  },
  messageBubbleAI: {
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  typingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  inputContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(0, 0, 0, 0.1)",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "flex-end",
    borderRadius: 24,
    paddingLeft: 16,
    paddingRight: 4,
    paddingVertical: 4,
  },
  input: {
    flex: 1,
    fontSize: 15,
    maxHeight: 100,
    paddingVertical: 8,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
});