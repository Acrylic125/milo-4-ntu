"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Handshake,
  MagnifyingGlass,
  UserCircle,
} from "@phosphor-icons/react";

import { ProfileCard } from "@/components/profile-card";
import { SiteHeader } from "@/components/site-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { MOCK_PROFILES } from "@/lib/mock-profiles";
import { rankMatches } from "@/lib/profile";
import { getCurrentProfile } from "@/lib/profile-storage";
import type { Profile, ProfileMatch } from "@/lib/profile";

export function HomePage() {
  const pathname = usePathname();
  const [viewer, setViewer] = useState<Profile | null>(null);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "researcher" | "founder">(
    "all"
  );

  useEffect(() => {
    setViewer(getCurrentProfile());

    function handleProfileUpdate() {
      setViewer(getCurrentProfile());
    }

    window.addEventListener("milo-profile-updated", handleProfileUpdate);
    return () => {
      window.removeEventListener("milo-profile-updated", handleProfileUpdate);
    };
  }, [pathname]);

  const allProfiles = useMemo(() => {
    if (!viewer) return MOCK_PROFILES;
    const others = MOCK_PROFILES.filter((p) => p.id !== viewer.id);
    return [viewer, ...others];
  }, [viewer]);

  const matches: ProfileMatch[] = useMemo(() => {
    if (!viewer) return [];
    return rankMatches(viewer, MOCK_PROFILES).filter((m) => m.score >= 18);
  }, [viewer]);

  const filteredProfiles = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return allProfiles.filter((profile) => {
      const matchesRole =
        roleFilter === "all" ? true : profile.role === roleFilter;
      if (!matchesRole) return false;
      if (!normalizedQuery) return true;

      const haystack = [
        profile.name,
        profile.summary,
        profile.contact,
        profile.tags.join(" "),
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });
  }, [allProfiles, query, roleFilter]);

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
              Match researchers with founders building in the same problem space.
            </h1>

            <p className="max-w-xl text-xs/relaxed text-muted-foreground">
              Profiles are mocked for now. Complete onboarding to personalize match
              scores based on your summary and links.
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
        

        {!viewer ? (
          <Alert className="mb-8">
            <UserCircle />
            <AlertTitle>Complete onboarding to unlock matches</AlertTitle>
            <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span>
                Add your email, links, and summary so we can rank similar
                profiles. Website scraping for auto-summaries comes later.
              </span>
              <Button size="sm" asChild className="shrink-0">
                <Link href="/onboard">Start onboarding</Link>
              </Button>
            </AlertDescription>
          </Alert>
        ) : (
          <section className="mb-10">
            <div className="mb-4 flex items-center gap-2">
              <Handshake className="size-4" weight="duotone" />
              <h2 className="font-sans text-sm font-medium">
                Top matches for you
              </h2>
            </div>

            {matches.length === 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle className="font-sans">No strong matches yet</CardTitle>
                  <CardDescription>
                    Try broadening your summary with domain keywords (e.g.
                    robotics, climate, edtech) to improve overlap with the mock
                    network.
                  </CardDescription>
                </CardHeader>
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {matches.slice(0, 3).map((match) => (
                  <ProfileCard
                    key={match.profile.id}
                    profile={match.profile}
                    matchScore={match.score}
                    sharedTags={match.sharedTags}
                  />
                ))}
              </div>
            )}

            {matches.length > 3 && (
              <p className="mt-3 text-[10px] text-muted-foreground">
                {matches.length - 3} more potential matches in the directory
                below.
              </p>
            )}
          </section>
        )}

        <Separator className="mb-8" />

        <section className="space-y-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="font-sans text-sm font-medium">
                All profiles
              </h2>
              <p className="text-xs text-muted-foreground">
                {filteredProfiles.length} member
                {filteredProfiles.length === 1 ? "" : "s"} in the network
              </p>
            </div>

            <div className="flex w-full flex-col gap-2 sm:max-w-md">
              <div className="relative">
                <MagnifyingGlass className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search by name, topic, or tag…"
                  className="pl-8"
                />
              </div>
              <div className="flex gap-1">
                {(
                  [
                    ["all", "Everyone"],
                    ["researcher", "Researchers"],
                    ["founder", "Founders"],
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
                No profiles match your filters.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredProfiles.map((profile) => {
                const match = matches.find((m) => m.profile.id === profile.id);
                return (
                  <ProfileCard
                    key={profile.id}
                    profile={profile}
                    matchScore={match?.score}
                    sharedTags={match?.sharedTags}
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
