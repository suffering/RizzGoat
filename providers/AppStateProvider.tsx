import { useState, useEffect, useMemo } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import createContextHook from "@nkzw/create-context-hook";

import { PlanProductId, useRevenueCat } from "../providers/RevenueCatProvider";

interface Favorite {
  id: string;
  type: "pickup-line" | "reply";
  content: string;
  metadata?: any;
  createdAt?: string;
}

interface UserProfile {
  sex: "male" | "female" | "other";
  ageRange: "18-24" | "25-34" | "35-44" | "45+";
  completedOnboarding: boolean;
}

type Plan = PlanProductId | null;

const YEARLY_MATCHERS = ["year", "annual", "12month", "rc_annual"] as const;
const LIFETIME_MATCHERS = ["lifetime", "rizzgoat.lifetime", "payonce"] as const;

const derivePlanFromSubscriptions = (s?: string[] | null): Plan => {
  if (!s || !s.length) return null;

  const v = s.map((x) => x.toLowerCase());
  if (v.some((x) => x.includes("weekly"))) return "weekly";
  if (v.some((x) => x.includes("monthly"))) return "monthly";
  if (v.some((x) => YEARLY_MATCHERS.some((matcher) => x.includes(matcher))))
    return "yearly";
  if (v.some((x) => LIFETIME_MATCHERS.some((matcher) => x.includes(matcher))))
    return "lifetime";

  return null;
};

export const [AppStateProvider, useAppState] = createContextHook(() => {
  const { isEntitledToPro, purchasePlan, customerInfo } = useRevenueCat();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [referralCount, setReferralCount] = useState(0);
  const [trialEndsAt, setTrialEndsAt] = useState<string | null>(null);
  const [plan, setPlan] = useState<Plan>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(true);

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!customerInfo?.activeSubscriptions?.length) return;
    const found = derivePlanFromSubscriptions(customerInfo.activeSubscriptions);
    if (found && found !== plan) {
      setPlan(found);
      AsyncStorage.setItem("plan", found).catch(() => {});
    }
  }, [customerInfo, plan]);

  const load = async () => {
    try {
      const [favs, refs, profile, trial, savedPlan] = await Promise.all([
        AsyncStorage.getItem("favorites"),
        AsyncStorage.getItem("referralCount"),
        AsyncStorage.getItem("userProfile"),
        AsyncStorage.getItem("trialEndsAt"),
        AsyncStorage.getItem("plan"),
      ]);

      if (favs) setFavorites(JSON.parse(favs));
      if (refs) setReferralCount(parseInt(refs, 10) || 0);
      if (trial) setTrialEndsAt(trial);
      if (savedPlan) setPlan(savedPlan as Plan);

      if (profile) {
        const p = JSON.parse(profile);
        setUserProfile(p);
        setShowOnboarding(!p.completedOnboarding);
      }
    } catch {}
  };

  const isTrialActive = useMemo(() => {
    if (!trialEndsAt) return false;
    return Date.now() < new Date(trialEndsAt).getTime();
  }, [trialEndsAt]);

  const referralUnlock = referralCount >= 5;

  const isPro = useMemo(() => {
    return isEntitledToPro || isTrialActive || referralUnlock;
  }, [isEntitledToPro, isTrialActive, referralUnlock]);

  const startFreeTrial = async (days: number) => {
    const ends = new Date(Date.now() + days * 86400000).toISOString();
    setTrialEndsAt(ends);
    await AsyncStorage.setItem("trialEndsAt", ends);
  };

  const subscribe = async (newPlan: PlanProductId) => {
    await purchasePlan(newPlan);
    setPlan(newPlan);
    await AsyncStorage.setItem("plan", newPlan);
  };

  const completeOnboarding = async (
    p: Omit<UserProfile, "completedOnboarding">
  ) => {
    const obj = { ...p, completedOnboarding: true };
    setUserProfile(obj);
    setShowOnboarding(false);
    await AsyncStorage.setItem("userProfile", JSON.stringify(obj));
  };

  const addFavorite = async (f: Favorite) => {
    const nf = { ...f, createdAt: new Date().toISOString() };
    const updated = [...favorites, nf];
    setFavorites(updated);
    await AsyncStorage.setItem("favorites", JSON.stringify(updated));
  };

  const removeFavorite = async (id: string) => {
    const updated = favorites.filter((f) => f.id !== id);
    setFavorites(updated);
    await AsyncStorage.setItem("favorites", JSON.stringify(updated));
  };

  const incrementReferral = async () => {
    const n = referralCount + 1;
    setReferralCount(n);
    await AsyncStorage.setItem("referralCount", n.toString());
  };

  const resetOnboarding = async () => {
    setShowOnboarding(true);
    setUserProfile(null);
    await AsyncStorage.removeItem("userProfile");
  };

  return {
    favorites,
    addFavorite,
    removeFavorite,
    referralCount,
    incrementReferral,
    isPro,
    isTrialActive,
    trialEndsAt,
    plan,
    startFreeTrial,
    subscribe,
    userProfile,
    showOnboarding,
    completeOnboarding,
    resetOnboarding,
  };
});

