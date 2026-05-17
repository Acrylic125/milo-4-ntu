"use client";

import Link from "next/link";
import { Flask, UsersThree } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SiteHeaderProps = {
  className?: string;
};

export function SiteHeader({ className }: SiteHeaderProps) {
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
            <Flask className="size-4" weight="duotone" />
          </span>
          <div className="leading-tight">
            <p className="font-heading text-sm font-medium tracking-tight">
              Milo
            </p>
            <p className="text-[10px] text-muted-foreground">
              Researchers × Founders
            </p>
          </div>
        </Link>

        <nav className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/">
              <UsersThree className="size-3.5" />
              Discover
            </Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/onboard">Join network</Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
