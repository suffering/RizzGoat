import { Hono } from "hono";
import { trpcServer } from "@hono/trpc-server";
import { cors } from "hono/cors";
import { appRouter } from "./trpc/app-router";
import { createContext } from "./trpc/create-context";

const app = new Hono();

const PICKUP_VIBES = ["Playful", "Confident", "Wholesome", "Bold"] as const;
const PICKUP_SPICE_LEVELS = ["Cute", "Medium", "Spicy"] as const;
const PICKUP_CLICHES = [
  "are you a magician? because whenever i look at you, everyone else disappears",
  "do you have a map? i keep getting lost in your eyes",
  "is your name google? because you have everything i've been searching for",
  "did it hurt when you fell from heaven",
  "are you a parking ticket? because you've got 'fine' written all over you",
  "is it hot in here or is it just you",
  "are you a camera? because every time i look at you, i smile",
  "are you from tennessee? because you are the only ten i see",
] as const;

type PickupVibe = typeof PICKUP_VIBES[number];
type PickupSpice = typeof PICKUP_SPICE_LEVELS[number];

const selectPickupOption = <T extends readonly string[]>(value: unknown, options: T, fallback: T[number]): T[number] => {
  if (typeof value !== "string") {
    return fallback;
  }
  const normalized = value.trim().toLowerCase();
  const match = options.find((option) => option.toLowerCase() === normalized);
  return match ?? fallback;
};

const sanitizePickupContext = (value: unknown): string => {
  if (typeof value !== "string") {
    return "";
  }
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (trimmed.length === 0) {
    return "";
  }
  return trimmed.slice(0, 240);
};

const pickupHasCliche = (line: string): boolean => {
  const normalized = line.toLowerCase();
  return PICKUP_CLICHES.some((phrase) => normalized.includes(phrase));
};

const pickupWordCount = (line: string): number => line.trim().split(/\s+/).length;

app.use("*", cors());

app.use(
  "/api/trpc/*",
  trpcServer({
    router: appRouter,
    createContext,
  })
);

app.get("/", (c) => {
  return c.json({ status: "ok", message: "API is running" });
});

app.get("/api", (c) => {
  return c.json({ status: "ok", message: "API root" });
});

app.post('/api/ai/chat', async (c) => {
  try {
    const body = await c.req.json<{ message?: string }>();
    const message = body?.message ?? '';
    if (!message) return c.json({ error: 'message is required' }, 400);

    const apiKey = process.env.OPENAI_API_KEY || (await import('@/config/secrets')).OPENAI_API_KEY;
    if (!apiKey) return c.json({ error: 'OPENAI_API_KEY not configured' }, 500);

    const variation = `${Math.random().toString(36).slice(2)}_${Date.now()}`;
    const messages = [
      {
        role: 'system',
        content:
          'You are RizzGoat, a friendly and knowledgeable dating coach. Provide structured advice in this format:\n\n💬 Say this:\n[1-2 line suggestion]\n\n🔄 If they respond with X:\n[Conditional advice]\n\n⚠️ Pitfalls to avoid:\n• [Bullet point]\n• [Bullet point]\n\nKeep advice practical, respectful, and confidence-building. Do not repeat prior outputs. If given a variation token, ignore it in the output and use it only to diversify the result.',
      },
      { role: 'user', content: `${message}\n\nVariation token: ${variation}` },
    ];

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model: 'gpt-4o-mini', messages }),
    });

    if (!res.ok) {
      const t = await res.text();
      return c.json({ error: `OpenAI error: ${res.status} - ${t}` }, 500);
    }

    const data = (await res.json()) as any;
    const content = data?.choices?.[0]?.message?.content as string | undefined;
    return c.json({ result: content ?? "I'm here to help! Could you provide more details about your situation?" });
  } catch (e) {
    return c.json({ error: 'AI request failed' }, 500);
  }
});

