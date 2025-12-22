import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Share,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { Check, Copy, Crown, RefreshCw, Share2, Users, X } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Clipboard from "expo-clipboard";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "@/providers/ThemeProvider";
import { useRevenueCat } from "@/providers/RevenueCatProvider";

type ReferralCodeResponse = {
  referralCode?: string;
  code?: string;
};

type ReferralStatusResponse = {
  referralCount?: number;
  count?: number;
  successfulInstalls?: number;
  installs?: number;
  goal?: number;
  target?: number;
  rewardUnlocked?: boolean;
  proUnlocked?: boolean;
};

function normalizeBaseUrl(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  if (!/^https?:\/\//i.test(trimmed)) return null;
  return trimmed.replace(/\/+$/, "");
}

function parseReferralCode(data: unknown): string | null {
  const d = data as ReferralCodeResponse | null;
  const code = d?.referralCode ?? d?.code ?? null;
  return typeof code === "string" && code.trim().length > 0 ? code.trim() : null;
}

function parseStatus(data: unknown): { count: number; goal: number; unlocked: boolean } {
  const d = data as ReferralStatusResponse | null;
  const rawCount = d?.successfulInstalls ?? d?.referralCount ?? d?.count ?? d?.installs ?? 0;
  const rawGoal = d?.goal ?? d?.target ?? 5;

  const count = Number.isFinite(Number(rawCount)) ? Math.max(0, Number(rawCount)) : 0;
  const goal = Number.isFinite(Number(rawGoal)) ? Math.max(1, Number(rawGoal)) : 5;

  const unlockedFromBackend = d?.rewardUnlocked ?? d?.proUnlocked;
  const unlocked = Boolean(unlockedFromBackend) || count >= goal;

  return { count, goal, unlocked };
}

async function fetchJson(url: string): Promise<unknown> {
  console.log("[Referral] fetch", url);
  const res = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }

  if (!res.ok) {
    console.log("[Referral] fetch error", {
      url,
      status: res.status,
      body: json,
    });
    throw new Error("Referral request failed");
  }

  return json;
}

