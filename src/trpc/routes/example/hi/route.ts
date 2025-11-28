import { z } from "zod";
import { publicProcedure } from "../../../create-context";

const hiInputSchema = z.object({ name: z.string() });
type HiInput = z.infer<typeof hiInputSchema>;

export default publicProcedure
  .input(hiInputSchema)
  .mutation(({ input }: { input: HiInput }) => {
    return {
      hello: input.name,
      date: new Date(),
    };
  });
