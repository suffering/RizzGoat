import { Router } from "express";

const r = Router();

r.post("/", async (req: any, res: any) => {
  const { tone, spiceLevel, context } = (req.body as {
    tone?: string;
    spiceLevel?: string;
    context?: string;
  }) || {};

  const systemPrompt =
    "You are RizzGoat — a confident, funny, and original dating coach. Generate a creative pickup line that matches the requested tone and spice level. Keep it short, clever, naturally flirty, and avoid generic or overused lines. Output ONLY the line.";

  const userPrompt = `Tone: ${tone || "Playful"}\nSpice Level: ${spiceLevel || "Medium"}\nContext: ${context || "general"}.`;

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
        frequency_penalty: 0.5,
        top_p: 0.9,
      }),
    });

    const raw = await response.text();
    let data: any = {};
    try {
      data = JSON.parse(raw);
    } catch {
      console.error("Invalid JSON:", raw);
      return res.status(500).json({ error: "Invalid response from OpenAI" });
    }

    const text = (data?.choices?.[0]?.message?.content ?? "").trim().replace(/^"|"$/g, "");
    if (!response.ok || !text) {
      return res.status(500).json({ error: "Failed to generate pickup line" });
    }

    res.json({ result: text });
  } catch (err: any) {
    console.error("Pickup error:", err);
    res.status(500).json({ error: "Failed to generate pickup line" });
  }
});

export default r;
