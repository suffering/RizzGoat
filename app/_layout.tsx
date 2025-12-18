import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { AppStateProvider } from "@/providers/AppStateProvider";
import { RevenueCatProvider } from "@/src/providers/RevenueCatProvider";
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
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    setTimeout(() => {
      SplashScreen.hideAsync();
    }, 1500);
  }, []);

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <ThemeProvider>
              <RevenueCatProvider>
                <AppStateProvider>
                  <RootLayoutNav />
                </AppStateProvider>
              </RevenueCatProvider>
            </ThemeProvider>
          </GestureHandlerRootView>
        </SafeAreaProvider>
      </QueryClientProvider>
    </trpc.Provider>
  );
}