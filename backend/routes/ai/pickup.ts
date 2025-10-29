import { Router } from "express";

const r = Router();

r.post("/", async (req: any, res: any) => {
  const body = (req.body as Record<string, unknown>) || {};
  const tone = (body.tone as string) ?? (body.vibe as string) ?? "Playful";
  const spiceLevel = (body.spiceLevel as string) ?? (body.level as string) ?? "Medium";
  const context = (body.context as string) ?? "general";

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

  const systemPrompt =
    "You are a witty, respectful dating assistant. Generate pickup lines that are clever, tasteful, specific, and PG-13. Avoid clichés and overused lines. Never use crude language, negging, pickup-artist tropes, or disrespect. Keep responses under 20 words. Output only the pickup line, nothing else. Do not repeat prior outputs. If given a variation token, ignore it in the output and use it only to diversify the result.";

  const userPrompt = `Tone: ${tone}. Spice: ${spiceLevel}. Definitions: Cute = sweet, wholesome; Cheeky = playful, flirty; Spicy = bold but still respectful. Context: ${context}. Avoid clichés like: ${CLICHE_BAN.slice(0, 4).join(" | ")}. Variation token: ${variation}.`;

  try {
    for (let attempt = 0; attempt < 3; attempt++) {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY ?? ""}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.9,
          presence_penalty: 0.6,
          frequency_penalty: 0.5,
          top_p: 0.9,
        }),
      });

      if (!response.ok) {
        if (response.status === 429 || response.status >= 500) {
          await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
          continue;
        }
        const t = await response.text();
        console.error("Pickup generation failed:", t);
        return res.status(500).json({ error: "Failed to generate pickup line" });
      }

      const data = (await response.json()) as any;
      let text = (data?.choices?.[0]?.message?.content ?? "").trim();
      text = text.replace(/^["'“”]+|["'“”]+$/g, "");

      const normalized = text.toLowerCase();
      const isCliche = CLICHE_BAN.some((c) => normalized.includes(c));
      const tooLong = text.split(/\s+/).length > 20;

      if (!text || isCliche || tooLong) {
        if (attempt < 2) continue;
        return res.json({ result: "Hey there! Mind if I steal a moment of your time?" });
      }

      return res.json({ result: text });
    }
  } catch (err: any) {
    console.error("Pickup route error:", err);
    return res.status(500).json({ error: "Failed to generate pickup line" });
  }
});

export default r;
