"use client";

import { FlaskConical, GraduationCap } from "lucide-react";

import { cn } from "@/lib/utils";

type Role = "student" | "researcher";

type RoleBadgeProps = {
  role: Role;
  className?: string;
};

const ROLE_STYLES: Record<
  Role,
  { label: string; Icon: typeof GraduationCap; className: string }
> = {
  student: {
    label: "Student",
    Icon: GraduationCap,
    className: "border-foreground/15 bg-muted text-foreground",
  },
  researcher: {
    label: "Researcher",
    Icon: FlaskConical,
    className: "border-primary/30 bg-primary/5 text-primary",
  },
};

export function RoleBadge({ role, className }: RoleBadgeProps) {
  const { label, Icon, className: roleClassName } = ROLE_STYLES[role];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide",
        roleClassName,
        className
      )}
    >
      <Icon className="size-3" />
      {label}
    </span>
  );
}
