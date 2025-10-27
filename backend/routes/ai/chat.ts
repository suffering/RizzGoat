import { Router, Request, Response } from "express";

const r = Router();
r.post("/", async (req: Request, res: Response) => {
  const { message, prompt } = (req.body as { message?: string; prompt?: string }) || {};
  const userText = message ?? prompt ?? "";

  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY ?? ""}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: userText }],
    }),
  });

  const data = await resp.json();
  const result: string = data?.choices?.[0]?.message?.content ?? "";
  res.status(resp.ok ? 200 : 500).json({ result, raw: data });
});
export default r;
