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
import type { Profile } from "@/lib/profile";

type ProfileCardProps = {
  profile: Profile;
  matchScore?: number;
  sharedTags?: string[];
  className?: string;
};

export function ProfileCard({
  profile,
  matchScore,
  sharedTags = [],
  className,
}: ProfileCardProps) {
  return (
    <Link href={`/profile/${profile.id}`} className={cn("group block", className)}>
      <Card className="h-full transition-colors hover:bg-muted/30">
        <CardHeader className="pb-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <CardTitle className="truncate font-sans">{profile.name}</CardTitle>
              <CardDescription className="line-clamp-2">
                {profile.summary}
              </CardDescription>
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
            {profile.links.length} link{profile.links.length === 1 ? "" : "s"} ·{" "}
            {profile.contact}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
