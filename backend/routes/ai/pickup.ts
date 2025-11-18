import { Router } from "express";

const r = Router();

const sanitizeInput = (value: unknown, fallback: string): string => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.length > 0) {
      return trimmed;
    }
  }
  return fallback;
};

r.post("/", async (req: any, res: any) => {
  const body = (req.body as Record<string, unknown>) ?? {};
  const vibe = sanitizeInput(body.tone ?? body.vibe, "Playful");
  const spice = sanitizeInput(body.spiceLevel ?? body.level, "Cute");
  const contextRaw = typeof body.context === "string" ? body.context.trim() : "";
  const context = contextRaw.length > 0 ? contextRaw : "general";
  const variation = `${Math.random().toString(36).slice(2)}_${Date.now()}`;

  const systemPrompt =
    "You are RizzGoat — a confident, funny, and original dating coach. Generate one creative pickup line that feels natural in real life. Keep it under 22 words, clever, and PG-13. Avoid clichés, negs, or disrespect. Return only the pickup line text.";

  const userPrompt = `Spice Level: ${spice}. Vibe: ${vibe}. Context: ${context}. If context is "general", keep it versatile. Use the details to tailor the line. Variation token: ${variation}.`;

  try {
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
        frequency_penalty: 0.4,
        top_p: 0.9,
      }),
    });

    const raw = await response.text();
    let data: any = {};
    try {
      data = JSON.parse(raw);
    } catch {
      console.error("Pickup line invalid JSON:", raw);
      return res.status(500).json({ error: "Invalid response from OpenAI" });
    }

    const content = data?.choices?.[0]?.message?.content;
    const line = typeof content === "string" ? content.trim() : "";

    if (!response.ok || line.length === 0) {
      console.error("Pickup generation failed:", raw);
      return res.status(500).json({ error: "Failed to generate pickup line" });
    }

    const cleaned = line.replace(/^["'“”]+|["'“”]+$/g, "").trim();
    return res.json({ result: cleaned });
  } catch (err: any) {
    console.error("Pickup route error:", err);
    return res.status(500).json({ error: "Failed to generate pickup line" });
  }
});

export default r;
