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
  temperature: number = 0.8,
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
          temperature,
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

const FALLBACK_LINES: Record<string, Record<'Cute' | 'Medium' | 'Spicy', string[]>> = {
  Playful: {
    Cute: [
      'You look like trouble—adorable, harmless trouble.',
      'Can I borrow a smile? I swear I’ll return it brighter.',
      'Plot twist: we match, we vibe, we laugh too much.',
    ],
    Medium: [
      "If flirting was cardio, we’d be in great shape tonight.",
      'You bring the banter, I’ll bring the chemistry—deal?',
      'I vote we skip small talk and trade favorite daydreams.',
    ],
    Spicy: [
      "I’m dangerously good at fun—want a demonstration?",
      'Careful—I tease until you bite back. Your move.',
      'I want the spark and the chaos—say when.',
    ],
  },
  Confident: {
    Cute: [
      'You’re my type. Coffee first, stories after.',
      'I make great plans—want to be in one?',
      'I like our odds. Shall we test them?',
    ],
    Medium: [
      'You + me + good music. I’ll handle everything else.',
      'Let’s be direct: when are you free?',
      'I don’t chase—I choose. I’m choosing you.',
    ],
    Spicy: [
      'Let’s ruin our sleep schedules for all the right reasons.',
      'I kiss like I mean it—interested in evidence?',
      'Dangerously tempting. Pick a time; I’ll bring heat.',
    ],
  },
  Wholesome: {
    Cute: [
      'You feel like comfort and a fresh start.',
      'Your smile just upgraded my day.',
      'You’re the kind of kind I’d like to know.',
    ],
    Medium: [
      'Let’s be each other’s favorite person to tell good news to.',
      'I make great pancakes and even better company.',
      'You seem safe and special—can I earn a little space in your day?',
    ],
    Spicy: [
      'Publicly adorable, privately unstoppable—sound fun?',
      'Let’s keep it sweet… until it isn’t.',
      'Be my soft place and my wild side—same night.',
    ],
  },
  Bold: {
    Cute: [
      'I want to take you out. Pick a day.',
      'I like your vibe—let’s make it a date.',
      'I’ll bring confidence if you bring curiosity.',
    ],
    Medium: [
      'Let’s skip the preface: drinks, then trouble.',
      'I plan boldly and flirt shamelessly—join me.',
      'You look like my next great decision.',
    ],
    Spicy: [
      'Text me a time; I’ll handle the rest and the spark.',
      'I want the kind of kiss that changes plans.',
      'Pick a playlist; I’ll match the energy—no brakes.',
    ],
  },
};

function getRandomFallbackLine(tone: string, spiceLevel: string): string {
  const toneLines = FALLBACK_LINES[tone] || FALLBACK_LINES.Playful;
  const level = (['Cute', 'Medium', 'Spicy'] as const).includes(spiceLevel as any)
    ? (spiceLevel as 'Cute' | 'Medium' | 'Spicy')
    : 'Cute';
  const spiceLines = toneLines[level] || toneLines.Cute || [];
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
          'You are an AI pickup line creator. Always output exactly ONE pickup line, no quotes or prefixes. Match the chosen Vibe and Spice Level.\n\nVibes:\n- Playful: lighthearted, cheeky, fun.\n- Confident: smooth, self-assured, charming.\n- Wholesome: sweet, kind, genuine.\n- Bold: daring, flirty, direct without disrespect.\n\nSpice Levels:\n- Cute: soft, safe, light flirtation.\n- Medium: flirty, teasing, suggestive, not explicit.\n- Spicy: bold, risqué, freaky, edgy, playful and consensual; creative and witty, never crude or explicit.\n\nRules: Keep it short and chat-ready (max 18 words). Do not repeat phrasing across runs. No negging, no offensive content. Use any variation token only to diversify output; never include it in the line.',
      },
      {
        role: 'user',
        content: `Vibe: ${params.tone}. Spice: ${params.spiceLevel}. ${params.context ? `Context: ${params.context}. ` : ''}Variation token: ${variation}. Output ONLY the pickup line. Max 18 words.`,
      },
    ];

    const lvl = params.spiceLevel.toLowerCase();
    const temp = lvl === 'spicy' ? 1.0 : lvl === 'medium' ? 0.9 : 0.7;
    const result = await callOpenAIChat(messages, TEXT_MODEL, 3, temp);

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
    const result = await callOpenAIChat(messages, VISION_MODEL, 3, 0.8);
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

    let result = await callOpenAIChat(messages, VISION_MODEL, 3, 0.6);
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
      result = await callOpenAIChat(retryMessages, VISION_MODEL, 3, 0.5);
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
    const result = await callOpenAIChat(messages, TEXT_MODEL, 3, 0.7);
    
    if (result && result.trim()) {
      return result.trim();
    }
    
    const fallbacks = [
      "Here are 3 solid openers:\n\n1. \"Your [specific detail from profile] caught my eye - tell me the story behind it\"\n2. \"Two truths and a lie: I can cook, I've been skydiving, I think you're cute\"\n3. \"If we were stuck in an elevator, what's the first thing you'd want to know about me?\"",
      "Try this approach:\n\n✨ Start with something specific from their profile\n💬 Ask an open-ended question\n😊 Keep it light and playful\n\nExample: \"That sunset pic is incredible! Beach person or mountain person when you need to escape?\"",
      "Smooth reply options:\n\n• \"Well this just got interesting 😏\"\n• \"I like your style - tell me more\"\n• \"You had my curiosity, now you have my attention\"",
    ];
    
    return fallbacks[Math.floor(Math.random() * fallbacks.length)];
  } catch (error) {
    console.error('Error getting chat advice:', error);
    return "Here's what I'd say:\n\n\"Hey! Your vibe is exactly what I've been looking for. What's the most spontaneous thing you've done lately?\"\n\nThis works because it's confident, shows interest, and starts a fun conversation.";
  }
}

export async function analyzeScreenshotLegacy(base64Image: string): Promise<ScreenshotAnalysis> {
  return analyzeScreenshot({ base64Image });
}

export async function getChatAdviceLegacy(message: string): Promise<string> {
  return getChatAdvice({ message });
}
