import { Hono } from "hono";
import { trpcServer } from "@hono/trpc-server";
import { cors } from "hono/cors";
import { appRouter } from "./trpc/app-router";
import { createContext } from "./trpc/create-context";
import { generateText, generateObject } from "@rork/toolkit-sdk";
import { z } from "zod";

const app = new Hono();

app.use("*", cors());

app.use(
  "/trpc/*",
  trpcServer({
    endpoint: "/api/trpc",
    router: appRouter,
    createContext,
  })
);

app.get("/", (c) => {
  return c.json({ status: "ok", message: "API is running" });
});

app.get("/health", (c) => c.json({ status: "ok" }));

app.post("/ai/pickup-line", async (c) => {
  try {
    const body = await c.req.json();
    const { tone, context, length, spiceLevel } = body;

    console.log('[AI] pickup-line request:', { tone, context, length, spiceLevel });

    const spiceContext = spiceLevel ? `Spice level: ${spiceLevel}. ` : '';
    const lengthContext = length ? `Length: ${length}. ` : '';
    const userContext = context ? `Context about the person: ${context}. ` : '';

    const prompt = `Generate a ${tone.toLowerCase()} pickup line. ${spiceContext}${lengthContext}${userContext}Make it creative, charming, and appropriate for the tone. Return ONLY the pickup line text, no quotes or extra formatting.`;

    const text = await generateText({
      messages: [{ role: "user", content: prompt }],
    });

    console.log('[AI] pickup-line response:', text);

    return c.json({ text, line: text, data: text });
  } catch (error) {
    console.error('[AI] pickup-line error:', error);
    return c.json({ error: "Failed to generate pickup line", text: "Are you a magician? Because whenever I look at you, everyone else disappears!" }, 500);
  }
});

app.post("/ai/chat-advice", async (c) => {
  try {
    const body = await c.req.json();
    const { message } = body;

    console.log('[AI] chat-advice request:', { message });

    const prompt = `You are a dating and conversation expert. The user is asking for advice about: "${message}". Provide helpful, practical, and friendly advice. Keep it conversational and supportive.`;

    const text = await generateText({
      messages: [{ role: "user", content: prompt }],
    });

    console.log('[AI] chat-advice response:', text);

    return c.json({ text, advice: text, message: text });
  } catch (error) {
    console.error('[AI] chat-advice error:', error);
    return c.json({ error: "Failed to get advice", text: "I'm here to help! Could you provide more details about your situation?" }, 500);
  }
});

app.post("/ai/analyze-screenshot", async (c) => {
  try {
    const body = await c.req.json();
    const { image, amplifyBold, targetType } = body;

    console.log('[AI] analyze-screenshot request:', { hasImage: !!image, amplifyBold, targetType });

    const base64Image = image.startsWith('data:') ? image : `data:image/jpeg;base64,${image}`;

    const analysisPrompt = targetType 
      ? `Analyze this dating app conversation screenshot and generate a ${targetType.toLowerCase()} reply. Focus on making it ${targetType === 'Safe' ? 'friendly and low-risk' : targetType === 'Witty' ? 'clever and playful' : 'confident and bold'}.`
      : `Analyze this dating app conversation screenshot and suggest three different reply styles: Safe (friendly, low-risk), Witty (clever, playful), and Bold (confident, forward).`;

    const schema = z.object({
      safe: z.object({
        text: z.string().describe("A safe, friendly reply"),
        rationale: z.string().describe("Why this reply works"),
      }),
      witty: z.object({
        text: z.string().describe("A witty, clever reply"),
        rationale: z.string().describe("Why this reply works"),
      }),
      bold: z.object({
        text: z.string().describe("A bold, confident reply"),
        rationale: z.string().describe("Why this reply works"),
      }),
    });

    const result = await generateObject({
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: analysisPrompt },
            { type: "image", image: base64Image },
          ],
        },
      ],
      schema,
    });

    console.log('[AI] analyze-screenshot response:', result);

    return c.json(result);
  } catch (error) {
    console.error('[AI] analyze-screenshot error:', error);
    return c.json({
      error: "Failed to analyze screenshot",
      safe: { text: "That's interesting! Tell me more about that.", rationale: 'Keeps conversation flowing without risk' },
      witty: { text: 'Well, this conversation just got interesting 😏', rationale: 'Playful and engaging' },
      bold: { text: 'I like where this is going. Coffee tomorrow?', rationale: 'Confident and moves things forward' },
    }, 500);
  }
});

export default app;