export default function ReferralScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const revenueCat = useRevenueCat();

  const baseUrl = useMemo<string | null>(() => {
    const envValue = (process.env as any)?.REFERRAL_API_BASE_URL as string | undefined;
    return normalizeBaseUrl(envValue);
  }, []);

  const codeQuery = useQuery({
    queryKey: ["referral", "code", baseUrl],
    enabled: Boolean(baseUrl),
    queryFn: async () => {
      if (!baseUrl) throw new Error("Missing referral base URL");
      return fetchJson(`${baseUrl}/referral/code`);
    },
    staleTime: 1000 * 60 * 5,
  });

  const statusQuery = useQuery({
    queryKey: ["referral", "status", baseUrl],
    enabled: Boolean(baseUrl),
    queryFn: async () => {
      if (!baseUrl) throw new Error("Missing referral base URL");
      return fetchJson(`${baseUrl}/referral/status`);
    },
    refetchInterval: 1000 * 20,
  });

  const codeRefetch = codeQuery.refetch;
  const statusRefetch = statusQuery.refetch;

  const referralCode = useMemo<string | null>(() => parseReferralCode(codeQuery.data), [codeQuery.data]);
  const status = useMemo(() => parseStatus(statusQuery.data), [statusQuery.data]);

  const inviteLink = useMemo<string>(() => {
    if (!referralCode) return "";
    return `https://rizzgoat.com/invite/${referralCode}`;
  }, [referralCode]);

  const progress = useMemo<number>(() => {
    if (!status.goal) return 0;
    return Math.min(1, status.count / status.goal);
  }, [status.count, status.goal]);

  const handleBackNavigation = useCallback(() => {
    if ((router as any).canGoBack && (router as any).canGoBack()) {
      router.back();
    } else {
      router.replace("/");
    }
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      console.log("[Referral] focused; refreshing status + RevenueCat");
      statusRefetch();
      revenueCat.refresh();
    }, [revenueCat, statusRefetch])
  );

  useEffect(() => {
    if (status.unlocked) {
      console.log("[Referral] unlocked per backend; refreshing RevenueCat");
      revenueCat.refresh();
    }
  }, [revenueCat, status.unlocked]);

  const progressAnim = useRef(new Animated.Value(0)).current;
  const successAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 700,
      useNativeDriver: false,
    }).start();
  }, [progress, progressAnim]);

  useEffect(() => {
    Animated.timing(successAnim, {
      toValue: status.unlocked ? 1 : 0,
      duration: status.unlocked ? 550 : 250,
      useNativeDriver: true,
    }).start();
  }, [status.unlocked, successAnim]);

  const [copiedAt, setCopiedAt] = useState<number | null>(null);
  const justCopied = useMemo(() => {
    if (!copiedAt) return false;
    return Date.now() - copiedAt < 1400;
  }, [copiedAt]);

  const handleCopyInvite = useCallback(async () => {
    if (!inviteLink) return;
    try {
      console.log("[Referral] copy invite");
      await Clipboard.setStringAsync(inviteLink);
      setCopiedAt(Date.now());
    } catch (e) {
      console.log("[Referral] Clipboard error", e);
    }
  }, [inviteLink]);

  const handleShareInvite = useCallback(async () => {
    if (!inviteLink) return;
    try {
      console.log("[Referral] share invite");
      await Share.share({
        message: `Join me on RizzGoat: ${inviteLink}`,
      });
    } catch (e) {
      console.log("[Referral] Share error", e);
    }
  }, [inviteLink]);

  const handleRefresh = useCallback(async () => {
    console.log("[Referral] manual refresh");
    await Promise.allSettled([codeRefetch(), statusRefetch(), revenueCat.refresh()]);
  }, [codeRefetch, revenueCat, statusRefetch]);

  const isLoading = codeQuery.isLoading || statusQuery.isLoading;
  const hasError = Boolean(codeQuery.error) || Boolean(statusQuery.error);

  const showSuccessState = status.unlocked && revenueCat.isEntitledToPro;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <LinearGradient
        colors={["rgba(227, 34, 43, 0.65)", "rgba(0, 0, 0, 0)"]}
        style={styles.topGlow}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.9, y: 1 }}
      />

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Referral</Text>
          <TouchableOpacity
            onPress={handleBackNavigation}
            style={[styles.headerIconButton, { backgroundColor: theme.card }]}
            testID="referral-close"
          >
            <X size={20} color={theme.text} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {!baseUrl ? (
            <View style={[styles.alertCard, { backgroundColor: theme.card }]}>
              <Text style={[styles.alertTitle, { color: theme.text }]}>Referral unavailable</Text>
              <Text style={[styles.alertBody, { color: theme.textSecondary }]}>
                Referral is not configured for this build.
              </Text>
            </View>
          ) : (
            <>
              <View style={[styles.heroCard, { backgroundColor: theme.card }]} testID="referral-hero">
                <View style={styles.heroTopRow}>
                  <View style={[styles.heroIcon, { backgroundColor: "rgba(227, 34, 43, 0.14)" }]}>
                    <Users size={20} color="#E3222B" />
                  </View>
                  <TouchableOpacity
                    onPress={handleRefresh}
                    style={[styles.headerIconButton, { backgroundColor: theme.background }]}
                    testID="referral-refresh"
                  >
                    <RefreshCw size={18} color={theme.textSecondary} />
                  </TouchableOpacity>
                </View>

                <Text style={[styles.heroTitle, { color: theme.text }]}>
                  Invite 5 friends to unlock Pro for life
                </Text>
                <Text style={[styles.heroSubtitle, { color: theme.textSecondary }]}>
                  Your link tracks installs automatically.
                </Text>

                <View style={[styles.progressCard, { backgroundColor: theme.background }]}>
                  <View style={styles.progressHeader}>
                    <Text style={[styles.progressLabel, { color: theme.textSecondary }]}>Progress</Text>
                    <Text style={[styles.progressValue, { color: theme.text }]} testID="referral-progress-text">
                      {Math.min(status.count, status.goal)} / {status.goal}
                    </Text>
                  </View>

                  <View style={styles.progressBar} testID="referral-progress-bar">
                    <View style={styles.progressTrack} />
                    <Animated.View
                      style={[
                        styles.progressFill,
                        {
                          width: progressAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: ["0%", "100%"],
                          }),
                        },
                      ]}
                    />
                  </View>

                  <Text style={[styles.progressHint, { color: theme.textSecondary }]}>
                    {status.unlocked ? "Reward unlocked" : `${Math.max(0, status.goal - status.count)} more to go`}
                  </Text>
                </View>

                <Animated.View
                  style={[
                    styles.successRow,
                    {
                      opacity: successAnim,
                      transform: [
                        {
                          translateY: successAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [10, 0],
                          }),
                        },
                        {
                          scale: successAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.98, 1],
                          }),
                        },
                      ],
                    },
                  ]}
                  pointerEvents={status.unlocked ? "auto" : "none"}
                >
                  <View style={styles.successChip} testID="referral-unlocked-chip">
                    <Check size={16} color="#0B0B0B" />
                    <Text style={styles.successChipText}>
                      {showSuccessState ? "Pro for life unlocked" : "Unlocked — syncing Pro"}
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={() => router.push("/pro" as any)}
                    style={[styles.proButton, { backgroundColor: theme.background }]}
                    testID="referral-view-pro"
                  >
                    <Crown size={16} color="#E3222B" />
                    <Text style={[styles.proButtonText, { color: theme.text }]}>View Pro</Text>
                  </TouchableOpacity>
                </Animated.View>
              </View>

              <View style={[styles.linkCard, { backgroundColor: theme.card }]} testID="referral-link-card">
                <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Your invite link</Text>

                <View style={[styles.linkBox, { backgroundColor: theme.background }]}>
                  {isLoading ? (
                    <View style={styles.linkLoadingRow}>
                      <ActivityIndicator color={theme.textSecondary} />
                      <Text style={[styles.linkLoadingText, { color: theme.textSecondary }]}>Loading…</Text>
                    </View>
                  ) : referralCode ? (
                    <Text style={[styles.linkText, { color: theme.text }]} selectable>
                      {inviteLink}
                    </Text>
                  ) : (
                    <Text style={[styles.linkText, { color: theme.textSecondary }]}>
                      Unable to load your invite link.
                    </Text>
                  )}
                </View>

                {hasError ? (
                  <Text style={[styles.errorText, { color: "rgba(227, 34, 43, 0.95)" }]}>
                    Could not load referral details. Tap refresh.
                  </Text>
                ) : null}

                <View style={styles.actionsRow}>
                  <TouchableOpacity
                    onPress={handleCopyInvite}
                    disabled={!inviteLink}
                    style={[
                      styles.actionButton,
                      { backgroundColor: inviteLink ? theme.background : "rgba(255,255,255,0.05)" },
                    ]}
                    activeOpacity={0.85}
                    testID="referral-copy"
                  >
                    <Copy size={18} color={inviteLink ? theme.text : theme.textSecondary} />
                    <Text
                      style={[
                        styles.actionButtonText,
                        { color: inviteLink ? theme.text : theme.textSecondary },
                      ]}
                    >
                      {justCopied ? "Copied" : "Copy Invite Link"}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleShareInvite}
                    disabled={!inviteLink}
                    style={[styles.actionButtonPrimary, { opacity: inviteLink ? 1 : 0.5 }]}
                    activeOpacity={0.9}
                    testID="referral-share"
                  >
                    <Share2 size={18} color="#0B0B0B" />
                    <Text style={styles.actionButtonPrimaryText}>Share</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={[styles.noteCard, { backgroundColor: theme.card }]}>
                <Text style={[styles.noteTitle, { color: theme.text }]}>Reward</Text>
                <Text style={[styles.noteBody, { color: theme.textSecondary }]}>
                  Invite 5 friends to unlock Pro for life.
                </Text>
              </View>
            </>
          )}

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topGlow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 320,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: 0.2,
  },
  headerIconButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingBottom: 36,
  },
  heroCard: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    marginBottom: 14,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 28,
    elevation: 10,
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  heroIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: "800",
    lineHeight: 24,
    marginBottom: 6,
  },
  heroSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
  },
  progressCard: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  progressHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  progressValue: {
    fontSize: 14,
    fontWeight: "800",
  },
  progressBar: {
    height: 10,
    borderRadius: 999,
    overflow: "hidden",
    position: "relative",
    marginBottom: 10,
  },
  progressTrack: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  progressFill: {
    ...StyleSheet.absoluteFillObject,
    width: "0%",
    backgroundColor: "#E3222B",
  },
  progressHint: {
    fontSize: 13,
    lineHeight: 18,
  },
  successRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
  },
  successChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  successChipText: {
    marginLeft: 8,
    fontSize: 13,
    fontWeight: "800",
    color: "#0B0B0B",
  },
  proButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  proButtonText: {
    marginLeft: 8,
    fontSize: 13,
    fontWeight: "800",
  },
  linkCard: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  linkBox: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  linkText: {
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
  },
  linkLoadingRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  linkLoadingText: {
    marginLeft: 10,
    fontSize: 14,
    fontWeight: "600",
  },
  errorText: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: "700",
  },
  actionsRow: {
    flexDirection: "row",
    marginTop: 14,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    marginRight: 10,
  },
  actionButtonText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: "800",
  },
  actionButtonPrimary: {
    width: 120,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "#E3222B",
  },
  actionButtonPrimaryText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: "900",
    color: "#0B0B0B",
  },
  noteCard: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  noteTitle: {
    fontSize: 15,
    fontWeight: "900",
    marginBottom: 6,
  },
  noteBody: {
    fontSize: 13,
    lineHeight: 18,
  },
  alertCard: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 6,
  },
  alertBody: {
    fontSize: 13,
    lineHeight: 18,
  },
  bottomSpacer: {
    height: 22,
  },
});