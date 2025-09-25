export const OPENAI_PROXY_URL: string =
  (process.env.EXPO_PUBLIC_OPENAI_PROXY_URL as string | undefined)?.trim() ?? '';

export function ensureOpenAIProxyUrl(): string {
  if (!OPENAI_PROXY_URL) {
    const msg =
      'OpenAI proxy URL is not configured. Set EXPO_PUBLIC_OPENAI_PROXY_URL to enable AI features.';
    if (typeof console !== 'undefined' && console.error) console.error(msg);
    return '';
  }
  return OPENAI_PROXY_URL;
}