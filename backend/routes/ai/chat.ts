import { Router, Request, Response } from "express"
const r = Router()

r.post("/", async (req: Request, res: Response) => {
  const { prompt } = (req.body as { prompt?: string }) || {}

  const systemPrompt = `
You are RizzGoat — a confident, funny, and clever AI dating coach.
You help people with texting game, dating advice, and conversation openers.
Respond naturally, conversationally, and adapt your tone to the user:
- If they ask for openers → give smooth, fun examples.
- If they ask for advice → explain it clearly but keep swagger.
- If they ask flirty or bold stuff → match their energy but stay cool.
Keep all answers short and confident.
  `

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
  res.status(resp.ok ? 200 : 500).json(data)
})

export default r
