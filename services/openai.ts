// Client-side AI service proxying to backend API
import { Platform } from 'react-native';

export const API_URL = process.env.EXPO_PUBLIC_API_URL as string;

export interface PickupLineParams {
  tone: string;
  context: string;
  length?: 'short' | 'medium' | 'long';
}

export async function createPickupLine(token: string, params: PickupLineParams) {
  if (!API_URL) {
    throw new Error('Missing EXPO_PUBLIC_API_URL');
  }
  const res = await fetch(`${API_URL}/ai/pickup-line`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error(`AI ${res.status}`);
  return res.json();
}

// Backward-compatible wrapper for existing UI expecting generatePickupLine({ tone, spiceLevel, context }) => string
export async function generatePickupLine(params: { tone: string; spiceLevel: string; context?: string }): Promise<string> {
  try {
    const lengthMap: Record<string, PickupLineParams['length']> = {
      Cute: 'short',
      Cheeky: 'medium',
      Spicy: 'long',
    };
    const length = lengthMap[params.spiceLevel] ?? 'medium';
    const result = await createPickupLine('', {
      tone: params.tone,
      context: params.context ?? '',
      length,
    });
    const text: unknown = (result as any)?.text ?? (result as any)?.line ?? (result as any)?.data ?? '';
    if (typeof text === 'string' && text.trim().length > 0) {
      return text.trim();
    }
    return 'Hey there! Mind if I steal a moment of your time?';
  } catch (e) {
    console.log('generatePickupLine error', e);
    return 'Hey there! Mind if I steal a moment of your time?';
  }
}

// Chat advice proxy to backend
export async function getChatAdvice(params: { message: string }): Promise<string> {
  try {
    if (!API_URL) throw new Error('Missing EXPO_PUBLIC_API_URL');
    const res = await fetch(`${API_URL}/ai/chat-advice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: params.message }),
    });
    if (!res.ok) throw new Error(`AI ${res.status}`);
    const data: any = await res.json();
    const text: unknown = data?.text ?? data?.advice ?? data?.message ?? '';
    if (typeof text === 'string' && text.trim()) return text.trim();
    return "I'm here to help! Could you provide more details about your situation?";
  } catch (err) {
    console.log('getChatAdvice error', err);
    return "I'm here to help! Could you provide more details about your situation?";
  }
}

// Screenshot analysis proxy (keeps API surface; returns a safe default if backend missing)
export async function analyzeScreenshot(params: { base64Image: string }): Promise<{ safe: { text: string; rationale: string }; witty: { text: string; rationale: string }; bold: { text: string; rationale: string } }> {
  try {
    if (!API_URL) throw new Error('Missing EXPO_PUBLIC_API_URL');
    const res = await fetch(`${API_URL}/ai/analyze-screenshot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: params.base64Image }),
    });
    if (!res.ok) throw new Error(`AI ${res.status}`);
    return await res.json();
  } catch (err) {
    console.log('analyzeScreenshot error', err);
    return {
      safe: { text: "That's interesting! Tell me more about that.", rationale: 'Keeps conversation flowing without risk' },
      witty: { text: 'Well, this conversation just got interesting 😏', rationale: 'Playful and engaging' },
      bold: { text: 'I like where this is going. Coffee tomorrow?', rationale: 'Confident and moves things forward' },
    };
  }
}
