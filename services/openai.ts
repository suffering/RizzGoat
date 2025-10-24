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

const CLICHE_BAN: string[] = [
  'are you a magician? because whenever i look at you, everyone else disappears',
  'do you have a map? i keep getting lost in your eyes',
  "is your name google? because you have everything i've been searching for",
  "did it hurt when you fell from heaven",
  "are you a parking ticket? because you've got 'fine' written all over you",
  'is it hot in here or is it just you',
  "are you a camera? because every time i look at you, i smile",
  'are you from tennessee? because you are the only ten i see',
];

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

const FALLBACK_LINES: Record<string, Record<string, string[]>> = {
  Playful: {
    Cute: [
      'Are you a magician? Because whenever I look at you, everyone else disappears.',
      'Do you have a map? I keep getting lost in your eyes.',
      "Is your name Google? Because you have everything I've been searching for.",
    ],
    Cheeky: [
      "Are you a parking ticket? Because you've got 'fine' written all over you.",
      'Do you believe in love at first sight, or should I walk by again?',
      "If you were a vegetable, you'd be a cute-cumber.",
    ],
    Spicy: [
      "Are you a campfire? Because you're hot and I want s'more.",
      'Is it hot in here or is it just you?',
      'Do you have a Band-Aid? I just scraped my knee falling for you.',
    ],
  },
  Confident: {
    Cute: [
      "I'm not a photographer, but I can picture us together.",
      'Your hand looks heavy. Can I hold it for you?',
      'I was wondering if you had an extra heart. Mine was just stolen.',
    ],
    Cheeky: [
      "I'm not usually this forward, but you've got me breaking all my rules.",
      'They say nothing lasts forever. Want to be my nothing?',
      'Are you my appendix? Because I have a funny feeling I should take you out.',
    ],
    Spicy: [
      "I must be a snowflake, because I've fallen for you.",
      'Are you a time traveler? Because I see you in my future.',
      "If being sexy was a crime, you'd be guilty as charged.",
    ],
  },
  Wholesome: {
    Cute: [
      "You must be made of copper and tellurium, because you're Cu-Te.",
      'Are you a 45-degree angle? Because you\'re acute-y.',
      'Do you like Star Wars? Because Yoda one for me.',
    ],
    Cheeky: [
      'Are you a bank loan? Because you have my interest.',
      'If you were a triangle, you\'d be acute one.',
      'Are you Australian? Because you meet all of my koala-fications.',
    ],
    Spicy: [
      "Is your dad a boxer? Because you're a knockout.",
      'Are you a camera? Because every time I look at you, I smile.',
      'Do you have a sunburn, or are you always this hot?',
    ],
  },
  Bold: {
    Cute: [
      "I'm going to give you a kiss. If you don't like it, you can return it.",
      'Life without you is like a broken pencil... pointless.',
      'Are you French? Because Eiffel for you.',
    ],
    Cheeky: [
      "I'm not drunk, I'm just intoxicated by you.",
      'Kiss me if I\'m wrong, but dinosaurs still exist, right?',
      "Feel my shirt. Know what it's made of? Boyfriend material.",
    ],
    Spicy: [
      'Are you a fire alarm? Because you\'re really loud and annoying... just kidding, you\'re hot.',
      "I'd say God bless you, but it looks like he already did.",
      "Are you a loan? Because you've got my interest and the rates are rising.",
    ],
  },
};

function getRandomFallbackLine(tone: string, spiceLevel: string): string {
  const toneLines = FALLBACK_LINES[tone] || FALLBACK_LINES.Playful;
  const spiceLines = toneLines[spiceLevel] || toneLines.Cute || [];
  if (spiceLines.length === 0) {
    return 'Hey there! Mind if I steal a moment of your time?';
  }
  return spiceLines[Math.floor(Math.random() * spiceLines.length)];
}

function readExtra(): Record<string, string | undefined> {
  const extra = (Constants?.expoConfig as any)?.extra ?? (Constants as any)?.manifest?.extra ?? {};
  return extra as Record<string, string | undefined>;
}

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
  if (candidates.length > 0) return candidates[0]!;
  if (Platform.OS === 'web' && typeof window !== 'undefined') return window.location.origin;
  return 'http://localhost:8787';
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const url = `${getApiOrigin()}${path}`;
  console.log('[API] POST', url);
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) {
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
  try {
    const data = await postJson<{ result?: string; error?: string }>(`/api/ai/pickup`, params);
    if (data?.result && typeof data.result === 'string') return data.result;
    return getRandomFallbackLine(params.tone, params.spiceLevel);
  } catch (e) {
    console.error('[Pickup] Backend error', e);
    return getRandomFallbackLine(params.tone, params.spiceLevel);
  }
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
