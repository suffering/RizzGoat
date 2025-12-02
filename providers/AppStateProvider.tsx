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
  sex: 'male' | 'female' | 'other';
  ageRange: '18-24' | '25-34' | '35-44' | '45+';
  completedOnboarding: boolean;
}

type Plan = PlanProductId | null;

const derivePlanFromSubscriptions = (subscriptions?: string[] | null): Plan => {
  if (!subscriptions || subscriptions.length === 0) {
    return null;
  }
  const normalized = subscriptions.map((sub) => sub.toLowerCase());
  if (normalized.some((value) => value.includes("weekly"))) {
    return "weekly";
  }
  if (normalized.some((value) => value.includes("monthly"))) {
    return "monthly";
  }
  if (normalized.some((value) => value.includes("year") || value.includes("annual"))) {
    return "yearly";
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
    const derivedPlan = derivePlanFromSubscriptions(customerInfo.activeSubscriptions);
    if (derivedPlan && derivedPlan !== plan) {
      setPlan(derivedPlan);
      AsyncStorage.setItem("plan", derivedPlan).catch((error) => {
        console.log("Error persisting RevenueCat plan:", error);
      });
    }
  }, [customerInfo, plan]);

  const loadAppState = async () => {
    try {
      const [savedFavorites, savedReferrals, savedProfile, savedTrialEndsAt, savedPlan] = await Promise.all([
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
        const parsed = parseInt(savedReferrals, 10);
        setReferralCount(Number.isNaN(parsed) ? 0 : parsed);
      }
      if (savedTrialEndsAt) {
        setTrialEndsAt(savedTrialEndsAt);
      }
      if (savedPlan) {
        const parsedPlan = savedPlan as Plan;
        setPlan(parsedPlan);
      }
      if (savedProfile) {
        const profile: UserProfile = JSON.parse(savedProfile);
        setUserProfile(profile);
        setShowOnboarding(!profile.completedOnboarding);
      }
    } catch (error) {
      console.log("Error loading app state:", error);
    }
  };

  const isTrialActive = useMemo(() => {
    if (!trialEndsAt) {
      return false;
    }
    const ends = new Date(trialEndsAt).getTime();
    return Date.now() < ends;
  }, [trialEndsAt]);

  const referralUnlock = referralCount >= 5;
  const isPro = useMemo(() => {
    return isEntitledToPro || isTrialActive || referralUnlock;
  }, [isEntitledToPro, isTrialActive, referralUnlock]);

  const startFreeTrial = async (days: number) => {
    try {
      const ends = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
      const iso = ends.toISOString();
      setTrialEndsAt(iso);
      await AsyncStorage.setItem("trialEndsAt", iso);
    } catch (error) {
      console.log("Error starting trial:", error);
    }
  };

  const subscribe = async (newPlan: Exclude<Plan, null>) => {
    try {
      await purchasePlan(newPlan);
      setPlan(newPlan);
      await AsyncStorage.setItem("plan", newPlan);
    } catch (error) {
      console.log("Error subscribing:", error);
      throw error;
    }
  };

  const completeOnboarding = async (profile: Omit<UserProfile, 'completedOnboarding'>) => {
    const completeProfile: UserProfile = { ...profile, completedOnboarding: true };
    setUserProfile(completeProfile);
    setShowOnboarding(false);
    try {
      await AsyncStorage.setItem("userProfile", JSON.stringify(completeProfile));
    } catch (error) {
      console.log("Error saving user profile:", error);
    }
  };

  const addFavorite = async (favorite: Favorite) => {
    const newFavorite = { ...favorite, createdAt: new Date().toISOString() };
    const updatedFavorites = [...favorites, newFavorite];
    setFavorites(updatedFavorites);
    try {
      await AsyncStorage.setItem("favorites", JSON.stringify(updatedFavorites));
    } catch (error) {
      console.log("Error saving favorite:", error);
    }
  };

  const removeFavorite = async (id: string) => {
    const updatedFavorites = favorites.filter((f) => f.id !== id);
    setFavorites(updatedFavorites);
    try {
      await AsyncStorage.setItem("favorites", JSON.stringify(updatedFavorites));
    } catch (error) {
      console.log("Error removing favorite:", error);
    }
  };

  const incrementReferral = async () => {
    const newCount = referralCount + 1;
    setReferralCount(newCount);
    try {
      await AsyncStorage.setItem("referralCount", newCount.toString());
    } catch (error) {
      console.log("Error updating referral count:", error);
    }
  };

  const resetOnboarding = async () => {
    setShowOnboarding(true);
    setUserProfile(null);
    try {
      await AsyncStorage.removeItem("userProfile");
    } catch (error) {
      console.log("Error resetting onboarding:", error);
    }
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
