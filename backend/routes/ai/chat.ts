import express, { Request, Response } from "express"
import fetch from "node-fetch"

const router = express.Router()

router.post("/", async (req: Request, res: Response) => {
  const { prompt } = (req.body as { prompt?: string }) || {}

  const systemPrompt = `
You are RizzGoat — a confident, funny, dating AI coach.
Give smooth, natural advice that feels like chatting with a clever friend.
If the user asks for openers, give witty examples.
If they ask for advice, give direct, confident insight with personality.
If they’re flirty, match the energy with charm but no explicit content.
Keep answers concise.
`

  try {
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
          { role: "user", content: prompt ?? "" }
        ]
      })
    })

    const data = await resp.json()
    const text: string = data?.choices?.[0]?.message?.content ?? ""

    if (!resp.ok) {
      return res.status(resp.status).json({ error: text || data })
    }

    res.json({ text: text.trim() })
  } catch (error) {
    console.error("Chat AI error:", error)
    res.status(500).json({ error: "Failed to generate chat response" })
  }
})

export default router

