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

// No hardcoded fallback lines: pickup line generation must always come from the model.


export async function generatePickupLine(params: PickupLineParams): Promise<string> {
  console.log('Generating pickup line with params:', params);
  const variation = `${Math.random().toString(36).slice(2)}_${Date.now()}`;

  // Map tones to the supported vibes
  const tone = (params.tone || 'Playful').toLowerCase();
  const vibe = tone.includes('witty') ? 'Witty' : tone.includes('bold') || tone.includes('confident') ? 'Bold' : 'Playful';

  // Normalize spice names
  const spiceRaw = (params.spiceLevel || 'Cute').toLowerCase();
  const spice = spiceRaw.includes('spicy') ? 'Spicy' : spiceRaw.includes('medium') || spiceRaw.includes('cheeky') ? 'Medium' : 'Cute';

  const system = [
    'You write original, non-cliché pickup lines as a dating wingman.',
    'Follow these rules strictly:',
    '- Output exactly one pickup line (one sentence; at most two).',
    '- Use only fresh model-generated text. No templates, no stock phrases, no internet clichés.',
    '- Match vibe precisely: Playful=cheeky/fun, Witty=clever/wordplay, Bold=confident/direct but respectful.',
    '- If spice is provided, scale intensity: Cute=soft/safe; Medium=teasing/suggestive; Spicy=daring yet consent-aware (still tasteful).',
    '- If context is provided, weave it in naturally.',
    '- No labels, no quotes around the line, no emojis unless they genuinely fit the vibe.',
    '- Never recycle prior wording; ensure fresh imagery each time.',
  ].join(' ');

  const user = [
    `vibe: ${vibe}`,
    `spice: ${spice}`,
    params.context ? `context: ${params.context}` : undefined,
    `variation: ${variation}`,
    'Return only the line, nothing else.'
  ].filter(Boolean).join('\n');

  const messages: TextMessage[] = [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ];

  const result = await callOpenAIChat(messages, TEXT_MODEL);
  const text = (result ?? '').trim();

  if (!text) {
    console.error('Empty pickup line from model');
    throw new Error('Empty model response');
  }

  return text.replace(/^\s+|\s+$/g, '');
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
