import { z } from "zod";
import { publicProcedure } from "../../../create-context";
import { OPENAI_API_KEY } from "@/config/secrets";

const VISION_MODEL = "gpt-4o-mini" as const;

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

const screenshotAdvisorInputSchema = z.object({
  base64Image: z.string(),
  amplifyBold: z.boolean().optional(),
  targetType: z.enum(["Safe", "Witty", "Bold"]).optional(),
});
type ScreenshotAdvisorInput = z.infer<typeof screenshotAdvisorInputSchema>;

type ScreenshotAnalysis = {
  safe: { text: string; rationale: string };
  witty: { text: string; rationale: string };
  bold: { text: string; rationale: string };
};

function extractJSON(text: string): ScreenshotAnalysis | null {
  try {
    const trimmed = text.trim();
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      return JSON.parse(trimmed) as ScreenshotAnalysis;
    }
  } catch {}
  try {
    const m = text.match(/```(?:json)?\n([\s\S]*?)```/i);
    if (m && m[1]) return JSON.parse(m[1]) as ScreenshotAnalysis;
  } catch {}
  try {
    const first = text.indexOf("{");
    const last = text.lastIndexOf("}");
    if (first >= 0 && last > first) return JSON.parse(text.slice(first, last + 1)) as ScreenshotAnalysis;
  } catch {}
  return null;
}

export default publicProcedure
  .input(screenshotAdvisorInputSchema)
  .mutation(async ({ input }: { input: ScreenshotAdvisorInput }) => {
    const apiKey = getOpenAIKey();

    const variation = `${Math.random().toString(36).slice(2)}_${Date.now()}`;
    const boldNote = input.amplifyBold
      ? " Make the Bold option extra spicy, audacious, and flirty (still PG-13, respectful). Increase boldness by ~20% vs normal."
      : "";
    const focusNote = input.targetType
      ? ` Focus especially on the ${input.targetType} option: optimize it for the user's intent and ensure it is the strongest suggestion.`
      : "";

    const baseSystem =
      "You are a dating conversation analyst. Analyze the screenshot and provide 3 reply suggestions: Safe (friendly, low-risk), Witty (clever, engaging), and Bold (confident, flirty but respectful). Each reply should be under 30 words with a brief rationale. Do not repeat prior outputs. If given a variation token, ignore it in the output and use it only to diversify the result." +
      boldNote +
      focusNote;

    const messages = [
      { role: "system", content: [{ type: "text", text: baseSystem }] },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Analyze this dating conversation screenshot and provide 3 reply options with rationales. Variation token: ${variation}. Return ONLY raw JSON with this exact shape and keys: {"safe": {"text": "", "rationale": ""}, "witty": {"text": "", "rationale": ""}, "bold": {"text": "", "rationale": ""}}`,
          },
          { type: "image_url", image_url: { url: `data:image/png;base64,${input.base64Image}` } },
        ],
      },
    ];

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model: VISION_MODEL, messages }),
    });

    if (!res.ok) {
      const t = await res.text();
      throw new Error(`OpenAI error: ${res.status} - ${t}`);
    }

    const data = (await res.json()) as any;
    const content = data?.choices?.[0]?.message?.content as string | undefined;
    const parsed = content ? extractJSON(content) : null;

    return (
      parsed ?? {
        safe: { text: "That's interesting! Tell me more about that.", rationale: "Keeps conversation flowing without risk" },
        witty: { text: "Well, this conversation just got interesting 😏", rationale: "Playful and engaging" },
        bold: { text: "I like where this is going. Coffee tomorrow?", rationale: "Confident and moves things forward" },
      }
    );
  });
