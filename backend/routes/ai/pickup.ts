import express, { Request, Response } from "express"
import fetch from "node-fetch"

const router = express.Router()

router.post("/", async (req: Request, res: Response) => {
  const { level, vibe, context } = (req.body as any) || {}

  const systemPrompt = "You are RizzGoat — a confident, funny, and original dating coach."
  const userPrompt = `Generate a creative pickup line that matches these attributes:
Spice Level: ${level} (Cute, Medium, Spicy)
Vibe: ${vibe} (Playful, Confident, Wholesome, Bold)
Context: ${context || "general"}.
Keep it short, clever, and naturally flirty — avoid generic or overused lines.
Return only the line itself.`

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
          { role: "user", content: userPrompt }
        ]
      })
    })

    const data: any = await resp.json()
    const text: string = data?.choices?.[0]?.message?.content ?? ""

    if (!resp.ok) {
      return res.status(resp.status).json({ error: text || data })
    }

    // ✅ Return valid JSON (Rork expects JSON, not plain text)
    res.json({ text: text.trim() })
  } catch (error) {
    console.error("Pickup line error:", error)
    res.status(500).json({ error: "Failed to generate pickup line" })
  }
})

export default router


