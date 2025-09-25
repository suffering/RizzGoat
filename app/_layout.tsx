import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { AppStateProvider } from "@/providers/AppStateProvider";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { trpc, trpcClient } from "@/lib/trpc";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ 
      headerBackTitle: "Back",
      headerShown: false,
      animation: "slide_from_right"
    }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="pickup-lines" />
      <Stack.Screen name="screenshot-advisor" />
      <Stack.Screen name="chat" />
      <Stack.Screen name="settings" options={{ 
        presentation: "modal",
        animation: "slide_from_bottom"
      }} />
      <Stack.Screen name="referral" options={{ 
        presentation: "modal",
        animation: "slide_from_bottom"
      }} />
      <Stack.Screen name="pro" options={{ 
        presentation: "modal",
        animation: "none",
        gestureEnabled: false
      }} />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    setTimeout(() => {
      SplashScreen.hideAsync();
    }, 1500);
  }, []);

  useEffect(() => {
    const base = process.env.EXPO_PUBLIC_RORK_API_BASE_URL;
    const pubSupabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL_V2 ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
    const pubSupabaseAnon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY_V2 ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    console.log('[ENV][Client] EXPO_PUBLIC_SUPABASE_URL (effective):', Boolean(pubSupabaseUrl) ? 'set' : 'unset');
    console.log('[ENV][Client] EXPO_PUBLIC_SUPABASE_ANON_KEY (effective):', Boolean(pubSupabaseAnon) ? 'set' : 'unset');
    if (base) {
      fetch(`${base}/api/env-check`).then(async (r) => {
        try {
          const j = await r.json();
          console.log('[ENV][Server]/env-check:', j);
        } catch (e) {
          console.log('[ENV][Server]/env-check parse error');
        }
      }).catch((e) => console.log('[ENV][Server]/env-check fetch error'));
    } else {
      console.log('[ENV] EXPO_PUBLIC_RORK_API_BASE_URL is not set');
    }
  }, []);

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <ThemeProvider>
              <AppStateProvider>
                <RootLayoutNav />
              </AppStateProvider>
            </ThemeProvider>
          </GestureHandlerRootView>
        </SafeAreaProvider>
      </QueryClientProvider>
    </trpc.Provider>
  );
}