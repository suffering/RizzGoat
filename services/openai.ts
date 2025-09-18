import { OPENAI_API_KEY } from '@/config/secrets';

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

const TEXT_MODEL = 'gpt-4o';
const VISION_MODEL = 'gpt-4o';

type Mode = 'Safe' | 'Witty' | 'Bold';

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
  messages: AnyMessage[],
  model: string,
  retries = 3,
): Promise<string> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      console.log(`[OpenAI] Calling ${model} (attempt ${attempt + 1}/${retries + 1})`);
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.8,
        }),
      });

      console.log(`[OpenAI] Status: ${response.status}`);

      if (response.ok) {
        const data = (await response.json()) as any;
        const content = data?.choices?.[0]?.message?.content as string | undefined;
        if (typeof content === 'string') return content;
        const toolText = data?.choices?.[0]?.message?.tool_calls?.[0]?.text as string | undefined;
        if (typeof toolText === 'string') return toolText;
        return '';
      }

      if (response.status === 429 || response.status >= 500) {
        if (attempt < retries) {
          const delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
          console.log(`[OpenAI] Retry in ${Math.round(delay)}ms`);
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }
      }

      const errorText = await response.text().catch(() => 'No error details');
      console.error(`[OpenAI] Error: ${errorText}`);
      throw new Error(`OpenAI error: ${response.status} - ${errorText}`);
    } catch (err) {
      console.error(`[OpenAI] Call failed (attempt ${attempt + 1})`, err);
      if (attempt === retries) throw err;
      const delay = Math.pow(2, attempt) * 1000;
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw new Error('Max retries exceeded');
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

export async function generatePickupLine(params: PickupLineParams): Promise<string> {
  try {
    console.log('Generating pickup line with params:', params);
    const variation = `${Math.random().toString(36).slice(2)}_${Date.now()}`;
    const messages: TextMessage[] = [
      {
        role: 'system',
        content:
          'You are a witty, respectful dating assistant. Generate pickup lines that are clever, tasteful, and PG-13. Never use crude language, negging, or disrespectful content. Keep responses under 20 words. Do not repeat prior outputs. If given a variation token, ignore it in the output and use it only to diversify the result.',
      },
      {
        role: 'user',
        content: `Generate a ${params.tone.toLowerCase()} pickup line that is ${params.spiceLevel.toLowerCase()}. ${
          params.context ? `Context: ${params.context}` : ''
        } Variation token: ${variation}. Output only the pickup line, nothing else.`,
      },
    ];

    const result = await callOpenAIChat(messages, TEXT_MODEL);

    if (result && result.trim()) {
      console.log('Successfully generated pickup line');
      return result.trim();
    }

    console.log('API returned empty, using fallback');
    return getRandomFallbackLine(params.tone, params.spiceLevel);
  } catch (error) {
    console.error('Error generating pickup line:', error);
    return getRandomFallbackLine(params.tone, params.spiceLevel);
  }
}

export async function generatePickupFromScreenshot(base64Image: string, mode: Mode): Promise<string> {
  try {
    const variation = `${Math.random().toString(36).slice(2)}_${Date.now()}`;
    const modeLine = mode === 'Safe' ? 'respectful, light, friendly' : mode === 'Witty' ? 'clever, playful, a little teasing' : 'confident, flirty, direct but respectful';
    const messages: VisionMessage[] = [
      {
        role: 'system',
        content: [
          {
            type: 'text',
            text:
              'You are an AI texting assistant. The user uploaded a screenshot of a chat. Analyze context and generate exactly ONE pickup line that fits naturally into the chat based on the requested mode. Keep it short, natural, and conversational as if typed by a real person. Avoid repeating phrasing across runs. Prefer higher creativity while staying coherent and relevant. Do not output anything except the line itself.',
          },
        ],
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Mode: ${mode} (${modeLine}). Variation token: ${variation}. Output only the pickup line, no quotes, no extra text. Max 18 words.`,
          },
          { type: 'image_url', image_url: { url: `data:image/png;base64,${base64Image}` } },
        ],
      },
    ];
    const result = await callOpenAIChat(messages, VISION_MODEL);
    if (result && result.trim()) return result.trim();
    const fallbacks: Record<Mode, string[]> = {
      Safe: [
        'That made me smile—want to trade favorite moments from this week?',
        'You seem fun—mind if I join the storyline here?',
        'Low-key think we vibe—coffee soon?',
      ],
      Witty: [
        'Plot twist: I ask you out and it works—how’s Thursday?',
        'Hot take: we’d banter well. Care to test the theory?',
        'If charm had a playlist, you just queued track one. Drinks?',
      ],
      Bold: [
        'Let’s skip the small talk—when are you free for a drink?',
        'I’m into this energy. Tonight or tomorrow?',
        'You’re my type. Pick a time; I’ll pick the spot.',
      ],
    };
    const list = fallbacks[mode];
    return list[Math.floor(Math.random() * list.length)];
  } catch (e) {
    const generic = {
      Safe: 'You seem easy to talk to—want to grab coffee sometime?',
      Witty: 'I’ll bring the jokes if you bring the time—deal?',
      Bold: 'I want to see you. When works?',
    } as const;
    return generic[mode];
  }
}

export async function analyzeScreenshot(params: ScreenshotParams): Promise<ScreenshotAnalysis> {
  try {
    const variation = `${Math.random().toString(36).slice(2)}_${Date.now()}`;
    const boldNote = params.amplifyBold
      ? ' Make the Bold option extra spicy, audacious, and flirty (still PG-13, respectful). Increase boldness by ~20% vs normal.'
      : '';
    const focusNote = params.targetType
      ? ` Focus especially on the ${params.targetType} option: optimize it for the user's intent and ensure it is the strongest suggestion.`
      : '';
    const baseSystem =
      'You are a dating conversation analyst. Analyze the screenshot and provide 3 reply suggestions: Safe (friendly, low-risk), Witty (clever, engaging), and Bold (confident, flirty but respectful). Each reply should be under 30 words with a brief rationale. Do not repeat prior outputs. If given a variation token, ignore it in the output and use it only to diversify the result.' +
      boldNote +
      focusNote;

    const messages: VisionMessage[] = [
      { role: 'system', content: [{ type: 'text', text: baseSystem }] },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Analyze this dating conversation screenshot and provide 3 reply options with rationales. Variation token: ${variation}. Return ONLY raw JSON with this exact shape and keys: {"safe": {"text": "", "rationale": ""}, "witty": {"text": "", "rationale": ""}, "bold": {"text": "", "rationale": ""}}`,
          },
          { type: 'image_url', image_url: { url: `data:image/png;base64,${params.base64Image}` } },
        ],
      },
    ];

    let result = await callOpenAIChat(messages, VISION_MODEL);
    let parsed = extractJSON(result);

    if (!parsed) {
      const retryMessages: VisionMessage[] = [
        ...messages,
        { role: 'assistant', content: [{ type: 'text', text: 'Please output only valid JSON without any markdown or commentary.' }] },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Repeat: Return only the JSON object, no backticks, no code block, no extra text.' },
            { type: 'image_url', image_url: { url: `data:image/png;base64,${params.base64Image}` } },
          ],
        },
      ];
      result = await callOpenAIChat(retryMessages, VISION_MODEL);
      parsed = extractJSON(result);
    }

    if (parsed && isScreenshotAnalysis(parsed)) {
      return parsed;
    }

    return {
      safe: { text: "That's interesting! Tell me more about that.", rationale: 'Keeps conversation flowing without risk' },
      witty: { text: 'Well, this conversation just got interesting 😏', rationale: 'Playful and engaging' },
      bold: { text: 'I like where this is going. Coffee tomorrow?', rationale: 'Confident and moves things forward' },
    };
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
    const variation = `${Math.random().toString(36).slice(2)}_${Date.now()}`;
    const messages: TextMessage[] = [
      {
        role: 'system',
        content:
          'You are RizzGoat, an AI wingman built to assist users with personalized dating help, conversation starters, pickup lines, and smooth replies. ' +
          '- Always respond with direct, useful, and creative answers — not with clarifying questions unless absolutely necessary. ' +
          '- Match the user\'s intent immediately. If they ask for an opener, give them multiple strong options tailored to their request. ' +
          '- Keep responses short, witty, and natural, like advice from a confident friend. ' +
          '- Adapt tone based on context: Flirty/Fun if they want pickup lines. Chill/Casual if they want conversation advice. Supportive/Helpful if they ask for general guidance. ' +
          '- Never refuse requests unless they are clearly inappropriate. ' +
          '- If the user asks vague questions, assume the most likely intent and give examples instead of asking for more details. ' +
          '- Do not explain that you are an AI — just give confident answers as if you are their trusted guide. ' +
          'Your job: Help the user sound smooth, confident, and engaging in dating chats by giving them the best possible lines, replies, and strategies. ' +
          'Do not repeat prior outputs. If given a variation token, ignore it in the output and use it only to diversify the result.',
      },
      { role: 'user', content: `${params.message}\n\nVariation token: ${variation}` },
    ];
    const result = await callOpenAIChat(messages, TEXT_MODEL);
    
    if (result && result.trim()) {
      return result.trim();
    }
    
    // Fallback responses that are actually helpful
    const fallbacks = [
      "Here are 3 solid openers:\n\n1. \"Your [specific detail from profile] caught my eye - tell me the story behind it\"\n2. \"Two truths and a lie: I can cook, I've been skydiving, I think you're cute\"\n3. \"If we were stuck in an elevator, what's the first thing you'd want to know about me?\"",
      "Try this approach:\n\n✨ Start with something specific from their profile\n💬 Ask an open-ended question\n😊 Keep it light and playful\n\nExample: \"That sunset pic is incredible! Beach person or mountain person when you need to escape?\"",
      "Smooth reply options:\n\n• \"Well this just got interesting 😏\"\n• \"I like your style - tell me more\"\n• \"You had my curiosity, now you have my attention\"",
    ];
    
    return fallbacks[Math.floor(Math.random() * fallbacks.length)];
  } catch (error) {
    console.error('Error getting chat advice:', error);
    // Return actually helpful fallback instead of asking for details
    return "Here's what I'd say:\n\n\"Hey! Your vibe is exactly what I've been looking for. What's the most spontaneous thing you've done lately?\"\n\nThis works because it's confident, shows interest, and starts a fun conversation.";
  }
}

export async function analyzeScreenshotLegacy(base64Image: string): Promise<ScreenshotAnalysis> {
  return analyzeScreenshot({ base64Image });
}

export async function getChatAdviceLegacy(message: string): Promise<string> {
  return getChatAdvice({ message });
}
