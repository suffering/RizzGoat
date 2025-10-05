function getApiBaseUrl(): string {
  const envUrl = (process.env.EXPO_PUBLIC_OPENAI_PROXY_URL as string | undefined)?.trim();
  if (envUrl && envUrl.length > 0) {
    const clean = envUrl.replace(/\/+$/, "");
    console.log('[Secrets] Using EXPO_PUBLIC_OPENAI_PROXY_URL:', clean);
    return clean;
  }
  if (typeof window !== 'undefined' && window.location) {
    const origin = window.location.origin.replace(/\/+$/, "");
    console.log('[Secrets] Using window.location.origin for API base:', origin);
    return `${origin}/api`;
  }
  const fallback = 'http://127.0.0.1:8081/api';
  console.warn('[Secrets] Falling back to dev API base:', fallback);
  return fallback;
}

export const API_BASE_URL: string = getApiBaseUrl();

export function ensureOpenAIProxyUrl(): string {
  const url = (API_BASE_URL || getApiBaseUrl()).replace(/\/+$/, '');
  console.log('[Secrets] Resolved API base URL:', url);
  return url;
}