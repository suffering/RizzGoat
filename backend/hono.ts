import { Hono } from "hono";
import { trpcServer } from "@hono/trpc-server";
import { cors } from "hono/cors";
import { appRouter } from "./trpc/app-router";
import { createContext } from "./trpc/create-context";

const app = new Hono();

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
    const body = await c.req.json<{ tone: string; spiceLevel: string; context?: string }>();
    const { tone, spiceLevel, context } = body;
    if (!tone || !spiceLevel) return c.json({ error: 'tone and spiceLevel are required' }, 400);

    const apiKey = process.env.OPENAI_API_KEY || (await import('@/config/secrets')).OPENAI_API_KEY;
    if (!apiKey) return c.json({ error: 'OPENAI_API_KEY not configured' }, 500);

    const CLICHE_BAN = [
      'are you a magician? because whenever i look at you, everyone else disappears',
      'do you have a map? i keep getting lost in your eyes',
      "is your name google? because you have everything i've been searching for",
      'did it hurt when you fell from heaven',
      "are you a parking ticket? because you've got 'fine' written all over you",
      'is it hot in here or is it just you',
      'are you a camera? because every time i look at you, i smile',
      'are you from tennessee? because you are the only ten i see',
    ];

    const variation = `${Math.random().toString(36).slice(2)}_${Date.now()}`;

    const messages = [
      {
        role: 'system',
        content:
          'You are a witty, respectful dating assistant. Generate pickup lines that are clever, tasteful, specific, and PG-13. Avoid clichés and overused lines. Never use crude language, negging, pickup-artist tropes, or disrespect. Keep responses under 20 words. Output only the pickup line, nothing else. Do not repeat prior outputs. If given a variation token, ignore it in the output and use it only to diversify the result.',
      },
      {
        role: 'user',
        content: `Tone: ${tone}. Spice: ${spiceLevel}. Definitions: Cute = sweet, wholesome; Cheeky = playful, flirty; Spicy = bold but still respectful. Context: ${context ?? 'none'}. Avoid clichés like: ${CLICHE_BAN.slice(0, 4).join(' | ')}. Variation token: ${variation}.`,
      },
    ];

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        temperature: 0.9,
        presence_penalty: 0.6,
        frequency_penalty: 0.5,
        top_p: 0.9,
      }),
    });

    if (!res.ok) {
      const t = await res.text();
      return c.json({ error: `OpenAI error: ${res.status} - ${t}` }, 500);
    }

    const data = (await res.json()) as any;
    const content = (data?.choices?.[0]?.message?.content as string | undefined)?.trim().replace(/^"|"$/g, '') ?? '';
    if (!content) return c.json({ result: "Hey there! Mind if I steal a moment of your time?" });
    const normalized = content.toLowerCase();
    const isCliche = CLICHE_BAN.some((c) => normalized.includes(c));
    const tooLong = content.split(/\s+/).length > 20;
    if (isCliche || tooLong) return c.json({ result: "Hey there! Mind if I steal a moment of your time?" });
    return c.json({ result: content });
  } catch (e) {
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
