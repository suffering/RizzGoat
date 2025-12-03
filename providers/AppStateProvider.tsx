import { useState, useEffect, useMemo } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import createContextHook from "@nkzw/create-context-hook";
import { PlanProductId, useRevenueCat } from "@/providers/RevenueCatProvider";

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

const derivePlanFromSubscriptions = (subscriptions?: string[] | null): Plan => {
  if (!subscriptions || subscriptions.length === 0) {
    return null;
  }

  const normalized = subscriptions.map((s) => s.toLowerCase());

  if (normalized.some((v) => v.includes("weekly"))) {
    return "weekly";
  }

  if (normalized.some((v) => v.includes("monthly"))) {
    return "monthly";
  }

  if (
    normalized.some(
      (v) =>
        v.includes("lifetime") ||
        v.includes("rizzgoat.lifetime") ||
        v.includes("annual")
    )
  ) {
    return "lifetime";
  }

  return null;
};

export const [AppStateProvider, useAppState] = createContextHook(() => {
  const { isEntitledToPro, purchasePlan, customerInfo } = useRevenueCat();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [referralCount, setReferralCount] = useState<number>(0);
  const [trialEndsAt, setTrialEndsAt] = useState<string | null>(null);
  const [plan, setPlan] = useState<Plan>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [showOnboarding, setShowOnboarding] = useState<boolean>(true);

  useEffect(() => {
    loadAppState();
  }, []);

  useEffect(() => {
    if (!customerInfo?.activeSubscriptions?.length) {
      return;
    }
    const derived = derivePlanFromSubscriptions(customerInfo.activeSubscriptions);
    if (derived && derived !== plan) {
      setPlan(derived);
      AsyncStorage.setItem("plan", derived).catch(() => {});
    }
  }, [customerInfo, plan]);

  const loadAppState = async () => {
    try {
      const [
        savedFavorites,
        savedReferrals,
        savedProfile,
        savedTrialEndsAt,
        savedPlan,
      ] = await Promise.all([
        AsyncStorage.getItem("favorites"),
        AsyncStorage.getItem("referralCount"),
        AsyncStorage.getItem("userProfile"),
        AsyncStorage.getItem("trialEndsAt"),
        AsyncStorage.getItem("plan"),
      ]);

      if (savedFavorites) {
        setFavorites(JSON.parse(savedFavorites));
      }

      if (savedReferrals) {
        const n = parseInt(savedReferrals, 10);
        setReferralCount(Number.isNaN(n) ? 0 : n);
      }

      if (savedTrialEndsAt) {
        setTrialEndsAt(savedTrialEndsAt);
      }

      if (savedPlan) {
        setPlan(savedPlan as Plan);
      }

      if (savedProfile) {
        const profile: UserProfile = JSON.parse(savedProfile);
        setUserProfile(profile);
        setShowOnboarding(!profile.completedOnboarding);
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
    try {
      const ends = new Date(Date.now() + days * 86400000);
      const iso = ends.toISOString();
      setTrialEndsAt(iso);
      await AsyncStorage.setItem("trialEndsAt", iso);
    } catch {}
  };

  const subscribe = async (newPlan: "weekly" | "monthly" | "lifetime") => {
    try {
      await purchasePlan(newPlan);
      setPlan(newPlan);
      await AsyncStorage.setItem("plan", newPlan);
    } catch (e) {
      throw e;
    }
  };

  const completeOnboarding = async (
    profile: Omit<UserProfile, "completedOnboarding">
  ) => {
    const p: UserProfile = { ...profile, completedOnboarding: true };
    setUserProfile(p);
    setShowOnboarding(false);
    try {
      await AsyncStorage.setItem("userProfile", JSON.stringify(p));
    } catch {}
  };

  const addFavorite = async (favorite: Favorite) => {
    const newFavorite = { ...favorite, createdAt: new Date().toISOString() };
    const updated = [...favorites, newFavorite];
    setFavorites(updated);
    try {
      await AsyncStorage.setItem("favorites", JSON.stringify(updated));
    } catch {}
  };

  const removeFavorite = async (id: string) => {
    const updated = favorites.filter((f) => f.id !== id);
    setFavorites(updated);
    try {
      await AsyncStorage.setItem("favorites", JSON.stringify(updated));
    } catch {}
  };

  const incrementReferral = async () => {
    const n = referralCount + 1;
    setReferralCount(n);
    try {
      await AsyncStorage.setItem("referralCount", n.toString());
    } catch {}
  };

  const resetOnboarding = async () => {
    setShowOnboarding(true);
    setUserProfile(null);
    try {
      await AsyncStorage.removeItem("userProfile");
    } catch {}
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
