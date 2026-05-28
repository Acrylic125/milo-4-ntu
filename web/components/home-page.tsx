"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CircleUserRound, Search } from "lucide-react";

import { ProfileCard } from "@/components/profile-card";
import { SiteHeader } from "@/components/site-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useTRPC } from "@/trpc/client";

type RoleFilter = "all" | "student" | "researcher";

export function HomePage() {
  const trpc = useTRPC();

  const currentQuery = useQuery(trpc.profiles.current.queryOptions());
  const listQuery = useQuery(trpc.profiles.list.queryOptions());
  const recommendationsQuery = useQuery(
    trpc.profiles.recommendations.queryOptions(
      { limit: 50 },
      { enabled: !!currentQuery.data }
    )
  );

  const viewer = currentQuery.data ?? null;
  const allProfiles = useMemo(() => listQuery.data ?? [], [listQuery.data]);
  const recommendations = useMemo(
    () => recommendationsQuery.data ?? [],
    [recommendationsQuery.data]
  );

  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");

  const recommendationsById = useMemo(() => {
    return new Map(recommendations.map((rec) => [rec.id, rec]));
  }, [recommendations]);

  const filteredProfiles = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    const filtered = allProfiles.filter((profile) => {
      if (roleFilter !== "all" && profile.role !== roleFilter) return false;
      if (!normalizedQuery) return true;

      const haystack = [
        profile.name,
        profile.email,
        profile.contact,
        profile.role,
        (profile.tags ?? []).join(" "),
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });

    if (!viewer) return filtered;

    // When a viewer is assumed, rank profiles by recommendation similarity
    // (descending). Profiles without a similarity score fall to the bottom
    // and keep their alphabetical ordering from the API.
    return [...filtered].sort((a, b) => {
      const aScore = recommendationsById.get(a.id)?.similarity;
      const bScore = recommendationsById.get(b.id)?.similarity;
      if (aScore == null && bScore == null) return 0;
      if (aScore == null) return 1;
      if (bScore == null) return -1;
      return bScore - aScore;
    });
  }, [allProfiles, query, roleFilter, viewer, recommendationsById]);

  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        <section className="mb-10">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-3">
              <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
                Discover collaborators
              </p>

              <h1 className="max-w-2xl font-sans text-2xl font-medium tracking-tight sm:text-3xl">
                Match students with researchers building in the same problem
                space.
              </h1>

              <p className="max-w-xl text-xs/relaxed text-muted-foreground">
                Recommendations are ranked by cosine similarity between your
                NTU patents&apos; embeddings and everyone else&apos;s.
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
        </section>

        {!viewer && (
          <Alert className="mb-8">
            <CircleUserRound />
            <AlertTitle>Assume a user to unlock recommendations</AlertTitle>
            <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span>
                Pick a profile from the &ldquo;Assume user&rdquo; menu in the
                header, or onboard a new one — recommendations rank by
                embedding similarity against the assumed user&apos;s patents.
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
              <h2 className="font-sans text-sm font-medium">All profiles</h2>
              <p className="text-xs text-muted-foreground">
                {listQuery.isLoading
                  ? "Loading…"
                  : `${filteredProfiles.length} member${
                      filteredProfiles.length === 1 ? "" : "s"
                    } in the network${
                      viewer ? " · ranked by embedding similarity" : ""
                    }`}
              </p>
            </div>

            <div className="flex w-full flex-col gap-2 sm:max-w-md">
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search by name, email, or tag…"
                  className="pl-8"
                />
              </div>
              <div className="flex gap-1">
                {(
                  [
                    ["all", "Everyone"],
                    ["student", "Students"],
                    ["researcher", "Researchers"],
                  ] as const
                ).map(([value, label]) => (
                  <Button
                    key={value}
                    type="button"
                    size="xs"
                    variant={roleFilter === value ? "default" : "outline"}
                    onClick={() => setRoleFilter(value)}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {filteredProfiles.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                {listQuery.isLoading
                  ? "Loading profiles…"
                  : "No profiles match your filters."}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredProfiles.map((profile) => {
                const rec = recommendationsById.get(profile.id);
                return (
                  <ProfileCard
                    key={profile.id}
                    profile={{
                      id: profile.id,
                      name: profile.name,
                      contact: profile.contact,
                      role: profile.role,
                    }}
                    matchScore={
                      rec
                        ? Math.max(
                            0,
                            Math.min(100, Math.round(rec.similarity * 100))
                          )
                        : undefined
                    }
                    sharedTags={profile.tags ?? []}
                    itemCount={
                      rec
                        ? { value: rec.patentCount, label: "patent" }
                        : undefined
                    }
                  />
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
