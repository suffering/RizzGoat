import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
  Platform,
  Modal,
  Share,
} from "react-native";
import * as StoreReview from "expo-store-review";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  X,
  Star,
  Crown,
  Shield,
  FileText,
  Globe,
  Check,
  Mail,
  Share2,
} from "lucide-react-native";
import { useTheme } from "@/providers/ThemeProvider";
import { useLanguage, SUPPORTED_LANGUAGES, SupportedLanguage } from "@/providers/LanguageProvider";
import { LinearGradient } from "expo-linear-gradient";

interface SettingItem {
  icon: any;
  title: string;
  subtitle?: string;
  action: () => void;
  showArrow?: boolean;
  showSwitch?: boolean;
  switchValue?: boolean;
  highlight?: boolean;
}

export default function SettingsScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { currentLanguage, changeLanguage, t } = useLanguage();
  const [showLanguageModal, setShowLanguageModal] = useState(false);

  const handleRateUs = React.useCallback(async () => {
    console.log("[Settings] Rate Us pressed", { platform: Platform.OS });

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
      console.log("[Settings] Rate Us requestReview error (ignored)", error);
    }
  }, []);

  const handleEmailUs = React.useCallback(() => {
    console.log("[Settings] Email Us pressed");
    Linking.openURL("mailto:support@rizzgoat.com");
  }, []);

  const handleShareApp = React.useCallback(async () => {
    console.log("[Settings] Share App pressed");
    try {
      await Share.share({
        message: "Check out RizzGoat - Level up your dating game with AI-powered advice! https://rizzgoat.com",
        url: "https://rizzgoat.com",
      });
    } catch (error) {
      console.log("[Settings] Share error", error);
    }
  }, []);

  const currentLangName = SUPPORTED_LANGUAGES.find(l => l.code === currentLanguage)?.nativeName || 'English';

  const settingsSections: { title: string; items: SettingItem[] }[] = [
    {
      title: String(t('settings.premium')),
      items: [
        {
          icon: Crown,
          title: String(t('settings.upgradeToPro')),
          subtitle: String(t('settings.upgradeSubtitle')),
          action: () => router.push("/pro" as any),
          showArrow: true,
          highlight: true,
        },
      ],
    },
    {
      title: String(t('settings.preferences')),
      items: [
        {
          icon: Globe,
          title: String(t('settings.language')),
          subtitle: currentLangName,
          action: () => setShowLanguageModal(true),
          showArrow: true,
        },
      ],
    },
    {
      title: String(t('settings.community')),
      items: [
        {
          icon: Star,
          title: String(t('settings.rateUs')),
          action: handleRateUs,
          showArrow: true,
        },
        {
          icon: Mail,
          title: "Email Us",
          subtitle: "support@rizzgoat.com",
          action: handleEmailUs,
          showArrow: true,
        },
        {
          icon: Share2,
          title: "Share App",
          action: handleShareApp,
          showArrow: true,
        },
      ],
    },
    {
      title: String(t('settings.legal')),
      items: [
        {
          icon: Shield,
          title: String(t('settings.privacyPolicy')),
          action: () => Linking.openURL("https://rizzgoat.com/privacypolicy"),
          showArrow: true,
        },
        {
          icon: FileText,
          title: String(t('settings.termsOfService')),
          action: () => Linking.openURL("https://rizzgoat.com/tos"),
          showArrow: true,
        },
      ],
    },
  ];

  const handleLanguageSelect = async (lang: SupportedLanguage) => {
    await changeLanguage(lang);
    setShowLanguageModal(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>{String(t('settings.title'))}</Text>
          <TouchableOpacity onPress={() => {
            if ((router as any).canGoBack && (router as any).canGoBack()) {
              router.back();
            } else {
              router.replace('/');
            }
          }} style={styles.closeButton}>
            <X size={24} color={theme.text} />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {settingsSections.map((section, sectionIndex) => (
            <View key={sectionIndex} style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
                {section.title}
              </Text>
              <View style={[styles.sectionContent, { backgroundColor: theme.card }]}>
                {section.items.map((item, itemIndex) => {
                  const sectionKey = section.title.toLowerCase().replace(/\s+/g, "-");
                  const itemKey = item.title.toLowerCase().replace(/\s+/g, "-");
                  const testID = `settings-${sectionKey}-${itemKey}`;
                  return (
                    <TouchableOpacity
                      key={itemIndex}
                      testID={testID}
                      onPress={item.action}
                      style={[
                        styles.settingItem,
                        itemIndex < section.items.length - 1 && styles.settingItemBorder,
                      ]}
                      activeOpacity={item.showSwitch ? 1 : 0.7}
                    >
                      {item.highlight ? (
                        <LinearGradient
                          colors={["#E3222B", "#FF7A59"]}
                          style={styles.iconContainer}
                        >
                          <item.icon size={20} color="#FFFFFF" />
                        </LinearGradient>
                      ) : (
                        <View
                          style={[
                            styles.iconContainer,
                            { backgroundColor: theme.background },
                          ]}
                        >
                          <item.icon size={20} color={theme.text} />
                        </View>
                      )}
                      <View style={styles.itemContent}>
                        <Text
                          style={[
                            styles.itemTitle,
                            { color: theme.text },
                            item.highlight && { fontWeight: "700" },
                          ]}
                        >
                          {item.title}
                        </Text>
                        {item.subtitle && (
                          <Text style={[styles.itemSubtitle, { color: theme.textSecondary }]}>
                            {item.subtitle}
                          </Text>
                        )}
                      </View>
                      {item.showArrow && (
                        <Text style={{ color: theme.textSecondary }}>›</Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))}

          <View style={styles.footer} />
        </ScrollView>
      </SafeAreaView>

      <Modal
        visible={showLanguageModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowLanguageModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>{String(t('settings.language'))}</Text>
              <TouchableOpacity onPress={() => setShowLanguageModal(false)} style={styles.modalCloseButton}>
                <X size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.languageList}>
              {SUPPORTED_LANGUAGES.map((lang) => (
                <TouchableOpacity
                  key={lang.code}
                  style={[styles.languageItem, currentLanguage === lang.code && { backgroundColor: theme.primary + '15' }]}
                  onPress={() => handleLanguageSelect(lang.code)}
                >
                  <View style={styles.languageInfo}>
                    <Text style={[styles.languageNative, { color: theme.text }]}>{lang.nativeName}</Text>
                    <Text style={[styles.languageName, { color: theme.textSecondary }]}>{lang.name}</Text>
                  </View>
                  {currentLanguage === lang.code && (
                    <Check size={20} color={theme.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
  },
  closeButton: {
    padding: 8,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
    marginHorizontal: 20,
  },
  sectionContent: {
    marginHorizontal: 20,
    borderRadius: 14,
    overflow: "hidden",
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  settingItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0, 0, 0, 0.05)",
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: "500",
  },
  itemSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  footer: {
    alignItems: "center",
    marginTop: 20,
  },
  version: {
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  modalCloseButton: {
    padding: 4,
  },
  languageList: {
    paddingHorizontal: 20,
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
  },
  languageInfo: {
    flex: 1,
  },
  languageNative: {
    fontSize: 16,
    fontWeight: '600',
  },
  languageName: {
    fontSize: 13,
    marginTop: 2,
  },
});