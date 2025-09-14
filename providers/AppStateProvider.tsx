import React, { useState, useEffect, useMemo } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import createContextHook from "@nkzw/create-context-hook";

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

type Plan = 'weekly' | 'monthly' | 'annual' | null;

export const [AppStateProvider, useAppState] = createContextHook(() => {
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [referralCount, setReferralCount] = useState<number>(0);

  // Subscription state
  const [proPurchased, setProPurchased] = useState<boolean>(false);
  const [trialEndsAt, setTrialEndsAt] = useState<string | null>(null);
  const [plan, setPlan] = useState<Plan>(null);

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [showOnboarding, setShowOnboarding] = useState<boolean>(true);

  useEffect(() => {
    loadAppState();
  }, []);

  const loadAppState = async () => {
    try {
      const [savedFavorites, savedReferrals, savedPro, savedProfile, savedTrialEndsAt, savedPlan] = await Promise.all([
        AsyncStorage.getItem("favorites"),
        AsyncStorage.getItem("referralCount"),
        AsyncStorage.getItem("isPro"),
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
      if (savedPro) {
        setProPurchased(savedPro === "true");
      }
      if (savedTrialEndsAt) {
        setTrialEndsAt(savedTrialEndsAt);
      }
      if (savedPlan) {
        const p = savedPlan as Plan;
        setPlan(p);
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
    if (!trialEndsAt) return false;
    const ends = new Date(trialEndsAt).getTime();
    return Date.now() < ends;
  }, [trialEndsAt]);

  const isPro = useMemo(() => {
    return proPurchased || isTrialActive || referralCount >= 5;
  }, [proPurchased, isTrialActive, referralCount]);

  const startFreeTrial = async (days: number) => {
    try {
      const ends = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
      const iso = ends.toISOString();
      setTrialEndsAt(iso);
      await AsyncStorage.setItem("trialEndsAt", iso);
      // During trial we treat as pro
    } catch (error) {
      console.log("Error starting trial:", error);
    }
  };

  const subscribe = async (newPlan: Exclude<Plan, null>) => {
    try {
      setPlan(newPlan);
      await AsyncStorage.setItem("plan", newPlan);
      setProPurchased(true);
      await AsyncStorage.setItem("isPro", "true");
    } catch (error) {
      console.log("Error subscribing:", error);
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
      if (newCount >= 5) {
        setProPurchased(true);
        await AsyncStorage.setItem("isPro", "true");
      }
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