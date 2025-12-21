import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
  Alert,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  X,
  Users,
  Star,
  Crown,
  Shield,
  FileText,
} from "lucide-react-native";
import { useTheme } from "@/providers/ThemeProvider";
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

  const handleRateUs = React.useCallback(async () => {
    const appStoreUrl = "https://apps.apple.com/app/id0000000000";
    const playStoreUrl = "https://play.google.com/store/apps/details?id=com.rizzgoat.app";
    const webUrl = "https://rizzgoat.app";
    const storeUrl = Platform.select({
      ios: appStoreUrl,
      android: playStoreUrl,
      default: webUrl,
    }) ?? webUrl;
    console.log("[Settings] Rate Us pressed", { storeUrl });
    try {
      const supported = await Linking.canOpenURL(storeUrl);
      if (!supported) {
        console.log("[Settings] Rate Us unsupported URL", { storeUrl });
        Alert.alert("Rate Us", "Unable to open the store page right now.");
        return;
      }
      await Linking.openURL(storeUrl);
    } catch (error) {
      console.log("[Settings] Rate Us error", error);
      Alert.alert("Rate Us", "Something went wrong. Please try again later.");
    }
  }, []);

  const settingsSections: { title: string; items: SettingItem[] }[] = [

    {
      title: "Premium",
      items: [
        {
          icon: Crown,
          title: "Upgrade to Pro",
          subtitle: "Unlock advanced features",
          action: () => router.push("/pro" as any),
          showArrow: true,
          highlight: true,
        },
        {
          icon: Users,
          title: "Refer a Friend",
          subtitle: "Get Pro features for free",
          action: () => router.push("/referral"),
          showArrow: true,
        },
      ],
    },
    {
      title: "Community",
      items: [
        {
          icon: Star,
          title: "Rate Us",
          action: handleRateUs,
          showArrow: true,
        },
      ],
    },
    {
      title: "Legal",
      items: [
        {
          icon: Shield,
          title: "Privacy Policy",
          action: () => Linking.openURL("https://rizzgoat.com/privacypolicy"),
          showArrow: true,
        },
        {
          icon: FileText,
          title: "Terms of Service",
          action: () => Linking.openURL("https://rizzgoat.com/tos"),
          showArrow: true,
        },
      ],
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Settings</Text>
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
});