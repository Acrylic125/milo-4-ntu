import { initTRPC } from "@trpc/server";
import { cache } from "react";
import superjson from "superjson";

/**
 * Per-request context shared by all procedures. Add things like the
 * authenticated user, headers, or a DB transaction here. `cache` ensures
 * the same context is reused across calls within a single RSC render.
 */
export const createTRPCContext = cache(async () => {
  return {
    /** userId: '...' */
  };
});

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
});

export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;
export const publicProcedure = t.procedure;
