import { Router, Request, Response } from "express"
const r = Router()

r.post("/", async (req: Request, res: Response) => {
  const { level, vibe, context } = (req.body as any) || {}

  const prompt = `
You are RizzGoat — an AI expert in charisma and game.
Create a smooth, original pickup line that fits this style:
Spice Level: ${level} (Cute, Medium, or Spicy)
Vibe: ${vibe} (Playful, Confident, Wholesome, or Bold)
Context: ${context || "general"}.

Keep it short, funny, and natural — like something you'd say in real life.
Avoid cringy clichés unless done ironically.
Only respond with the pickup line. No introductions.
  `

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
  })

  const data = await resp.json()
  res.status(resp.ok ? 200 : 500).json(data)
})

export default r
