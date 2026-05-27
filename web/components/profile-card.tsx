import Link from "next/link";
import { ArrowUpRight, Sparkles } from "lucide-react";

import { RoleBadge } from "@/components/role-badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type ProfileCardProps = {
  profile: {
    id: string;
    name: string;
    contact: string;
    role: "researcher" | "founder";
    workingOn?: string;
    links?: ReadonlyArray<{ label: string; url: string }>;
  };
  /** Match similarity rendered as a percentage (0–100). */
  matchScore?: number;
  /** Tags to highlight (shared, top, etc.). */
  sharedTags?: string[];
  /** Optional override for the count shown next to the contact. */
  itemCount?: { value: number; label: string };
  className?: string;
};

export function ProfileCard({
  profile,
  matchScore,
  sharedTags = [],
  itemCount,
  className,
}: ProfileCardProps) {
  const count =
    itemCount ?? {
      value: profile.links?.length ?? 0,
      label: "link",
    };

  return (
    <Link href={`/profile/${profile.id}`} className={cn("group block", className)}>
      <Card className="h-full transition-colors hover:bg-muted/30">
        <CardHeader className="pb-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <CardTitle className="truncate font-sans">{profile.name}</CardTitle>
              {profile.workingOn ? (
                <CardDescription className="line-clamp-2">
                  {profile.workingOn}
                </CardDescription>
              ) : null}
            </div>
            <ArrowUpRight className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <RoleBadge role={profile.role} />
            {typeof matchScore === "number" && (
              <span className="inline-flex items-center gap-1 border border-primary/25 bg-primary/5 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                <Sparkles className="size-3" />
                {matchScore}% match
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {sharedTags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {sharedTags.slice(0, 4).map((tag) => (
                <span
                  key={tag}
                  className="border border-border bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
          <p className="text-[10px] text-muted-foreground">
            {count.value} {count.label}
            {count.value === 1 ? "" : "s"} · {profile.contact}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
