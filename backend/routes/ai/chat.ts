import { Router } from "express"

const r = Router()

r.post("/", async (req: any, res: any) => {
  try {
    const { prompt } = req.body || {}

    const systemPrompt =
      "You are RizzGoat — a confident, funny, dating AI coach. Respond with smooth, natural advice like a clever friend. Keep replies short, charming, and natural. Avoid explicit content."

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
          { role: "user", content: prompt ?? "" },
        ],
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error("OpenAI error:", data)
      return res.status(500).json({ error: "Failed to generate chat reply" })
    }

    const text = data?.choices?.[0]?.message?.content?.trim()
    if (!text) throw new Error("Empty response from OpenAI")

    res.json({ text })
  } catch (err: any) {
    console.error("Chat route error:", err)
    res.status(500).json({ error: "Failed to generate chat reply" })
  }
})

export default r

