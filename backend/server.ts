import express, { Request, Response } from "express";
import cors from "cors";
import chat from "./routes/ai/chat";
import pickup from "./routes/ai/pickup";
import screenshot from "./routes/ai/screenshot";

const app = express();

app.use(cors());
app.use(express.urlencoded({ extended: true, limit: "25mb" }));
app.use(express.json({ limit: "25mb" }));

app.get("/api", (_req: Request, res: Response): void => {
  res.json({ status: "ok" });
});

app.use("/api/chat", chat);
app.use("/api/pickup", pickup);

app.use("/api/ai/chat", chat);
app.use("/api/ai/pickup", pickup);
app.use("/api/ai/screenshot", screenshot);

const port = Number(process.env.PORT ?? 8080);
app.listen(port, () => {
  console.log("Backend up on", port);
});
