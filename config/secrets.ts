function getProxyUrl(): string {
  const envUrl = (process.env.EXPO_PUBLIC_OPENAI_PROXY_URL as string | undefined)?.trim();
  
  if (envUrl) {
    return envUrl;
  }
  
  if (typeof window !== 'undefined' && window.location) {
    const origin = window.location.origin;
    console.log('[Secrets] Using window.location.origin for proxy URL:', origin);
    return `${origin}/api`;
  }
  
  return '';
}

export const OPENAI_PROXY_URL: string = getProxyUrl();

export function ensureOpenAIProxyUrl(): string {
  const url = OPENAI_PROXY_URL || getProxyUrl();
  
  if (!url) {
    const msg =
      'OpenAI proxy URL is not configured. Set EXPO_PUBLIC_OPENAI_PROXY_URL in your .env file or ensure backend is running.';
    if (typeof console !== 'undefined' && console.error) {
      console.error(msg);
      console.error('Current env:', process.env.EXPO_PUBLIC_OPENAI_PROXY_URL);
    }
    return '';
  }
  
  console.log('[Secrets] Using OpenAI proxy URL:', url);
  return url;
}