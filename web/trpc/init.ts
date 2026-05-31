import { TRPCError, initTRPC } from "@trpc/server";
import { cache } from "react";
import superjson from "superjson";

import { getSession } from "@/lib/session";

/**
 * Per-request context shared by all procedures. Add things like the
 * authenticated user, headers, or a DB transaction here. `cache` ensures
 * the same context is reused across calls within a single RSC render.
 */
export const createTRPCContext = cache(async () => {
  return {
    session: await getSession(),
  };
});

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
});

const enforceUser = t.middleware(({ ctx, next }) => {
  if (!ctx.session) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Sign in with Microsoft to continue.",
    });
  }

  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
    },
  });
});

export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(enforceUser);
