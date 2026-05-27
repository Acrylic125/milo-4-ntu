import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/trpc/init";

export const appRouter = createTRPCRouter({
  hello: publicProcedure
    .input(z.object({ name: z.string().optional() }).optional())
    .query(({ input }) => {
      return {
        greeting: `Hello, ${input?.name ?? "world"}!`,
        timestamp: new Date(),
      };
    }),
});

export type AppRouter = typeof appRouter;
