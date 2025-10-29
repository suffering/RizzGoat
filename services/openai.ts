import { Platform } from 'react-native';
import Constants from 'expo-constants';

interface PickupLineParams {
  tone: string;
  spiceLevel: string;
  context?: string;
}

interface ScreenshotAnalysis {
  safe: { text: string; rationale: string };
  witty: { text: string; rationale: string };
  bold: { text: string; rationale: string };
}

type ReplyType = 'Safe' | 'Witty' | 'Bold';

interface ChatParams {
  message: string;
}

interface ScreenshotParams {
  base64Image: string;
  amplifyBold?: boolean;
  targetType?: ReplyType;
}

type TextMessage = { role: 'system' | 'user' | 'assistant'; content: string };

type VisionContent =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } };

type VisionMessage = { role: 'system' | 'user' | 'assistant'; content: VisionContent[] };

type AnyMessage = TextMessage | VisionMessage;

const TEXT_MODEL = 'gpt-4o-mini';
const VISION_MODEL = 'gpt-4o-mini';

function isScreenshotAnalysis(obj: unknown): obj is ScreenshotAnalysis {
  if (!obj || typeof obj !== 'object') return false;
  const o = obj as Record<string, any>;
  const groups = ['safe', 'witty', 'bold'] as const;
  for (const key of groups) {
    const g = o[key];
    if (!g || typeof g !== 'object') return false;
    if (typeof g.text !== 'string' || typeof g.rationale !== 'string') return false;
  }
  return true;
}

function extractJSON(text: string): ScreenshotAnalysis | null {
  try {
    const trimmed = text.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      const parsed = JSON.parse(trimmed);
      if (isScreenshotAnalysis(parsed)) return parsed;
    }
  } catch {}
  try {
    const first = text.indexOf('{');
    const last = text.lastIndexOf('}');
    if (first >= 0 && last > first) {
      const slice = text.slice(first, last + 1);
      const parsed = JSON.parse(slice);
      if (isScreenshotAnalysis(parsed)) return parsed;
    }
  } catch {}
  try {
    const codeBlock = text.match(/```(?:json)?\n([\s\S]*?)```/i);
    if (codeBlock && codeBlock[1]) {
      const parsed = JSON.parse(codeBlock[1]);
      if (isScreenshotAnalysis(parsed)) return parsed;
    }
  } catch {}
  return null;
}

async function callOpenAIChat(
  _messages: AnyMessage[],
  _model: string,
  _retries = 3,
): Promise<string> {
  throw new Error("Client no longer calls OpenAI directly. Use backend procedures.");
}

function readExtra(): Record<string, string | undefined> {
  const extra = (Constants?.expoConfig as any)?.extra ?? (Constants as any)?.manifest?.extra ?? {};
  return extra as Record<string, string | undefined>;
}

const sanitize = (url: string) => url.replace(/\/$/, '');

function getApiOrigin(): string {
  const extra = readExtra();
  const candidates = [
    process.env.EXPO_PUBLIC_API_URL,
    extra?.EXPO_PUBLIC_API_URL,
    process.env.EXPO_PUBLIC_API_BASE_URL,
    extra?.EXPO_PUBLIC_API_BASE_URL,
    process.env.EXPO_PUBLIC_RORK_API_BASE_URL,
    extra?.EXPO_PUBLIC_RORK_API_BASE_URL,
  ].filter((v): v is string => typeof v === 'string' && v.length > 0);
  if (candidates.length > 0) {
    const chosen = sanitize(candidates[0]!);
    console.log('[API] Using origin from env/extra:', chosen);
    return chosen;
  }
  try {
    const slug = (Constants?.expoConfig as any)?.slug ?? (Constants as any)?.manifest?.slug;
    if (slug && typeof slug === 'string') {
      const origin = sanitize(`https://${slug}.rork.com`);
      console.log('[API] Using slug fallback origin:', origin);
      return origin;
    }
  } catch {}
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const origin = sanitize(window.location.origin);
    console.log('[API] Using window origin (web):', origin);
    return origin;
  }
  console.log('[API] Using last-resort origin: https://rork.com');
  return 'https://rork.com';
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const origin = getApiOrigin();
  const url = `${origin}${path}`;
  console.log('[API] POST', url);
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      // Help browsers with CORS; no credentials are needed for our public API
      mode: Platform.OS === 'web' ? 'cors' : undefined,
      credentials: 'omit',
    } as RequestInit);
  } catch (err) {
    console.error('[API] Network error while fetching', url, err);
    throw new Error(`Network error contacting API at ${origin}. Check EXPO_PUBLIC_API_URL and server availability.`);
  }
  const text = await res.text();
  if (!res.ok) {
    const isHtml = text.startsWith('<!DOCTYPE') || (res.headers.get('content-type') ?? '').includes('text/html');
    if (isHtml) {
      console.error('[API] Received HTML instead of JSON. Likely incorrect API origin:', origin);
    }
    console.error('[API] Error', res.status, text);
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  try {
    return JSON.parse(text) as T;
  } catch (e) {
    console.error('[API] Invalid JSON', text);
    throw e;
  }
}

export async function generatePickupLine(params: PickupLineParams): Promise<string> {
  const data = await postJson<{ result?: string; error?: string }>(`/api/ai/pickup`, params);
  if (data?.result && typeof data.result === 'string') return data.result;
  const err = typeof data?.error === 'string' ? data.error : 'Unknown error generating pickup line';
  throw new Error(err);
}

export async function analyzeScreenshot(params: ScreenshotParams): Promise<ScreenshotAnalysis> {
  try {
    const data = await postJson<{ result?: ScreenshotAnalysis; error?: string }>(`/api/ai/screenshot`, params);
    if (data?.result && isScreenshotAnalysis(data.result)) return data.result;
    throw new Error('Invalid response');
  } catch (error) {
    console.error('Error analyzing screenshot:', error);
    return {
      safe: { text: "That's interesting! Tell me more about that.", rationale: 'Keeps conversation flowing without risk' },
      witty: { text: 'Well, this conversation just got interesting 😏', rationale: 'Playful and engaging' },
      bold: { text: 'I like where this is going. Coffee tomorrow?', rationale: 'Confident and moves things forward' },
    };
  }
}

export async function getChatAdvice(params: ChatParams): Promise<string> {
  try {
    console.log('[getChatAdvice] Making request:', params);
    const data = await postJson<{ result?: string; error?: string }>(`/api/ai/chat`, params);
    console.log('[getChatAdvice] Response:', data);
    return data?.result ?? "I'm here to help! Could you provide more details about your situation?";
  } catch (error) {
    console.error('[getChatAdvice] Error:', error);
    return "I'm here to help! Could you provide more details about your situation?";
  }
}

export async function analyzeScreenshotLegacy(base64Image: string): Promise<ScreenshotAnalysis> {
  return analyzeScreenshot({ base64Image });
}

export async function getChatAdviceLegacy(message: string): Promise<string> {
  return getChatAdvice({ message });
}
