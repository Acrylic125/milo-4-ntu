import "server-only";

import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";
import { cache } from "react";

import { createTRPCContext } from "@/trpc/init";
import { makeQueryClient } from "@/trpc/query-client";
import { appRouter, type AppRouter } from "@/trpc/routers/_app";

/**
 * Reused per RSC request so all `trpc.*.prefetch(...)` calls share the
 * same QueryClient and dehydration boundary.
 */
export const getQueryClient = cache(makeQueryClient);

export const trpc = createTRPCOptionsProxy<AppRouter>({
  ctx: createTRPCContext,
  router: appRouter,
  queryClient: getQueryClient,
});

/**
 * Direct server-side caller for use in Server Components that need the
 * result inline (no React Query hydration needed).
 */
export const caller = appRouter.createCaller(createTRPCContext);

export function HydrateClient(props: { children: React.ReactNode }) {
  const queryClient = getQueryClient();
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      {props.children}
    </HydrationBoundary>
  );
}
