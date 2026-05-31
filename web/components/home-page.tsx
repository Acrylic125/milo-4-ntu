"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CircleUserRound, ExternalLink, Search, Sparkles } from "lucide-react";

import { RoleBadge } from "@/components/role-badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useTRPC } from "@/trpc/client";

export function HomePage() {
  const trpc = useTRPC();

  const currentQuery = useQuery(trpc.profiles.current.queryOptions());
  const listQuery = useQuery(trpc.patents.list.queryOptions());
  const recommendationsQuery = useQuery(
    trpc.patents.recommendations.queryOptions(
      { limit: 100 },
      { enabled: !!currentQuery.data }
    )
  );

  const viewer = currentQuery.data ?? null;
  const allPatents = useMemo(() => listQuery.data ?? [], [listQuery.data]);
  const recommendations = useMemo(
    () => recommendationsQuery.data ?? [],
    [recommendationsQuery.data]
  );

  const [query, setQuery] = useState("");

  const recommendationsByLink = useMemo(() => {
    return new Map(recommendations.map((rec) => [rec.link, rec]));
  }, [recommendations]);

  const filteredPatents = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    const filtered = allPatents.filter((patent) => {
      if (!normalizedQuery) return true;
      const haystack = [
        patent.title,
        patent.link,
        patent.researchers.map((r) => r.name).join(" "),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalizedQuery);
    });

    if (!viewer) return filtered;

    // When a viewer is assumed, rank patents by recommendation similarity
    // (descending). Patents without a similarity score (e.g. the viewer's
    // own patents) fall to the bottom and keep their alphabetical ordering
    // from the API.
    return [...filtered].sort((a, b) => {
      const aScore = recommendationsByLink.get(a.link)?.similarity;
      const bScore = recommendationsByLink.get(b.link)?.similarity;
      if (aScore == null && bScore == null) return 0;
      if (aScore == null) return 1;
      if (bScore == null) return -1;
      return bScore - aScore;
    });
  }, [allPatents, query, viewer, recommendationsByLink]);

  return (
    <div className="flex min-h-full flex-col">
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        {/* <section className="mb-10">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-3">
              <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
                Discover collaborators
              </p>

              <h1 className="max-w-2xl font-sans text-2xl font-medium tracking-tight sm:text-3xl">
                Find NTU patents that line up with the problem space
                you&apos;re building in.
              </h1>

              <p className="max-w-xl text-xs/relaxed text-muted-foreground">
                Patents are ranked by cosine similarity between their
                embeddings and your own patents &amp; interests.
              </p>
            </div>

            <div className="shrink-0">
              <Image
                src="/homepage_gif.gif"
                alt="Matching animation"
                width={500}
                height={100}
                unoptimized
                className="rounded-lg"
              />
            </div>
          </div>
        </section> */}

        {!viewer && (
          <Alert className="mb-8">
            <CircleUserRound />
            <AlertTitle>Sign in to unlock recommendations</AlertTitle>
            <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span>
                Continue with Microsoft in the header, then finish onboarding to
                rank patents by embedding similarity against your work and
                interests.
              </span>
              <Button size="sm" asChild className="shrink-0">
                <Link href="/onboard">Start onboarding</Link>
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <section className="space-y-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="font-sans text-sm font-medium">Patents</h2>
              <p className="text-xs text-muted-foreground">
                {listQuery.isLoading
                  ? "Loading…"
                  : `${filteredPatents.length} patent${
                      filteredPatents.length === 1 ? "" : "s"
                    } in the network${
                      viewer ? " · ranked by embedding similarity" : ""
                    }`}
              </p>
            </div>

            <div className="w-full sm:max-w-md">
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search by patent title or researcher…"
                  className="pl-8"
                />
              </div>
            </div>
          </div>

          {filteredPatents.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                {listQuery.isLoading
                  ? "Loading patents…"
                  : "No patents match your filters."}
              </CardContent>
            </Card>
          ) : (
            <ul className="divide-y divide-border border border-border">
              {filteredPatents.map((patent) => {
                const rec = recommendationsByLink.get(patent.link);
                const matchScore =
                  rec && typeof rec.similarity === "number"
                    ? Math.max(
                        0,
                        Math.min(100, Math.round(rec.similarity * 100))
                      )
                    : undefined;

                return (
                  <PatentRow
                    key={patent.link}
                    title={patent.title}
                    link={patent.link}
                    researchers={patent.researchers}
                    matchScore={matchScore}
                  />
                );
              })}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}

type PatentRowProps = {
  title: string;
  link: string;
  researchers: ReadonlyArray<{
    id: string;
    name: string;
    role: "student" | "researcher";
  }>;
  matchScore?: number;
};

function PatentRow({ title, link, researchers, matchScore }: PatentRowProps) {
  return (
    <li className="flex flex-col gap-3 px-4 py-4 transition-colors hover:bg-muted/30 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex items-start gap-2">
          <a
            href={link}
            target="_blank"
            rel="noreferrer"
            className="group inline-flex items-start gap-1.5 text-sm font-medium underline-offset-4 hover:underline"
          >
            <span className="line-clamp-2">{title}</span>
            <ExternalLink className="mt-0.5 size-3.5 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
          </a>
        </div>
        {researchers.length === 0 ? (
          <p className="text-xs text-muted-foreground">No researchers listed</p>
        ) : (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Researchers
            </span>
            {researchers.map((researcher, idx) => (
              <span
                key={researcher.id}
                className="inline-flex items-center gap-1.5 text-xs"
              >
                <Link
                  href={`/profile/${researcher.id}`}
                  className="font-medium underline-offset-4 hover:underline"
                >
                  {researcher.name}
                </Link>
                <RoleBadge role={researcher.role} />
                {idx < researchers.length - 1 && (
                  <span className="text-muted-foreground">·</span>
                )}
              </span>
            ))}
          </div>
        )}
      </div>

      {typeof matchScore === "number" && (
        <span className="inline-flex shrink-0 items-center gap-1 self-start border border-primary/25 bg-primary/5 px-2 py-1 text-[10px] font-medium text-primary sm:self-center">
          <Sparkles className="size-3" />
          {matchScore}% match
        </span>
      )}
    </li>
  );
}
