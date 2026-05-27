"use client";

import { GraduationCap, Rocket } from "lucide-react";

import { cn } from "@/lib/utils";

type RoleBadgeProps = {
  role: "researcher" | "founder";
  className?: string;
};

export function RoleBadge({ role, className }: RoleBadgeProps) {
  const isResearcher = role === "researcher";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide",
        isResearcher
          ? "border-foreground/15 bg-muted text-foreground"
          : "border-primary/30 bg-primary/5 text-primary",
        className
      )}
    >
      {isResearcher ? (
        <GraduationCap className="size-3" />
      ) : (
        <Rocket className="size-3" />
      )}
      {isResearcher ? "Researcher" : "Founder"}
    </span>
  );
}
