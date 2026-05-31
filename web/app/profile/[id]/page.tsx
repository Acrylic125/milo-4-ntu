import { eq } from "drizzle-orm";
import Link from "next/link";
import { ArrowLeft, SquareArrowOutUpRight } from "lucide-react";

import { ProfileEditForm } from "@/components/profile-edit-form";
import { RoleBadge } from "@/components/role-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { db } from "@/db";
import { patents, userSearchProfile, users } from "@/db/schema";
import { getSession } from "@/lib/session";

type ProfilePageProps = {
  params: Promise<{ id: string }>;
};

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { id } = await params;
  const profile = UUID_REGEX.test(id) ? await loadProfile(id) : null;
  const session = await getSession();

  if (!profile) {
    return (
      <div className="flex min-h-full flex-col">
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

  const isOwnProfile = session?.user?.id === profile.userId;

  return (
    <div className="flex min-h-full flex-col">
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">
        {isOwnProfile ? (
          <ProfileEditForm
            profileId={profile.id}
            initialName={profile.name}
            initialRole={profile.role}
            initialPatentLinks={profile.links.map((link) => link.url)}
          />
        ) : (
          <div className="space-y-6">
            <header className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <RoleBadge role={profile.role} />
              </div>
              <h1 className="font-sans text-2xl font-medium tracking-tight">
                {profile.name}
              </h1>
              <p className="text-sm text-muted-foreground">{profile.email}</p>
            </header>

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
        )}
      </main>
    </div>
  );
}

async function loadProfile(id: string) {
  const [profile] = await db
    .select({
      id: userSearchProfile.id,
      userId: userSearchProfile.userId,
      name: users.name,
      email: users.email,
      role: userSearchProfile.role,
      tags: userSearchProfile.tags,
    })
    .from(userSearchProfile)
    .innerJoin(users, eq(userSearchProfile.userId, users.id))
    .where(eq(userSearchProfile.id, id))
    .limit(1);

  if (!profile?.userId) return null;

  const patentRows = await db
    .select({
      id: patents.id,
      title: patents.title,
      links: patents.links,
    })
    .from(patents)
    .where(eq(patents.userId, profile.userId));

  return {
    id: profile.id,
    userId: profile.userId,
    name: profile.name,
    email: profile.email,
    links: patentRows.map((patent) => ({
      label: patent.title,
      url: patent.links,
    })),
    role: profile.role,
    tags: profile.tags,
  };
}
