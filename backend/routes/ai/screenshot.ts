import { Router } from "express";


const r = Router();

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

r.post("/", async (req: any, res: any) => {
  const { base64Image, amplifyBold, targetType } = (req.body as {
    base64Image?: string;
    amplifyBold?: boolean;
    targetType?: "Safe" | "Witty" | "Bold";
  }) || {};

  if (!base64Image) {
    return res.status(400).json({ error: "Missing base64Image" });
  }

  const boldNote = amplifyBold
    ? " Make the Bold option extra spicy, audacious, and flirty (still PG-13, respectful). Increase boldness by ~20% vs normal."
    : "";
  const focusNote = targetType
    ? ` Focus especially on the ${targetType} option: optimize it for the user's intent and ensure it is the strongest suggestion.`
    : "";

  const system =
    "You are RizzGoat, a smooth, clever, dating assistant. Analyze screenshots of conversations and give the best possible next reply. Provide 3 reply suggestions: Safe (friendly, low-risk), Witty (clever, engaging), and Bold (confident, flirty but respectful). Each reply should be under 30 words with a brief rationale. Return ONLY raw JSON with this exact shape and keys: {\"safe\": {\"text\": \"\", \"rationale\": \"\"}, \"witty\": {\"text\": \"\", \"rationale\": \"\"}, \"bold\": {\"text\": \"\", \"rationale\": \"\"}}." +
    boldNote +
    focusNote;

  const variation = `${Math.random().toString(36).slice(2)}_${Date.now()}`;

  const messages = [
    { role: "system", content: system },
    {
      role: "user",
      content: [
        { type: "text", text: `Analyze this dating conversation screenshot and provide 3 reply options with rationales. Variation token: ${variation}.` },
        { type: "image_url", image_url: { url: `data:image/png;base64,${base64Image}` } },
      ],
    },
  ];

  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY ?? ""}`,
    },
    body: JSON.stringify({ model: "gpt-4o-mini", messages }),
  });

  const rawText = await resp.text();
  if (!resp.ok) {
    return res.status(resp.status).send(rawText);
  }
  let data: any = {};
  try { data = JSON.parse(rawText); } catch {}
  const content: string | undefined = data?.choices?.[0]?.message?.content;
  const parsed = content ? extractJSON(content) : null;

  const result: ScreenshotAnalysis = parsed ?? {
    safe: { text: "That's interesting! Tell me more about that.", rationale: "Keeps conversation flowing without risk" },
    witty: { text: "Well, this conversation just got interesting 😏", rationale: "Playful and engaging" },
    bold: { text: "I like where this is going. Coffee tomorrow?", rationale: "Confident and moves things forward" },
  };

  res.json({ result, raw: data });
});

export default r;
