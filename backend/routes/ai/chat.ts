import { Router } from "express";

const r = Router();

r.post("/", async (req: any, res: any) => {
  const { message, prompt } = (req.body as { message?: string; prompt?: string }) || {};
  const userInput = (typeof message === "string" && message.trim().length > 0)
    ? message.trim()
    : (typeof prompt === "string" ? prompt.trim() : "");

  if (!userInput) {
    return res.status(400).json({ error: "Missing chat message" });
  }

  const systemPrompt =
    "You are RizzGoat — a confident, funny, dating AI coach. Give smooth, natural advice that feels like chatting with a clever friend. If the user asks for openers, give witty examples. If they ask for advice, give direct, confident insight with personality. If they’re flirty, match the energy with charm but no explicit content. Keep replies under 60 words.";

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
          { role: "user", content: userInput },
        ],
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

    const text = data?.choices?.[0]?.message?.content?.trim();
    if (!response.ok || !text) {
      return res.status(500).json({ error: "Failed to generate chat reply" });
    }

    res.json({ result: text });
  } catch (err: any) {
    console.error("Chat error:", err);
    res.status(500).json({ error: "Failed to generate chat reply" });
  }
});

export default r;
