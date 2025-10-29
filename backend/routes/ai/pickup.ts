import { Router } from "express"

const r = Router()

r.post("/", async (req: any, res: any) => {
  const body = (req.body as Record<string, unknown>) || {}
  const tone = (body.tone as string) ?? (body.vibe as string) ?? "Playful"
  const spiceLevel = (body.spiceLevel as string) ?? (body.level as string) ?? "Medium"
  const context = (body.context as string) ?? "general"

  const systemPrompt =
    "You are RizzGoat — a confident, funny, and original dating coach. Generate one short, clever, naturally flirty pickup line that matches the tone and spice level. Avoid clichés and never wrap the line in quotes. Output only the line itself, nothing else."

  const userPrompt = `Tone: ${tone}\nSpice Level: ${spiceLevel}\nContext: ${context}.`

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
        temperature: 0.9,
        presence_penalty: 0.6,
        frequency_penalty: 0.5,
        top_p: 0.9,
      }),
    })

    const raw = await response.text()
    let data: any = {}
    try {
      data = JSON.parse(raw)
    } catch {
      console.error("Invalid JSON from OpenAI:", raw)
      return res.status(500).json({ error: "Invalid response from OpenAI" })
    }

    let text = (data?.choices?.[0]?.message?.content ?? "").trim()
    text = text.replace(/^["'“”]+|["'“”]+$/g, "") // strip weird quotes

    if (!response.ok || !text) {
      console.error("Pickup generation failed:", raw)
      return res.status(500).json({ error: "Failed to generate pickup line" })
    }

    res.json({ result: text })
  } catch (err: any) {
    console.error("Pickup route error:", err)
    res.status(500).json({ error: "Failed to generate pickup line" })
  }
})

export default r
