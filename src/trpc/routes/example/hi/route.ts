import { z } from "zod";
import { publicProcedure } from "@/src/trpc/create-context";

export default publicProcedure
  .input(z.object({ name: z.string() }))
  .mutation(({ input }) => {
    return {
      hello: input.name,
      date: new Date(),
    };
  });
