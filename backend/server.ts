import express, { Request, Response } from "express"
import cors from "cors"
import chat from "./routes/ai/chat.js"
import pickup from "./routes/ai/pickup.js"

const app = express()
app.use(cors())
app.use(express.json())

// Health check endpoint
app.get("/api", (_req: Request, res: Response) => {
  res.json({ status: "ok" })
})

// ✅ Main API routes
app.use("/api/chat", chat)
app.use("/api/pickup", pickup)

// ✅ Aliases for Rork/TRPC compatibility (matches your /src calls)
app.use("/api/ai/chat", chat)
app.use("/api/ai/pickup", pickup)

const port = process.env.PORT || 8080
app.listen(port, () => {
  console.log("Backend up on", port)
})
