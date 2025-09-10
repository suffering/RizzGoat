import React, { useState, useEffect } from "react";
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

export const [AppStateProvider, useAppState] = createContextHook(() => {
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [referralCount, setReferralCount] = useState(0);
  const [isPro, setIsPro] = useState(false);

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(true);

  useEffect(() => {
    loadAppState();
  }, []);

  const loadAppState = async () => {
    try {
      const [savedFavorites, savedReferrals, savedPro, savedProfile] = await Promise.all([
        AsyncStorage.getItem("favorites"),
        AsyncStorage.getItem("referralCount"),
        AsyncStorage.getItem("isPro"),
        AsyncStorage.getItem("userProfile"),
      ]);

      if (savedFavorites) {
        setFavorites(JSON.parse(savedFavorites));
      }
      if (savedReferrals) {
        setReferralCount(parseInt(savedReferrals));
      }
      if (savedPro) {
        setIsPro(savedPro === "true");
      }

      if (savedProfile) {
        const profile = JSON.parse(savedProfile);
        setUserProfile(profile);
        setShowOnboarding(!profile.completedOnboarding);
      }
    } catch (error) {
      console.log("Error loading app state:", error);
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
    const updatedFavorites = favorites.filter(f => f.id !== id);
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
    
    if (newCount >= 5) {
      setIsPro(true);
      await AsyncStorage.setItem("isPro", "true");
    }
    
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

    userProfile,
    showOnboarding,
    completeOnboarding,
    resetOnboarding,
  };
});