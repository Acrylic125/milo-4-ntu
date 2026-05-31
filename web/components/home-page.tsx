"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, Search, Sparkles } from "lucide-react";
import { useVirtualizer } from "@tanstack/react-virtual";

import { RoleBadge } from "@/components/role-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useTRPC } from "@/trpc/client";
import { useQueryState } from "nuqs";

export function SearchBar() {
  const [search, setSearch] = useQueryState("search", {
    shallow: false,
    throttleMs: 500,
  });

  return (
    <Input
      value={search ?? ""}
      onChange={(event) => setSearch(event.target.value)}
      placeholder="What are you looking for?"
      className="w-full h-fit max-w-4xl px-4 py-2.5 border border-input bg-input/25 shadow-md backdrop-blur-lg rounded-md"
    />
  );
}

export function Patents({
  patents,
}: {
  patents: {
    link: string;
    title: string;
    researchers: {
      id: string;
      name: string;
      role: "student" | "researcher";
    }[];
    similarity: number | null;
  }[];
}) {
  // const scrollRef = useRef<HTMLDivElement | null>(null);
  // const rowVirtualizer = useVirtualizer({
  //   count: patents.length,
  //   getScrollElement: () => scrollRef.current,
  //   estimateSize: () => 78,
  //   overscan: 8,
  // });

  return (
    <div className="flex flex-col gap-4">
      <div className="px-4">
        <h1 className="text-lg md:text-xl lg:text-2xl font-medium">Patents</h1>
      </div>
      {patents.length === 0 ? (
        <div className="px-4 text-sm text-muted-foreground">
          No patents found.
        </div>
      ) : (
        <div className="w-full border border-border">
          {patents.map((patent) => {
            return (
              <div key={patent.link} className="w-full">
                <PatentRow
                  title={patent.title}
                  link={patent.link}
                  researchers={patent.researchers}
                  matchScore={patent.similarity ?? undefined}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function HomePage() {
  const trpc = useTRPC();

  const listQuery = useQuery(trpc.patents.list.queryOptions());
  const recommendationsQuery = useQuery(
    trpc.patents.recommendations.queryOptions({ limit: 100 })
  );

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

    return [...filtered].sort((a, b) => {
      const aScore = recommendationsByLink.get(a.link)?.similarity;
      const bScore = recommendationsByLink.get(b.link)?.similarity;
      if (aScore == null && bScore == null) return 0;
      if (aScore == null) return 1;
      if (bScore == null) return -1;
      return bScore - aScore;
    });
  }, [allPatents, query, recommendationsByLink]);

  return (
    <div className="flex min-h-full flex-col">
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
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
                      recommendations.length > 0
                        ? " · ranked by embedding similarity"
                        : ""
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
  const roundedMatch = Math.max(
    0,
    Math.min(100, Math.round((matchScore ?? 0) * 100))
  );
  return (
    <div className="flex flex-col gap-3 border-b px-4 py-4 transition-colors hover:bg-muted/30 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
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

      {roundedMatch > 0 && (
        <span className="inline-flex shrink-0 items-center gap-1 self-start border border-primary/25 bg-primary/5 px-2 py-1 text-[10px] font-medium text-primary sm:self-center">
          <Sparkles className="size-3" />
          {roundedMatch}% match
        </span>
      )}
    </div>
  );
}
