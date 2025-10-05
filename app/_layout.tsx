import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { AppStateProvider } from "@/providers/AppStateProvider";
import { SafeAreaProvider } from "react-native-safe-area-context";

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

  return (
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
  );
}