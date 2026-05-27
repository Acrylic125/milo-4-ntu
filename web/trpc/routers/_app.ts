import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "@/trpc/init";
import { onboardRouter } from "@/trpc/routers/onboard";
import { profilesRouter } from "@/trpc/routers/profiles";
import { seedRouter } from "@/trpc/routers/seed";

export const appRouter = createTRPCRouter({
  hello: publicProcedure
    .input(z.object({ name: z.string().optional() }).optional())
    .query(({ input }) => {
      return {
        greeting: `Hello, ${input?.name ?? "world"}!`,
        timestamp: new Date(),
      };
    }),
  onboard: onboardRouter,
  profiles: profilesRouter,
  seed: seedRouter,
});

export type AppRouter = typeof appRouter;
