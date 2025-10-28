import * as express from "express";
const r = express.Router();

type AnyReq = { body?: any };
type AnyRes = { status: (code: number) => AnyRes; json: (obj: any) => AnyRes };

r.post("/", async (req: AnyReq, res: AnyRes) => {
  try {
    const body = (req.body as any) || {};
    const tone: string | undefined = body.tone ?? body.vibe;
    const spiceLevel: string | undefined = body.spiceLevel ?? body.level;
    const context: string | undefined = body.context;

    const prompt = `
You are RizzGoat — an AI expert in charisma and game.
Create a smooth, original pickup line that fits this style:
Spice Level: ${spiceLevel ?? "Cute"} (Cute, Cheeky, or Spicy)
Vibe: ${tone ?? "Playful"} (Playful, Confident, Wholesome, or Bold)
Context: ${context && String(context).trim().length > 0 ? context : "general"}.

Keep it short, funny, and natural — like something you'd say in real life.
Avoid cringy clichés unless done ironically.
Only respond with the pickup line. No introductions.
    `;

    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY ?? ""}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.9,
        presence_penalty: 0.6,
        frequency_penalty: 0.5,
        top_p: 0.9,
      }),
    });

    const data = (await resp.json()) as any;
    const content = data?.choices?.[0]?.message?.content as string | undefined;
    const cleaned = (content ?? "").trim().replace(/^"|"$/g, "");

    if (!resp.ok || !cleaned) {
      return res.status(resp.ok ? 200 : 500).json({ result: cleaned || "" });
    }

    return res.status(200).json({ result: cleaned });
  } catch (err: any) {
    console.error("[pickup] error", err);
    return res.status(500).json({ error: "Failed to generate pickup line" });
  }
});

export default r;
