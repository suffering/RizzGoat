export const OPENAI_PROXY_URL =
  (process.env.EXPO_PUBLIC_OPENAI_PROXY_URL as string) || '';
if (!OPENAI_PROXY_URL) throw new Error('Missing EXPO_PUBLIC_OPENAI_PROXY_URL');