import { eq } from "drizzle-orm";
import Link from "next/link";
import { ArrowLeft, Mail, Phone, SquareArrowOutUpRight } from "lucide-react";

import { RoleBadge } from "@/components/role-badge";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { db } from "@/db";
import { patents, profiles } from "@/db/schema";

type ProfilePageProps = {
  params: Promise<{ id: string }>;
};

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { id } = await params;
  const profile = UUID_REGEX.test(id) ? await loadProfile(id) : null;

  if (!profile) {
    return (
      <div className="flex min-h-full flex-col">
        <SiteHeader />
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-16 sm:px-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile not found</CardTitle>
              <CardDescription>
                This member may not exist in the directory yet.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" size="sm">
                <Link href="/">
                  <ArrowLeft />
                  Back to discover
                </Link>
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader />

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6">
        <Button variant="ghost" size="xs" asChild className="-ml-2 mb-6 w-fit">
          <Link href="/">
            <ArrowLeft />
            All profiles
          </Link>
        </Button>

        <div className="space-y-6">
          <header className="space-y-3 border border-border p-5">
            <div className="flex flex-wrap items-center gap-2">
              <RoleBadge role={profile.role} />
            </div>
            <h1 className="font-sans text-2xl font-medium tracking-tight">
              {profile.name}
            </h1>
          </header>

          <section className="grid gap-4 sm:grid-cols-2">
            <Card size="sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-sans">Contact</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                <p className="flex items-center gap-2">
                  <Mail className="size-3.5 text-muted-foreground" />
                  <a
                    href={`mailto:${profile.email}`}
                    className="underline-offset-4 hover:underline"
                  >
                    {profile.email}
                  </a>
                </p>
                <p className="flex items-start gap-2">
                  <Phone className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                  <span>{profile.contact}</span>
                </p>
              </CardContent>
            </Card>

            <Card size="sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-sans">Focus areas</CardTitle>
                <CardDescription>Used for match ranking</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1">
                  {profile.tags.length > 0 ? (
                    profile.tags.map((tag) => (
                      <span
                        key={tag}
                        className="border border-border bg-muted/40 px-1.5 py-0.5 text-[10px]"
                      >
                        {tag}
                      </span>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      No tags inferred yet.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </section>

          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-sans text-sm font-medium">
                Projects & links
              </h2>
              <span className="text-[10px] text-muted-foreground">
                {profile.links.length} item
                {profile.links.length === 1 ? "" : "s"}
              </span>
            </div>

            {profile.links.length === 0 ? (
              <Card>
                <CardContent className="py-6 text-xs text-muted-foreground">
                  No links added yet.
                </CardContent>
              </Card>
            ) : (
              <ul className="divide-y divide-border border border-border">
                {profile.links.map((link) => (
                  <li key={link.url}>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between gap-3 px-4 py-3 text-xs transition-colors hover:bg-muted/40"
                    >
                      <span>
                        <span className="font-medium">{link.label}</span>
                        <span className="mt-0.5 block text-[10px] text-muted-foreground">
                          {link.url}
                        </span>
                      </span>
                      <SquareArrowOutUpRight className="size-4 shrink-0 text-muted-foreground" />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

async function loadProfile(id: string) {
  const [profileRow, patentRow] = await Promise.all([
    db
      .select({
        id: profiles.id,
        name: profiles.name,
        email: profiles.email,
        contact: profiles.contact,
        role: profiles.role,
        tags: profiles.tags,
      })
      .from(profiles)
      .where(eq(profiles.id, id))
      .limit(1),
    db
      .select({
        id: patents.id,
        title: patents.title,
        links: patents.links,
      })
      .from(patents)
      .where(eq(patents.id, id))
      .limit(1),
  ]);

  if (!profileRow || !patentRow) return null;
  const profile = profileRow[0];

  return {
    id: profile.id,
    name: profile.name,
    email: profile.email,
    contact: profile.contact,
    links: patentRow.map((patent) => ({
      label: patent.title,
      url: patent.links,
    })),
    role: profile.role,
    tags: profile.tags,
  };
}
