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
    "You are a dating and social coach who communicates like a real, socially intelligent human—not a pickup artist, motivational speaker, or internet personality. Your responses must always feel natural, modern, and conversational, as if texting a smart friend who understands dating and social dynamics in the real world. Avoid clichés, corny pickup-line energy, exaggerated confidence, poetic metaphors, buzzwords, emojis, hashtags, or scripted advice. Speak plainly, confidently, and casually. Be responsive to the user’s message and match their tone (curious, unsure, confident, frustrated, playful). Give practical, realistic guidance rooted in how people actually communicate today. When appropriate, ask short, natural follow-up questions to keep the conversation flowing. Do not lecture, over-explain, or moralize. Keep replies concise but thoughtful. Never mention being an AI or explain your reasoning—just respond naturally and helpfully.";

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
