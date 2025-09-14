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

// Use the backend API for all AI requests
async function callBackendAI(messages: any[], retries = 3): Promise<string> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch('https://toolkit.rork.com/text/llm/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages }),
      });
      if (response.ok) {
        const data = await response.json();
        return data.completion || '';
      }
      if (response.status === 429 || response.status >= 500) {
        if (attempt < retries) {
          const delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
          console.log(`Rate limited or server error (${response.status}). Retrying in ${Math.round(delay)}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Backend API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
    } catch (error) {
      if (attempt === retries) {
        throw error;
      }
      if (error instanceof TypeError && (error as Error).message.includes('fetch')) {
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`Network error. Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
  throw new Error('Max retries exceeded');
}

export async function generatePickupLine(params: PickupLineParams): Promise<string> {
  try {
    const variation = `${Math.random().toString(36).slice(2)}_${Date.now()}`;
    const messages = [
      {
        role: "system",
        content: "You are a witty, respectful dating assistant. Generate pickup lines that are clever, tasteful, and PG-13. Never use crude language, negging, or disrespectful content. Keep responses under 20 words. Do not repeat prior outputs. If given a variation token, ignore it in the output and use it only to diversify the result.",
      },
      {
        role: "user",
        content: `Generate a ${params.tone.toLowerCase()} pickup line that is ${params.spiceLevel.toLowerCase()}. ${
          params.context ? `Context: ${params.context}` : ""
        } Variation token: ${variation}. Output only the pickup line, nothing else.`,
      },
    ];
    const result = await callBackendAI(messages);
    return result || "Hey there! Mind if I steal a moment of your time?";
  } catch (error) {
    console.error("Error generating pickup line:", error);
    return "Hey there! Mind if I steal a moment of your time?";
  }
}

export async function analyzeScreenshot(params: ScreenshotParams): Promise<ScreenshotAnalysis> {
  try {
    const variation = `${Math.random().toString(36).slice(2)}_${Date.now()}`;
    const boldNote = params.amplifyBold
      ? " Make the Bold option extra spicy, audacious, and flirty (still PG-13, respectful). Increase boldness by ~20% vs normal."
      : "";
    const focusNote = params.targetType
      ? ` Focus especially on the ${params.targetType} option: optimize it for the user's intent and ensure it is the strongest suggestion.`
      : "";
    const baseSystem =
      "You are a dating conversation analyst. Analyze the screenshot and provide 3 reply suggestions: Safe (friendly, low-risk), Witty (clever, engaging), and Bold (confident, flirty but respectful). Each reply should be under 30 words with a brief rationale. Do not repeat prior outputs. If given a variation token, ignore it in the output and use it only to diversify the result." +
      boldNote +
      focusNote;

    const messages: any[] = [
      { role: "system", content: baseSystem },
      {
        role: "user",
        content: [
          { type: "text", text: `Analyze this dating conversation screenshot and provide 3 reply options with rationales. Variation token: ${variation}. Return ONLY raw JSON with this exact shape and keys: {"safe": {"text": "", "rationale": ""}, "witty": {"text": "", "rationale": ""}, "bold": {"text": "", "rationale": ""}}` },
          { type: "image", image: params.base64Image },
        ],
      },
    ];

    let result = await callBackendAI(messages);
    let parsed = extractJSON(result);

    if (!parsed) {
      messages.push({ role: "assistant", content: "Please output only valid JSON without any markdown or commentary." });
      messages.push({
        role: "user",
        content: [
          { type: "text", text: "Repeat: Return only the JSON object, no backticks, no code block, no extra text." },
          { type: "image", image: params.base64Image },
        ],
      });
      result = await callBackendAI(messages);
      parsed = extractJSON(result);
    }

    if (parsed && isScreenshotAnalysis(parsed)) {
      return parsed;
    }

    return {
      safe: { text: "That's interesting! Tell me more about that.", rationale: "Keeps conversation flowing without risk" },
      witty: { text: "Well, this conversation just got interesting 😏", rationale: "Playful and engaging" },
      bold: { text: "I like where this is going. Coffee tomorrow?", rationale: "Confident and moves things forward" },
    };
  } catch (error) {
    console.error("Error analyzing screenshot:", error);
    return {
      safe: { text: "That's interesting! Tell me more about that.", rationale: "Keeps conversation flowing without risk" },
      witty: { text: "Well, this conversation just got interesting 😏", rationale: "Playful and engaging" },
      bold: { text: "I like where this is going. Coffee tomorrow?", rationale: "Confident and moves things forward" },
    };
  }
}

export async function getChatAdvice(params: ChatParams): Promise<string> {
  try {
    const variation = `${Math.random().toString(36).slice(2)}_${Date.now()}`;
    const messages = [
      {
        role: "system",
        content: "You are RizzGoat, a friendly and knowledgeable dating coach. Provide structured advice in this format:\n\n💬 Say this:\n[1-2 line suggestion]\n\n🔄 If they respond with X:\n[Conditional advice]\n\n⚠️ Pitfalls to avoid:\n• [Bullet point]\n• [Bullet point]\n\nKeep advice practical, respectful, and confidence-building. Do not repeat prior outputs. If given a variation token, ignore it in the output and use it only to diversify the result.",
      },
      { role: "user", content: `${params.message}\n\nVariation token: ${variation}` },
    ];
    const result = await callBackendAI(messages);
    return result || "I'm here to help! Could you provide more details about your situation?";
  } catch (error) {
    console.error("Error getting chat advice:", error);
    return "I'm here to help! Could you provide more details about your situation?";
  }
}

// Legacy functions for backward compatibility
export async function analyzeScreenshotLegacy(base64Image: string): Promise<ScreenshotAnalysis> {
  return analyzeScreenshot({ base64Image });
}

export async function getChatAdviceLegacy(message: string): Promise<string> {
  return getChatAdvice({ message });
}
