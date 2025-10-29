import { Router } from "express"

const r = Router()

r.post("/", async (req: any, res: any) => {
  const { prompt } = req.body || {}

  if (!prompt)
    return res.status(400).json({ error: "Missing chat prompt" })

  const systemPrompt =
    "You are RizzGoat — a confident, clever, and funny dating coach. Give direct, realistic, and charismatic advice for dating, texting, and relationships. Keep replies under 60 words, fun, and natural."

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
          { role: "user", content: prompt },
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
      return res.status(500).json({ error: "Failed to generate chat reply" })

    res.json({ text })
  } catch (err: any) {
    console.error("Chat error:", err)
    res.status(500).json({ error: "Failed to generate chat reply" })
  }
})

export default r
