import { Hono } from "hono";
import { trpcServer } from "@hono/trpc-server";
import { cors } from "hono/cors";
import { appRouter } from "./trpc/app-router";
import { createContext } from "./trpc/create-context";

const warnShadow = (oldKey: string, newKey: string) => {
  const hasOld = typeof process.env[oldKey] === "string" && process.env[oldKey] !== undefined;
  const hasNew = typeof process.env[newKey] === "string" && process.env[newKey] !== undefined;
  if (hasOld && hasNew) {
    console.error(`[ENV] Both ${oldKey} and ${newKey} are set. Remove ${oldKey} to prevent cached shadowing.`);
  }
};

warnShadow("SUPABASE_URL", "SUPABASE_URL_V2");
warnShadow("SUPABASE_ANON_KEY", "SUPABASE_ANON_KEY_V2");
warnShadow("OPENAI_API_KEY", "OPENAI_API_KEY_V2");
warnShadow("EXPO_PUBLIC_SUPABASE_URL", "EXPO_PUBLIC_SUPABASE_URL_V2");
warnShadow("EXPO_PUBLIC_SUPABASE_ANON_KEY", "EXPO_PUBLIC_SUPABASE_ANON_KEY_V2");

// app will be mounted at /api
const app = new Hono();

// Enable CORS for all routes
app.use("*", cors());

// Mount tRPC router at /trpc
app.use(
  "/trpc/*",
  trpcServer({
    endpoint: "/api/trpc",
    router: appRouter,
    createContext,
  })
);

// Simple health check endpoint
app.get("/", (c) => {
  return c.json({ status: "ok", message: "API is running" });
});

// Env check endpoint (whitelisted, non-secret). Mounted at /api/env-check
app.get("/env-check", (c) => {
  const pick = (k: string) => (typeof process.env[k] === "string" ? process.env[k] : undefined);
  const snapshot = {
    has: {
      SUPABASE_URL: Boolean(pick("SUPABASE_URL")),
      SUPABASE_URL_V2: Boolean(pick("SUPABASE_URL_V2")),
      SUPABASE_ANON_KEY: Boolean(pick("SUPABASE_ANON_KEY")),
      SUPABASE_ANON_KEY_V2: Boolean(pick("SUPABASE_ANON_KEY_V2")),
      OPENAI_API_KEY: Boolean(pick("OPENAI_API_KEY")),
      OPENAI_API_KEY_V2: Boolean(pick("OPENAI_API_KEY_V2")),
      EXPO_PUBLIC_SUPABASE_URL: Boolean(pick("EXPO_PUBLIC_SUPABASE_URL")),
      EXPO_PUBLIC_SUPABASE_URL_V2: Boolean(pick("EXPO_PUBLIC_SUPABASE_URL_V2")),
      EXPO_PUBLIC_SUPABASE_ANON_KEY: Boolean(pick("EXPO_PUBLIC_SUPABASE_ANON_KEY")),
      EXPO_PUBLIC_SUPABASE_ANON_KEY_V2: Boolean(pick("EXPO_PUBLIC_SUPABASE_ANON_KEY_V2")),
    },
    values: {
      SUPABASE_URL: pick("SUPABASE_URL") ? "set" : "unset",
      SUPABASE_URL_V2: pick("SUPABASE_URL_V2") ? "set" : "unset",
      EXPO_PUBLIC_SUPABASE_URL: pick("EXPO_PUBLIC_SUPABASE_URL") ? "set" : "unset",
      EXPO_PUBLIC_SUPABASE_URL_V2: pick("EXPO_PUBLIC_SUPABASE_URL_V2") ? "set" : "unset",
    },
  } as const;
  return c.json({ status: "ok", env: snapshot });
});

export default app;