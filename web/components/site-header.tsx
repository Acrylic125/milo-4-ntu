"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useQuery } from "@tanstack/react-query";
import { CircleUserRound, FlaskConical, LogIn, LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeMenuItems } from "@/components/theme-menu-items";
import { authClient } from "@/lib/auth-client";
import { getInitialsAvatarUrl } from "@/lib/initials-avatar";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";

type SiteHeaderProps = {
  className?: string;
};

export function SiteHeader({ className }: SiteHeaderProps) {
  const trpc = useTRPC();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { data: session, isPending: isSessionPending } =
    authClient.useSession();

  const currentQuery = useQuery(trpc.profiles.current.queryOptions());
  const current = currentQuery.data ?? null;
  const displayName =
    current?.name ?? session?.user.name ?? session?.user.email ?? "User";
  const email = session?.user.email ?? "";
  const avatarUrl = getInitialsAvatarUrl(displayName, 64);
  const isBusy = isPending || isSessionPending;

  function handleMicrosoftSignIn() {
    startTransition(async () => {
      await authClient.signIn.social({
        provider: "microsoft",
        callbackURL: "/",
      });
    });
  }

  function handleSignOut() {
    startTransition(async () => {
      await authClient.signOut({
        fetchOptions: {
          onSuccess: async () => {
            await currentQuery.refetch();
            router.refresh();
          },
        },
      });
    });
  }

  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80",
        className
      )}
    >
      <div className="mx-auto flex h-navbar max-w-ui items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center border border-border bg-muted">
              <FlaskConical className="size-4" />
            </span>
            <div className="leading-tight">
              <p className="font-sans text-sm font-medium tracking-tight">
                Milo
              </p>
            </div>
          </Link>
          <nav className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/">Discover</Link>
            </Button>
          </nav>
        </div>

        <nav className="flex items-center gap-2">
          {session ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="size-8 rounded-full p-0"
                  disabled={isBusy}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={avatarUrl}
                    alt={displayName}
                    className="size-8 rounded-full"
                  />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col gap-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {displayName}
                    </p>
                    {email ? (
                      <p className="truncate text-xs text-muted-foreground">
                        {email}
                      </p>
                    ) : null}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href={current ? `/profile/${current.id}` : "/onboard"}>
                    <CircleUserRound />
                    {current ? "My profile" : "Finish onboarding"}
                  </Link>
                </DropdownMenuItem>
                <ThemeMenuItems />
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleSignOut}
                  disabled={isBusy}
                  variant="destructive"
                >
                  <LogOut />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button size="sm" onClick={handleMicrosoftSignIn} disabled={isBusy}>
              <LogIn className="size-3.5" />
              Continue with Microsoft
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