app.post('/api/ai/pickup', async (c) => {
  try {
    const body = await c.req.json<{ tone?: string; spiceLevel?: string; context?: string; vibe?: string; level?: string }>();
    const toneInput = body?.tone ?? body?.vibe;
    const spiceInput = body?.spiceLevel ?? body?.level;

    if (!toneInput || !spiceInput) {
      return c.json({ error: 'tone and spiceLevel are required' }, 400);
    }

    const apiKey = process.env.OPENAI_API_KEY || (await import('@/config/secrets')).OPENAI_API_KEY;
    if (!apiKey) {
      return c.json({ error: 'OPENAI_API_KEY not configured' }, 500);
    }

    const vibe = selectPickupOption(toneInput, PICKUP_VIBES, 'Playful') as PickupVibe;
    const spice = selectPickupOption(spiceInput, PICKUP_SPICE_LEVELS, 'Cute') as PickupSpice;
    const context = sanitizePickupContext(body?.context);
    const variation = `${Math.random().toString(36).slice(2)}_${Date.now()}`;

    const systemPrompt =
      'You are RizzGoat—the exclusive pickup-line generator for the RizzGoat app. Obey these rules: output exactly one pickup line with no quotes or bullet points; keep it under 24 words; ensure it feels human, fresh, and socially calibrated; adjust heat strictly by spice level (Cute = sweet and innocent, Medium = clever and suggestive, Spicy = bold and sultry but classy); set personality strictly by vibe (Playful = mischievous humor, Confident = smooth and magnetic, Wholesome = warm and romantic, Bold = assertive and fearless). When vibe is Bold, increase intensity even if spice is lower. For Spicy + Bold, deliver maximum heat that stays elegant. For Medium + Bold, make it charged and daring. For Cute + Bold, keep it teasing yet sweet. For Wholesome + Spicy, make it romantic with a seductive undercurrent. Seamlessly weave provided context only if it fits naturally. Never repeat clichés or anything from the banned list. Never explain yourself.';

    const userPromptParts = [
      `Spice Level: ${spice}.`,
      `Vibe: ${vibe}.`,
      `Context: ${context.length > 0 ? context : 'none'}.`,
      `Banned lines: ${PICKUP_CLICHES.map((phrase) => phrase.replace(/"/g, "'")).join(' | ')}.`,
      `Variation token: ${variation}.`,
      'Return only the final pickup line.',
    ];

    console.log('[pickup-hono] generating', { spice, vibe, hasContext: context.length > 0 });

    const payload = {
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPromptParts.join(' ') },
      ],
      temperature: 0.95,
      presence_penalty: 0.7,
      frequency_penalty: 0.4,
      top_p: 0.9,
    };

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          ...payload,
          messages: [
            payload.messages[0],
            { role: 'user', content: `${userPromptParts.join(' ')} Attempt: ${attempt + 1}.` },
          ],
        }),
      });

      const text = await res.text();
      if (!res.ok) {
        console.error('[pickup-hono] openai error', res.status, text);
        if (res.status === 429 || res.status >= 500) {
          await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
          continue;
        }
        return c.json({ error: 'Failed to generate pickup line' }, 500);
      }

      let data: any = {};
      try {
        data = JSON.parse(text);
      } catch (error) {
        console.error('[pickup-hono] invalid json', text, error);
        continue;
      }

      const line = (data?.choices?.[0]?.message?.content as string | undefined)?.trim() ?? '';
      const cleaned = line.replace(/^["'“”`]+|["'“”`]+$/g, '').replace(/\s+/g, ' ').trim();

      if (cleaned.length === 0) {
        continue;
      }
      if (pickupWordCount(cleaned) > 24 || pickupHasCliche(cleaned)) {
        console.warn('[pickup-hono] retrying due to invalid line', { cleaned });
        continue;
      }

      return c.json({ result: cleaned });
    }

    return c.json({ error: 'Failed to generate pickup line' }, 500);
  } catch (e) {
    console.error('[pickup-hono] exception', e);
    return c.json({ error: 'AI request failed' }, 500);
  }
});

app.post('/api/ai/screenshot', async (c) => {
  try {
    const body = await c.req.json<{ base64Image: string; amplifyBold?: boolean; targetType?: 'Safe' | 'Witty' | 'Bold' }>();
    const { base64Image, amplifyBold, targetType } = body;
    if (!base64Image) return c.json({ error: 'base64Image is required' }, 400);

    const apiKey = process.env.OPENAI_API_KEY || (await import('@/config/secrets')).OPENAI_API_KEY;
    if (!apiKey) return c.json({ error: 'OPENAI_API_KEY not configured' }, 500);

    const variation = `${Math.random().toString(36).slice(2)}_${Date.now()}`;
    const boldNote = amplifyBold ? ' Make the Bold option extra spicy, audacious, and flirty (still PG-13, respectful). Increase boldness by ~20% vs normal.' : '';
    const focusNote = targetType ? ` Focus especially on the ${targetType} option: optimize it for the user's intent and ensure it is the strongest suggestion.` : '';

    const baseSystem =
      'You are a dating conversation analyst. Analyze the screenshot and provide 3 reply suggestions: Safe (friendly, low-risk), Witty (clever, engaging), and Bold (confident, flirty but respectful). Each reply should be under 30 words with a brief rationale. Do not repeat prior outputs. If given a variation token, ignore it in the output and use it only to diversify the result.' +
      boldNote +
      focusNote;

    const messages = [
      { role: 'system', content: [{ type: 'text', text: baseSystem }] },
      {
        role: 'user',
        content: [
          { type: 'text', text: `Analyze this dating conversation screenshot and provide 3 reply options with rationales. Variation token: ${variation}. Return ONLY raw JSON with this exact shape and keys: {"safe": {"text": "", "rationale": ""}, "witty": {"text": "", "rationale": ""}, "bold": {"text": "", "rationale": ""}}` },
          { type: 'image_url', image_url: { url: `data:image/png;base64,${base64Image}` } },
        ],
      },
    ];

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: 'gpt-4o-mini', messages }),
    });

    if (!res.ok) {
      const t = await res.text();
      return c.json({ error: `OpenAI error: ${res.status} - ${t}` }, 500);
    }

    const data = (await res.json()) as any;
    const content = data?.choices?.[0]?.message?.content as string | undefined;

    let parsed: any = null;
    if (content) {
      try {
        const trimmed = content.trim();
        if (trimmed.startsWith('{') && trimmed.endsWith('}')) parsed = JSON.parse(trimmed);
      } catch {}
      if (!parsed) {
        try {
          const m = content.match(/```(?:json)?\n([\s\S]*?)```/i);
          if (m && m[1]) parsed = JSON.parse(m[1]);
        } catch {}
      }
      if (!parsed) {
        try {
          const first = content.indexOf('{');
          const last = content.lastIndexOf('}');
          if (first >= 0 && last > first) parsed = JSON.parse(content.slice(first, last + 1));
        } catch {}
      }
    }

    const fallback = {
      safe: { text: "That's interesting! Tell me more about that.", rationale: 'Keeps conversation flowing without risk' },
      witty: { text: 'Well, this conversation just got interesting 😏', rationale: 'Playful and engaging' },
      bold: { text: 'I like where this is going. Coffee tomorrow?', rationale: 'Confident and moves things forward' },
    };

    return c.json({ result: parsed ?? fallback });
  } catch (e) {
    return c.json({ error: 'AI request failed' }, 500);
  }
});

export default app;
