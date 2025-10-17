import { z } from "zod";
import { publicProcedure } from "@/backend/trpc/create-context";

const TEXT_MODEL = "gpt-4o-mini" as const;

export default publicProcedure
  .input(z.object({ message: z.string() }))
  .mutation(async ({ input }) => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("Server misconfigured: missing OPENAI_API_KEY");
    }

    const variation = `${Math.random().toString(36).slice(2)}_${Date.now()}`;

    const messages = [
      {
        role: "system",
        content:
          "You are RizzGoat, a friendly and knowledgeable dating coach. Provide structured advice in this format:\n\n💬 Say this:\n[1-2 line suggestion]\n\n🔄 If they respond with X:\n[Conditional advice]\n\n⚠️ Pitfalls to avoid:\n• [Bullet point]\n• [Bullet point]\n\nKeep advice practical, respectful, and confidence-building. Do not repeat prior outputs. If given a variation token, ignore it in the output and use it only to diversify the result.",
      },
      { role: "user", content: `${input.message}\n\nVariation token: ${variation}` },
    ];

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
      throw new Error(`OpenAI error: ${res.status} - ${t}`);
    }

    const data = (await res.json()) as any;
    const content = data?.choices?.[0]?.message?.content as string | undefined;
    return (content ?? "I'm here to help! Could you provide more details about your situation?") as string;
  });
