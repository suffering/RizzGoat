import { Router, Request, Response } from "express";

const r = Router();
r.post("/", async (req: Request, res: Response) => {
  const { level, vibe, context } = (req.body as any) || {};
  const prompt = `make a pickup line level=${level} vibe=${vibe} context=${context ?? ""}`;
  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY ?? ""}`
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }]
    })
  });
  const data = await resp.json();
  res.status(resp.ok ? 200 : 500).json(data);
});
export default r;
