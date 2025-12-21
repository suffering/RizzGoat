import { z } from "zod";
import { publicProcedure } from "@/src/trpc/create-context";
import { OPENAI_API_KEY } from "@/config/secrets";

const TEXT_MODEL = "gpt-4o-mini" as const;

function getOpenAIKey(): string {
  const envKey = (process.env.OPENAI_API_KEY ?? "").trim();
  if (envKey.length > 0) {
    return envKey;
  }
  const configKey = (OPENAI_API_KEY ?? "").trim();
  if (configKey.length > 0) {
    return configKey;
  }
  throw new Error("OPENAI_API_KEY not found in environment or secrets file");
}

export default publicProcedure
  .input(
    z.object({
      tone: z.string(),
      spiceLevel: z.string(),
      context: z.string().optional(),
    })
  )
  .mutation(async ({ input }) => {
    const apiKey = getOpenAIKey();

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
          "You are a world-class dating assistant whose sole job is to generate ONE highly realistic pickup line that sounds like it was written by a confident, socially aware human—not an AI, poet, or internet cliché machine. The pickup line must feel natural, modern, casual, and believable, similar in tone to high-quality real-world examples like those found in contemporary dating culture (e.g., The Knot–style lines): clever without being try-hard, flirty without being cheesy, confident without being cringe. Inputs provided are: Spice Level (Cute, Medium, Spicy), Vibe (Playful, Confident, Wholesome, Bold), and optional User Context (interests, lifestyle, personality). If User Context exists, subtly integrate it in a way that feels organic and conversational—never list traits, never say \"I noticed you like…\", and never force it. Cute should feel charming and warm, Medium should feel smooth and flirtatious, and Spicy should be confidently forward with strong tension while remaining tasteful, non-explicit, and App Store safe (no vulgarity, no graphic sexual language). Avoid ALL clichés, overused pickup lines, corny metaphors, forced wordplay, emojis, hashtags, or poetic exaggeration. The line should sound like something someone would actually send—and be proud of sending. When Regenerate is pressed, produce a completely new pickup line with a different angle, structure, and phrasing (never a paraphrase), while still honoring the same Spice Level, Vibe, and User Context. Output ONLY the pickup line text, with no explanations, labels, formatting, or AI references.",
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
