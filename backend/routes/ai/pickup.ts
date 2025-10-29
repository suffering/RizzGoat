import { Router } from "express"

const r = Router()

r.post("/", async (req: any, res: any) => {
  const { level, vibe, context } = req.body || {}

  const systemPrompt =
    "You are RizzGoat, a confident, funny, and tasteful dating AI. Generate pickup lines that sound smooth, playful, and authentic — not cringe or overused."

  const userPrompt = `Create one pickup line based on:
- Spice Level: ${level || "Medium"}
- Vibe: ${vibe || "Playful"}
- Context: ${context || "general"}.
Keep it under 25 words, naturally flirty, and realistic for modern dating apps.`

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
      }),
    })

    const raw = await response.text()
    let data: any = {}
    try {
      data = JSON.parse(raw)
    } catch {
      console.error("Invalid JSON:", raw)
      return res.status(500).json({ error: "Invalid response from OpenAI" })
    }

    const text = data?.choices?.[0]?.message?.content?.trim()
    if (!response.ok || !text)
      return res.status(500).json({ error: "Failed to generate pickup line" })

    res.json({ text })
  } catch (err: any) {
    console.error("Pickup error:", err)
    res.status(500).json({ error: "Failed to generate pickup line" })
  }
})

export default r
