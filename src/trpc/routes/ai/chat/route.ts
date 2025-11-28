import { z } from "zod";
import { publicProcedure } from "../../../create-context";
import { OPENAI_API_KEY } from "@/config/secrets";

const TEXT_MODEL = "gpt-4o-mini" as const;
const chatAdviceInputSchema = z.object({ message: z.string() });
type ChatAdviceInput = z.infer<typeof chatAdviceInputSchema>;

function getOpenAIKey(): string {
  const envKey = (process.env.OPENAI_API_KEY ?? "").trim();
  if (envKey.length > 0) {
    return envKey;
  }
  const configKey = (OPENAI_API_KEY ?? "").trim();
  if (configKey.length > 0) {
    return configKey;
  }
  throw new Error("OPENAI_API_KEY not found in environment or secrets file");
}

export default publicProcedure
  .input(chatAdviceInputSchema)
  .mutation(async ({ input }: { input: ChatAdviceInput }) => {
    try {
      console.log("[ChatAdvice] Received request:", input.message);
      
      const apiKey = getOpenAIKey();
      console.log("[ChatAdvice] Using API key:", apiKey ? `${apiKey.substring(0, 10)}...` : "(none)");

      const variation = `${Math.random().toString(36).slice(2)}_${Date.now()}`;

      const messages = [
        {
          role: "system" as const,
          content:
            "You are RizzGoat, a friendly and knowledgeable dating coach. Provide structured advice in this format:\n\n💬 Say this:\n[1-2 line suggestion]\n\n🔄 If they respond with X:\n[Conditional advice]\n\n⚠️ Pitfalls to avoid:\n• [Bullet point]\n• [Bullet point]\n\nKeep advice practical, respectful, and confidence-building. Do not repeat prior outputs. If given a variation token, ignore it in the output and use it only to diversify the result.",
        },
        { role: "user" as const, content: `${input.message}\n\nVariation token: ${variation}` },
      ];

      console.log("[ChatAdvice] Making OpenAI request...");
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ model: TEXT_MODEL, messages }),
      });

      if (!res.ok) {
        const t = await res.text();
        console.error("[ChatAdvice] OpenAI error:", res.status, t);
        throw new Error(`OpenAI error: ${res.status} - ${t}`);
      }

      const data = (await res.json()) as any;
      const content = data?.choices?.[0]?.message?.content as string | undefined;
      console.log("[ChatAdvice] Success, returning response");
      return (content ?? "I'm here to help! Could you provide more details about your situation?") as string;
    } catch (error) {
      console.error("[ChatAdvice] Error:", error);
      throw error;
    }
  });
