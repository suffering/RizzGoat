import { Router, Request, Response } from "express"
const r = Router()

r.post("/", async (req: Request, res: Response) => {
  const { level, vibe, context } = (req.body as any) || {}

  const systemPrompt = "You are RizzGoat — a confident, funny, and original dating coach."
  const userPrompt = `Generate a creative pickup line that matches these attributes:\nSpice Level: ${level} (Cute, Medium, Spicy)\nVibe: ${vibe} (Playful, Confident, Wholesome, Bold)\nContext: ${context || "general"}.\nKeep it short, clever, and naturally flirty — avoid generic or overused lines.\nReturn only the line itself.`

  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY ?? ""}`
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ]
    })
  })

  const data = await resp.json()
  const text: string = data?.choices?.[0]?.message?.content ?? ""
  if (!resp.ok) {
    return res.status(resp.status).json({ error: text || data })
  }
  res.type("text/plain").send(text.trim())
})

export default r
