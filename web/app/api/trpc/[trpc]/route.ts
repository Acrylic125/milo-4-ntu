import { fetchRequestHandler } from "@trpc/server/adapters/fetch";

import { createTRPCContext } from "@/trpc/init";
import { appRouter } from "@/trpc/routers/_app";

function serializeCause(cause: unknown): unknown {
  if (cause instanceof Error) {
    return {
      name: cause.name,
      message: cause.message,
      stack: cause.stack,
      cause: serializeCause(cause.cause),
    };
  }

  if (typeof cause === "object" && cause !== null) {
    return Object.fromEntries(
      Object.entries(cause).map(([key, value]) => [key, serializeCause(value)])
    );
  }

  return cause;
}

function serializeError(error: {
  message: string;
  code?: string;
  cause?: unknown;
  stack?: string;
  shape?: unknown;
}) {
  return {
    code: error.code,
    message: error.message,
    cause: serializeCause(error.cause),
    stack: error.stack,
    shape: error.shape,
  };
}

// The /seed mutation walks the entire NTU tech-portal listing (200+ pages)
// so we need a longer-than-default timeout for this route in production.
export const maxDuration = 300;

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: createTRPCContext,
    onError:
      process.env.NODE_ENV === "development"
        ? ({ path, error }) => {
            console.error(
              `❌ tRPC failed on ${path ?? "<no-path>"}`,
              serializeError(error)
            );
          }
        : undefined,
  });

export { handler as GET, handler as POST };
