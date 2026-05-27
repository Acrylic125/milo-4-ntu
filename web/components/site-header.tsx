"use client";

import Link from "next/link";
import Image from "next/image"
import { CircleUserRound, FlaskConical, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { getCurrentProfile } from "@/lib/profile-storage";

type SiteHeaderProps = {
  className?: string;
};



export function SiteHeader({ className }: SiteHeaderProps) {
  const [hasProfile, setHasProfile] = useState(false);

  useEffect(() => {
    const profile = getCurrentProfile();
    const isValid =
      profile &&
      profile.email &&
      profile.contact &&
      profile.summary;

    setHasProfile(!!profile);
  }, []);

  return (
    <header
      className={cn(
        "border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80",
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
              className="rounded=md"/>
        </Link>

        <nav className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/">
              <Users className="size-3.5" />
              Discover
            </Link>
          </Button>
          <Button size="sm" asChild>
            <Link href={hasProfile ? "/profile/me" : "/onboard"}>
              {hasProfile ? (
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
