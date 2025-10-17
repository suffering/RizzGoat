import { z } from "zod";
import { publicProcedure } from "@/backend/trpc/create-context";

const TEXT_MODEL = "gpt-4o-mini" as const;

export default publicProcedure
  .input(
    z.object({
      tone: z.string(),
      spiceLevel: z.string(),
      context: z.string().optional(),
    })
  )
  .mutation(async ({ input }) => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("Server misconfigured: missing OPENAI_API_KEY");
    }

    const CLICHE_BAN = [
      'are you a magician? because whenever i look at you, everyone else disappears',
      'do you have a map? i keep getting lost in your eyes',
      "is your name google? because you have everything i've been searching for",
      "did it hurt when you fell from heaven",
      "are you a parking ticket? because you've got 'fine' written all over you",
      'is it hot in here or is it just you',
      "are you a camera? because every time i look at you, i smile",
      'are you from tennessee? because you are the only ten i see',
    ];

    const variation = `${Math.random().toString(36).slice(2)}_${Date.now()}`;

    const messages = [
      {
        role: "system",
        content:
          "You are a witty, respectful dating assistant. Generate pickup lines that are clever, tasteful, specific, and PG-13. Avoid clichés and overused lines. Never use crude language, negging, pickup-artist tropes, or disrespect. Keep responses under 20 words. Output only the pickup line, nothing else. Do not repeat prior outputs. If given a variation token, ignore it in the output and use it only to diversify the result.",
      },
      {
        role: "user",
        content: `Tone: ${input.tone}. Spice: ${input.spiceLevel}. Definitions: Cute = sweet, wholesome; Cheeky = playful, flirty; Spicy = bold but still respectful. Context: ${input.context ?? "none"}. Avoid clichés like: ${CLICHE_BAN.slice(0, 4).join(" | ")}. Variation token: ${variation}.`,
      },
    ];

    for (let attempt = 0; attempt < 3; attempt++) {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: TEXT_MODEL,
          messages,
          temperature: 0.9,
          presence_penalty: 0.6,
          frequency_penalty: 0.5,
          top_p: 0.9,
        }),
      });

      if (res.ok) {
        const data = (await res.json()) as any;
        const content = data?.choices?.[0]?.message?.content as string | undefined;
        const cleaned = (content ?? "").trim().replace(/^"|"$/g, "");
        if (!cleaned) continue;
        const normalized = cleaned.toLowerCase();
        const isCliche = CLICHE_BAN.some((c) => normalized.includes(c));
        const tooLong = cleaned.split(/\s+/).length > 20;
        if (isCliche || tooLong) continue;
        return cleaned as string;
      }

      if (res.status === 429 || res.status >= 500) {
        await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
        continue;
      }

      const t = await res.text();
      throw new Error(`OpenAI error: ${res.status} - ${t}`);
    }

    return "Hey there! Mind if I steal a moment of your time?";
  });
