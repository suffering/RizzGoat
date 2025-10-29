import { Router } from "express"

const r = Router()

r.post("/", async (req: any, res: any) => {
  try {
    const { level, vibe, context } = req.body || {}

    const systemPrompt =
      "You are RizzGoat — a confident, funny, and original dating coach."
    const userPrompt = `Generate one short pickup line based on:\nSpice Level: ${level || "Medium"}\nVibe: ${vibe || "Playful"}\nContext: ${context || "general"}.\nMake it original, clever, and natural — avoid clichés. Return only the line.`

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY ?? ""}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error("OpenAI error:", data)
      return res.status(500).json({ error: "Failed to generate pickup line" })
    }

    const text = data?.choices?.[0]?.message?.content?.trim()
    if (!text) throw new Error("Empty response from OpenAI")

    res.json({ text })
  } catch (err: any) {
    console.error("Pickup route error:", err)
    res.status(500).json({ error: "Failed to generate pickup line" })
  }
})

export default r



