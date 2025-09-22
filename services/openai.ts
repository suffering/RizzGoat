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

// Debug: Log the model names to ensure they're correct
console.log('[OpenAI] TEXT_MODEL:', TEXT_MODEL);
console.log('[OpenAI] VISION_MODEL:', VISION_MODEL);

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
      console.log(`[OpenAI] Calling model: "${model}" (attempt ${attempt + 1}/${retries + 1})`);
      
      // o1-preview models don't support temperature and have different requirements
      const isO1Model = model.startsWith('o1');
      const requestBody: any = {
        model,
        messages,
      };
      
      // Only add temperature for non-o1 models
      if (!isO1Model) {
        requestBody.temperature = temperature;
      }
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify(requestBody),
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

export async function generatePickupLine(params: PickupLineParams): Promise<string> {
  try {
    console.log('[PickupLine] Generating pickup line with params:', params);
    const variation = `${Math.random().toString(36).slice(2)}_${Date.now()}`;
    const randomSeed = Math.floor(Math.random() * 10000);
    
    const messages: TextMessage[] = [
      {
        role: 'system',
        content:
          'You are a creative pickup line generator. Output exactly ONE pickup line, plain text only.\n\n' +
          'Behavior:\n' +
          '- Do not stream or emit partial text. Do not echo instructions. Do not add quotes or labels.\n' +
          '- If you are not finished, output NOTHING.\n' +
          '- When finished, output a single pickup line (1–2 sentences) that matches both the selected Vibe and Spice.\n' +
          '- Never use clichés or common internet lines. Always be original and vary word choice each run.\n' +
          '- If optional user context is provided, weave it in naturally.\n' +
          '- For Spicy, be daring and freaky but witty and respectful.\n\n' +
          'Vibes:\n' +
          '- Playful: cheeky, light, and fun.\n' +
          '- Confident: smooth, self-assured, charming.\n' +
          '- Wholesome: sweet, warm, and genuine.\n' +
          '- Bold: daring, flirty, direct.\n\n' +
          'Spice Levels:\n' +
          '- Cute: safe, soft, and lighthearted.\n' +
          '- Medium: more suggestive, teasing, playful.\n' +
          '- Spicy: very bold, freaky, edgy, and provocative — but still witty and respectful.\n\n' +
          'Keep it short and chat-ready (1–2 sentences max). Each run must produce a different style and word choice — maximize variety with randomness and creativity.\n\n' +
          'Output: one line only, no prefixes/suffixes, no markdown.',
      },
      {
        role: 'user',
        content: `Generate a ${params.tone} pickup line with ${params.spiceLevel} spice level.${params.context ? ` Context: ${params.context}.` : ''} Seed: ${randomSeed}. Variation: ${variation}. Output ONLY the pickup line.`,
      },
    ];

    console.log('[PickupLine] Making API call to OpenAI...');
    const lvl = params.spiceLevel.toLowerCase();
    const temp = lvl === 'spicy' ? 1.0 : lvl === 'medium' ? 0.9 : 0.8;
    const result = await callOpenAIChat(messages, TEXT_MODEL, 5, temp);

    if (result && result.trim()) {
      const cleanResult = result.trim().replace(/^["']|["']$/g, ''); // Remove quotes if present
      console.log('[PickupLine] Successfully generated:', cleanResult);
      return cleanResult;
    }

    console.log('[PickupLine] API returned empty, throwing error');
    throw new Error('Failed to generate pickup line from API');
  } catch (error) {
    console.error('[PickupLine] Error generating pickup line:', error);
    throw error;
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
    const result = await callOpenAIChat(messages, VISION_MODEL, 5, 0.8);
    if (result && result.trim()) return result.trim();
    
    console.log('Screenshot pickup line generation failed, retrying');
    throw new Error('Failed to generate pickup line from screenshot');
  } catch (error) {
    console.error('Error generating pickup line from screenshot:', error);
    throw error;
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

    let result = await callOpenAIChat(messages, VISION_MODEL, 5, 0.6);
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
      result = await callOpenAIChat(retryMessages, VISION_MODEL, 5, 0.5);
      parsed = extractJSON(result);
    }

    if (parsed && isScreenshotAnalysis(parsed)) {
      return parsed;
    }

    console.log('Screenshot analysis failed, retrying');
    throw new Error('Failed to analyze screenshot');
  } catch (error) {
    console.error('Error analyzing screenshot:', error);
    throw error;
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
    const result = await callOpenAIChat(messages, TEXT_MODEL, 5, 0.7);
    
    if (result && result.trim()) {
      return result.trim();
    }
    
    console.log('Chat advice generation failed, retrying');
    throw new Error('Failed to generate chat advice');
  } catch (error) {
    console.error('Error getting chat advice:', error);
    throw error;
  }
}

export async function analyzeScreenshotLegacy(base64Image: string): Promise<ScreenshotAnalysis> {
  return analyzeScreenshot({ base64Image });
}

export async function getChatAdviceLegacy(message: string): Promise<string> {
  return getChatAdvice({ message });
}