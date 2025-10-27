import { createTRPCRouter } from "./create-context";
import hiRoute from "./routes/example/hi/route";
import generatePickupRoute from "./routes/ai/pickup/route";
import chatAdviceRoute from "./routes/ai/chat/route";
import analyzeScreenshotRoute from "./routes/ai/screenshot/route";

export const appRouter = createTRPCRouter({
  example: createTRPCRouter({
    hi: hiRoute,
  }),
  ai: createTRPCRouter({
    generatePickup: generatePickupRoute,
    chatAdvice: chatAdviceRoute,
    analyzeScreenshot: analyzeScreenshotRoute,
  }),
});

export type AppRouter = typeof appRouter;
