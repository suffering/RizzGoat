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

console.log('[Backend] Hono app initialized');

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
  console.log('[Backend] Health check called');
  console.log('[Backend] Request path:', c.req.path);
  console.log('[Backend] Request URL:', c.req.url);
  return c.json({ status: "ok", message: "API is running", timestamp: new Date().toISOString() });
});

// OpenAI proxy endpoint - catch all methods for debugging
app.all("/chat", async (c) => {
  console.log('[OpenAI Proxy] ========================================');
  console.log('[OpenAI Proxy] Received request to /chat');
  console.log('[OpenAI Proxy] Method:', c.req.method);
  console.log('[OpenAI Proxy] Path:', c.req.path);
  console.log('[OpenAI Proxy] URL:', c.req.url);
  console.log('[OpenAI Proxy] Headers:', Object.fromEntries(c.req.raw.headers.entries()));
  
  if (c.req.method !== 'POST') {
    console.log('[OpenAI Proxy] Non-POST request received');
    return c.json({ error: 'Method not allowed', method: c.req.method }, 405);
  }
  try {
    const apiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_V2;
    
    if (!apiKey) {
      console.error('[OpenAI Proxy] Missing API key');
      return c.json({ error: 'OpenAI API key not configured' }, 500);
    }

    const body = await c.req.json();
    const { model = 'gpt-4o', messages, temperature = 0.8 } = body;

    console.log('[OpenAI Proxy] Forwarding request to OpenAI', { model, messageCount: messages?.length });

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[OpenAI Proxy] OpenAI API error:', response.status, errorText);
      const statusCode = response.status as 400 | 401 | 403 | 404 | 429 | 500 | 502 | 503;
      return c.json({ error: `OpenAI API error: ${response.status}` }, statusCode);
    }

    const data = await response.json();
    console.log('[OpenAI Proxy] Success');
    return c.json(data);
  } catch (error) {
    console.error('[OpenAI Proxy] Error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Debug endpoint to list all routes
app.get("/routes", (c) => {
  return c.json({ 
    message: "Available routes",
    routes: [
      "GET /api/",
      "POST /api/chat",
      "GET /api/env-check",
      "GET /api/routes",
      "* /api/trpc/*"
    ]
  });
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

// Catch-all debug route to see what's being requested (MUST BE LAST)
app.all("*", (c) => {
  console.log('[Backend] Catch-all route hit');
  console.log('[Backend] Method:', c.req.method);
  console.log('[Backend] Path:', c.req.path);
  console.log('[Backend] URL:', c.req.url);
  return c.json({ 
    error: "Route not found",
    method: c.req.method,
    path: c.req.path,
    url: c.req.url,
    availableRoutes: [
      "GET /api/",
      "POST /api/chat",
      "GET /api/env-check",
      "GET /api/routes",
      "* /api/trpc/*"
    ]
  }, 404);
});

console.log('[Backend] Exporting Hono app');

export default app;