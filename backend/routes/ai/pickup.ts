import { Router } from "express";

const r = Router();

const VIBES = ["Playful", "Confident", "Wholesome", "Bold"] as const;
const SPICE_LEVELS = ["Cute", "Medium", "Spicy"] as const;
const CLICHE_PHRASES = [
  "are you a magician? because whenever i look at you, everyone else disappears",
  "do you have a map? i keep getting lost in your eyes",
  "is your name google? because you have everything i've been searching for",
  "did it hurt when you fell from heaven",
  "are you a parking ticket? because you've got 'fine' written all over you",
  "is it hot in here or is it just you",
  "are you a camera? because every time i look at you, i smile",
  "are you from tennessee? because you are the only ten i see",
] as const;

type VibeOption = typeof VIBES[number];
type SpiceOption = typeof SPICE_LEVELS[number];

const selectOption = <T extends readonly string[]>(value: unknown, options: T, fallback: T[number]): T[number] => {
  if (typeof value !== "string") {
    return fallback;
  }
  const normalized = value.trim().toLowerCase();
  const match = options.find((option) => option.toLowerCase() === normalized);
  return match ?? fallback;
};

const sanitizeContext = (value: unknown): string => {
  if (typeof value !== "string") {
    return "";
  }
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (trimmed.length === 0) {
    return "";
  }
  return trimmed.slice(0, 240);
};

const hasCliche = (line: string): boolean => {
  const normalized = line.toLowerCase();
  return CLICHE_PHRASES.some((phrase) => normalized.includes(phrase));
};

r.post("/", async (req: any, res: any) => {
  const rawBody = (req?.body ?? {}) as unknown;
  const body = (typeof rawBody === "object" && rawBody !== null ? rawBody : {}) as Record<string, unknown>;
  const vibe = selectOption(body.tone ?? body.vibe, VIBES, "Playful") as VibeOption;
  const spice = selectOption(body.spiceLevel ?? body.level, SPICE_LEVELS, "Cute") as SpiceOption;
  const context = sanitizeContext(body.context);
  const variation = `${Math.random().toString(36).slice(2)}_${Date.now()}`;

  const systemPrompt =
    "You are RizzGoat—the exclusive pickup-line generator for the RizzGoat app. Obey these rules: output exactly one pickup line with no quotes or bullet points; keep it under 24 words; ensure it feels human, fresh, and socially calibrated; adjust heat strictly by spice level (Cute = sweet and innocent, Medium = clever and suggestive, Spicy = bold and sultry but classy); set personality strictly by vibe (Playful = mischievous humor, Confident = smooth and magnetic, Wholesome = warm and romantic, Bold = assertive and fearless). When vibe is Bold, increase intensity even if spice is lower. For Spicy + Bold, deliver maximum heat that stays elegant. For Medium + Bold, make it charged and daring. For Cute + Bold, keep it teasing yet sweet. For Wholesome + Spicy, make it romantic with a seductive undercurrent. Seamlessly weave provided context only if it fits naturally. Never repeat clichés or anything from the banned list. Never explain yourself.";

  const userPrompt = [
    `Spice Level: ${spice}.`,
    `Vibe: ${vibe}.`,
    `Context: ${context.length > 0 ? context : "none"}.`,
    `Banned lines: ${CLICHE_PHRASES.map((phrase) => phrase.replace(/"/g, "'" )).join(" | ")}.`,
    `Variation token: ${variation}.`,
    "Return only the final pickup line." ,
  ].join(" ");

  console.log("[pickup-route] generating", { spice, vibe, hasContext: context.length > 0 });

  const payload = {
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.95,
    presence_penalty: 0.7,
    frequency_penalty: 0.4,
    top_p: 0.9,
  };

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY ?? ""}`,
        },
        body: JSON.stringify({
          ...payload,
          messages: [
            payload.messages[0],
            { role: "user", content: `${userPrompt} Attempt: ${attempt + 1}.` },
          ],
        }),
      });

      const raw = await response.text();
      if (!response.ok) {
        console.error("[pickup-route] openai error", response.status, raw);
        if (response.status >= 500 || response.status === 429) {
          continue;
        }
        return res.status(500).json({ error: "Failed to generate pickup line" });
      }

      let data: any = {};
      try {
        data = JSON.parse(raw);
      } catch (parseError) {
        console.error("[pickup-route] invalid json", raw, parseError);
        continue;
      }

      const line = (data?.choices?.[0]?.message?.content as string | undefined)?.trim() ?? "";
      const cleaned = line.replace(/^["'“”`]+|["'“”`]+$/g, "").replace(/\s+/g, " ").trim();

      if (cleaned.length === 0 || cleaned.split(" ").length > 24 || hasCliche(cleaned)) {
        console.warn("[pickup-route] retrying due to invalid line", { cleaned });
        continue;
      }

      return res.json({ result: cleaned });
    } catch (error) {
      console.error("[pickup-route] attempt failed", error);
    }
  }

  return res.status(500).json({ error: "Failed to generate pickup line" });
});

export default r;
