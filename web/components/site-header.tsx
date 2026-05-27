"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronDown,
  CircleUserRound,
  FlaskConical,
  UserCog,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { assumeUser, clearAssumedUser } from "@/lib/auth-actions";
import { useTRPC } from "@/trpc/client";

type SiteHeaderProps = {
  className?: string;
};

export function SiteHeader({ className }: SiteHeaderProps) {
  const trpc = useTRPC();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const profilesQuery = useQuery(trpc.profiles.list.queryOptions());
  const currentQuery = useQuery(trpc.profiles.current.queryOptions());

  const allProfiles = profilesQuery.data ?? [];
  const current = currentQuery.data ?? null;

  function handleAssume(profileId: string) {
    startTransition(async () => {
      await assumeUser(profileId);
      await currentQuery.refetch();
      router.refresh();
    });
  }

  function handleClear() {
    startTransition(async () => {
      await clearAssumedUser();
      await currentQuery.refetch();
      router.refresh();
    });
  }

  return (
    <header
      className={cn(
        "border-b border-border bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80",
        className
      )}
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center border border-border bg-muted">
            <FlaskConical className="size-4" />
          </span>
          <div className="leading-tight">
            <p className="font-sans text-sm font-medium tracking-tight">
              [Milo***]
            </p>
            <p className="text-[10px] text-muted-foreground">
              Researchers × Founders
            </p>
          </div>
          <div className="h-8 w-px bg-border" />
          <Image
            src="/ntupreneur_logo.png"
            alt="Logo"
            width={80}
            height={32}
            className="rounded-md"
          />
        </Link>

        <nav className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={isPending}>
                <UserCog className="size-3.5" />
                <span className="max-w-40 truncate">
                  {current ? `Acting as ${current.name}` : "Assume user"}
                </span>
                <ChevronDown className="size-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72 min-w-72">
              <DropdownMenuLabel>Assume user</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {profilesQuery.isLoading ? (
                <DropdownMenuItem disabled>Loading…</DropdownMenuItem>
              ) : allProfiles.length === 0 ? (
                <DropdownMenuItem disabled>
                  No profiles yet — onboard one first
                </DropdownMenuItem>
              ) : (
                allProfiles.map((profile) => {
                  const active = current?.id === profile.id;
                  return (
                    <DropdownMenuItem
                      key={profile.id}
                      onSelect={(event) => {
                        event.preventDefault();
                        handleAssume(profile.id);
                      }}
                      disabled={isPending}
                      className={cn(active && "bg-accent/60")}
                    >
                      <div className="flex min-w-0 flex-col">
                        <span className="truncate text-xs font-medium">
                          {profile.name}
                          {active ? " · current" : ""}
                        </span>
                        <span className="truncate text-[10px] text-muted-foreground">
                          {profile.email} · {profile.role}
                        </span>
                      </div>
                    </DropdownMenuItem>
                  );
                })
              )}
              {current ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onSelect={(event) => {
                      event.preventDefault();
                      handleClear();
                    }}
                    disabled={isPending}
                  >
                    Clear assumed user
                  </DropdownMenuItem>
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="ghost" size="sm" asChild>
            <Link href="/">
              <Users className="size-3.5" />
              Discover
            </Link>
          </Button>
          <Button size="sm" asChild>
            <Link href={current ? `/profile/${current.id}` : "/onboard"}>
              {current ? (
                <>
                  <CircleUserRound className="size-4" />
                  My profile
                </>
              ) : (
                "Join network"
              )}
            </Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
