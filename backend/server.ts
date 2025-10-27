import express, { Request, Response } from "express";
import cors from "cors";
import chat from "./routes/ai/chat.js";
import pickup from "./routes/ai/pickup.js";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api", (_req: Request, res: Response) => res.json({ status: "ok" }));
app.use("/api/chat", chat);
app.use("/api/pickup", pickup);

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log("Backend up on", port);
});
