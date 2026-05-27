"use client";

import Link from "next/link";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, Database, Sparkles, Terminal } from "lucide-react";

import { SiteHeader } from "@/components/site-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useTRPC } from "@/trpc/client";

export default function SeedPage() {
  const trpc = useTRPC();

  const statusQuery = useQuery(trpc.seed.status.queryOptions());
  const runMutation = useMutation(
    trpc.seed.run.mutationOptions({
      onSuccess: () => {
        statusQuery.refetch();
      },
    })
  );

  const status = statusQuery.data;
  const result = runMutation.data;
  const error = runMutation.error;

  const isRunning = runMutation.isPending;

  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader />

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-10 sm:px-6">
        <div className="mb-6 space-y-2">
          <Button variant="ghost" size="xs" asChild className="-ml-2 w-fit">
            <Link href="/">
              <ArrowLeft />
              Back to discover
            </Link>
          </Button>
          <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Admin · Database seed
          </p>
          <h1 className="font-sans text-2xl font-medium tracking-tight">
            Seed inventors from NTU Tech Portal
          </h1>
          <p className="text-xs/relaxed text-muted-foreground">
            Walks the entire NTU tech-portal listing endpoint, consolidates
            every detail URL, scrapes each one for its{" "}
            <em>Inventor</em> section, and stores the resulting profiles +
            patents in the database. Progress is logged on the server console.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="font-sans">Current seed state</CardTitle>
            <CardDescription>
              Counts profiles whose contact field marks them as seed-sourced.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1 border border-border bg-muted/40 p-3">
              <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                Seeded profiles
              </span>
              <span className="font-sans text-xl font-medium">
                {statusQuery.isLoading
                  ? "…"
                  : status?.seedProfileCount ?? 0}
              </span>
            </div>
            <div className="flex flex-col gap-1 border border-border bg-muted/40 p-3">
              <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                Seeded patents
              </span>
              <span className="font-sans text-xl font-medium">
                {statusQuery.isLoading
                  ? "…"
                  : status?.seedPatentCount ?? 0}
              </span>
            </div>
          </CardContent>
          <Separator />
          <CardFooter className="flex flex-col items-stretch gap-3 border-t-0 pt-0 sm:flex-row sm:items-center sm:justify-between">
            <p className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Terminal className="size-3.5" />
              Watch your dev server console for live progress.
            </p>
            <Button
              type="button"
              onClick={() => runMutation.mutate(undefined)}
              disabled={isRunning}
            >
              {isRunning ? (
                <>
                  <Sparkles className="size-3.5 animate-pulse" />
                  Seeding…
                </>
              ) : (
                <>
                  <Database className="size-3.5" />
                  Run seed
                </>
              )}
            </Button>
          </CardFooter>
        </Card>

        {isRunning ? (
          <Alert className="mt-6">
            <Sparkles />
            <AlertTitle>Seeding in progress</AlertTitle>
            <AlertDescription>
              This may take several minutes — we throttle requests to avoid
              hammering the NTU portal. Keep this tab open until it finishes.
            </AlertDescription>
          </Alert>
        ) : null}

        {error ? (
          <Alert variant="destructive" className="mt-6">
            <AlertTitle>Seed failed</AlertTitle>
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        ) : null}

        {result ? (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="font-sans">Last run</CardTitle>
              <CardDescription>
                Summary returned by the most recent seed mutation.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-xs">
                <Stat label="Detail URLs found" value={result.totalListed} />
                <Stat label="Details scraped" value={result.scrapedDetails} />
                <Stat
                  label="Unique inventors"
                  value={result.inventorsFound}
                />
                <Stat
                  label="Profiles created"
                  value={result.profilesCreated}
                />
                <Stat
                  label="Patents inserted"
                  value={result.patentsInserted}
                />
                <Stat label="Skipped" value={result.skipped} />
              </dl>
            </CardContent>
          </Card>
        ) : null}
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </dt>
      <dd className="font-sans text-sm font-medium">{value}</dd>
    </div>
  );
}
