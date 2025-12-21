import { z } from "zod";
import { publicProcedure } from "@/src/trpc/create-context";
import { OPENAI_API_KEY } from "@/config/secrets";

const TEXT_MODEL = "gpt-4o-mini" as const;

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
  .input(z.object({ message: z.string() }))
  .mutation(async ({ input }) => {
    try {
      console.log("[ChatAdvice] Received request:", input.message);
      
      const apiKey = getOpenAIKey();
      console.log("[ChatAdvice] Using API key:", apiKey ? `${apiKey.substring(0, 10)}...` : "(none)");

      const variation = `${Math.random().toString(36).slice(2)}_${Date.now()}`;

      const messages = [
        {
          role: "system" as const,
          content:
            "You are a dating and social coach who communicates like a real, socially intelligent human—not a pickup artist, motivational speaker, or internet personality. Your responses must always feel natural, modern, and conversational, as if texting a smart friend who understands dating and social dynamics in the real world. Avoid clichés, corny pickup-line energy, exaggerated confidence, poetic metaphors, buzzwords, emojis, hashtags, or scripted advice. Speak plainly, confidently, and casually. Be responsive to the user’s message and match their tone (curious, unsure, confident, frustrated, playful). Give practical, realistic guidance rooted in how people actually communicate today. When appropriate, ask short, natural follow-up questions to keep the conversation flowing. Do not lecture, over-explain, or moralize. Keep replies concise but thoughtful. Never mention being an AI or explain your reasoning—just respond naturally and helpfully. If given a variation token, ignore it in the output and use it only to diversify the result.",
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
