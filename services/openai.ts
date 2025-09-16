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
      console.log(`Attempting API call (attempt ${attempt + 1}/${retries + 1})`);
      const response = await fetch('https://toolkit.rork.com/text/llm/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages }),
      });
      
      console.log(`API Response status: ${response.status}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('API call successful');
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
      
      const errorText = await response.text().catch(() => 'No error details');
      console.error(`API Error Response: ${errorText}`);
      throw new Error(`Backend API error: ${response.status} - ${errorText}`);
    } catch (error) {
      console.error(`API call error (attempt ${attempt + 1}):`, error);
      
      if (attempt === retries) {
        console.error('Max retries exceeded, throwing error');
        throw error;
      }
      
      // Handle network errors
      if (error instanceof TypeError && error.message.includes('Network request failed')) {
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`Network error detected. Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // Handle fetch errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`Fetch error detected. Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      throw error;
    }
  }
  throw new Error('Max retries exceeded');
}

// Fallback pickup lines for different combinations
const FALLBACK_LINES: Record<string, Record<string, string[]>> = {
  Playful: {
    Cute: [
      "Are you a magician? Because whenever I look at you, everyone else disappears.",
      "Do you have a map? I keep getting lost in your eyes.",
      "Is your name Google? Because you have everything I've been searching for.",
    ],
    Cheeky: [
      "Are you a parking ticket? Because you've got 'fine' written all over you.",
      "Do you believe in love at first sight, or should I walk by again?",
      "If you were a vegetable, you'd be a cute-cumber.",
    ],
    Spicy: [
      "Are you a campfire? Because you're hot and I want s'more.",
      "Is it hot in here or is it just you?",
      "Do you have a Band-Aid? I just scraped my knee falling for you.",
    ],
  },
  Confident: {
    Cute: [
      "I'm not a photographer, but I can picture us together.",
      "Your hand looks heavy. Can I hold it for you?",
      "I was wondering if you had an extra heart. Mine was just stolen.",
    ],
    Cheeky: [
      "I'm not usually this forward, but you've got me breaking all my rules.",
      "They say nothing lasts forever. Want to be my nothing?",
      "Are you my appendix? Because I have a funny feeling I should take you out.",
    ],
    Spicy: [
      "I must be a snowflake, because I've fallen for you.",
      "Are you a time traveler? Because I see you in my future.",
      "If being sexy was a crime, you'd be guilty as charged.",
    ],
  },
  Wholesome: {
    Cute: [
      "You must be made of copper and tellurium, because you're Cu-Te.",
      "Are you a 45-degree angle? Because you're acute-y.",
      "Do you like Star Wars? Because Yoda one for me.",
    ],
    Cheeky: [
      "Are you a bank loan? Because you have my interest.",
      "If you were a triangle, you'd be acute one.",
      "Are you Australian? Because you meet all of my koala-fications.",
    ],
    Spicy: [
      "Is your dad a boxer? Because you're a knockout.",
      "Are you a camera? Because every time I look at you, I smile.",
      "Do you have a sunburn, or are you always this hot?",
    ],
  },
  Bold: {
    Cute: [
      "I'm going to give you a kiss. If you don't like it, you can return it.",
      "Life without you is like a broken pencil... pointless.",
      "Are you French? Because Eiffel for you.",
    ],
    Cheeky: [
      "I'm not drunk, I'm just intoxicated by you.",
      "Kiss me if I'm wrong, but dinosaurs still exist, right?",
      "Feel my shirt. Know what it's made of? Boyfriend material.",
    ],
    Spicy: [
      "Are you a fire alarm? Because you're really loud and annoying... just kidding, you're hot.",
      "I'd say God bless you, but it looks like he already did.",
      "Are you a loan? Because you've got my interest and the rates are rising.",
    ],
  },
};

function getRandomFallbackLine(tone: string, spiceLevel: string): string {
  const toneLines = FALLBACK_LINES[tone] || FALLBACK_LINES.Playful;
  const spiceLines = toneLines[spiceLevel] || toneLines.Cute || [];
  if (spiceLines.length === 0) {
    return "Hey there! Mind if I steal a moment of your time?";
  }
  return spiceLines[Math.floor(Math.random() * spiceLines.length)];
}

export async function generatePickupLine(params: PickupLineParams): Promise<string> {
  try {
    console.log('Generating pickup line with params:', params);
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
    
    if (result && result.trim()) {
      console.log('Successfully generated pickup line');
      return result.trim();
    }
    
    // If API returns empty, use fallback
    console.log('API returned empty, using fallback');
    return getRandomFallbackLine(params.tone, params.spiceLevel);
  } catch (error) {
    console.error("Error generating pickup line:", error);
    // Use fallback lines when API fails
    return getRandomFallbackLine(params.tone, params.spiceLevel);
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
