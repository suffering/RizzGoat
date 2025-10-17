import { createTRPCReact } from "@trpc/react-query";
import { httpLink } from "@trpc/client";
import type { AppRouter } from "@/backend/trpc/app-router";
import superjson from "superjson";
import { Platform } from "react-native";
import Constants from "expo-constants";

export const trpc = createTRPCReact<AppRouter>();

const sanitize = (url: string) => url.replace(/\/$/, "");

const readExtra = (): Record<string, string | undefined> => {
  const extra = (Constants?.expoConfig as any)?.extra ?? (Constants?.manifest as any)?.extra ?? {};
  return extra as Record<string, string | undefined>;
};

const getBaseUrl = () => {
  const extra = readExtra();
  const candidates = [
    process.env.EXPO_PUBLIC_API_URL,
    extra?.EXPO_PUBLIC_API_URL,
    process.env.EXPO_PUBLIC_API_BASE_URL,
    extra?.EXPO_PUBLIC_API_BASE_URL,
    process.env.EXPO_PUBLIC_RORK_API_BASE_URL,
    extra?.EXPO_PUBLIC_RORK_API_BASE_URL,
    process.env.EXPO_PUBLIC_VERCEL_URL ? `https://${process.env.EXPO_PUBLIC_VERCEL_URL}` : undefined,
  ].filter((v): v is string => typeof v === "string" && v.length > 0);

  if (candidates.length > 0) return sanitize(candidates[0]!);

  if (Platform.OS === "web" && typeof window !== "undefined") {
    return sanitize(window.location.origin);
  }

  return "http://localhost:8787";
};

const BASE_ORIGIN = getBaseUrl();
const BASE_URL = `${BASE_ORIGIN}/api/trpc`;
console.log("[tRPC] Using base URL:", BASE_URL);

export const trpcClient = trpc.createClient({
  links: [
    httpLink({
      url: BASE_URL,
      transformer: superjson,
      fetch(url, options) {
        console.log('[tRPC] Request:', url);
        return fetch(url, {
          ...options,
          headers: {
            ...options?.headers,
            'Content-Type': 'application/json',
          },
        }).then(async res => {
          console.log('[tRPC] Response status:', res.status);
          const contentType = res.headers.get('content-type') ?? '';
          if (!res.ok) {
            const text = await res.text();
            if (contentType.includes('text/html') || text.startsWith('<!DOCTYPE')) {
              console.error('[tRPC] Received HTML instead of JSON. This usually means the API base URL is incorrect or not deployed. Computed base origin:', BASE_ORIGIN);
            }
            console.error('[tRPC] Error response body:', text);
            throw new Error(`HTTP ${res.status}: ${text}`);
          }
          return res;
        });
      },
    }),
  ],
});
