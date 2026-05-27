import { eq } from "drizzle-orm";
import Link from "next/link";

import { ProfileDetail } from "@/components/profile-detail";
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
import { profiles } from "@/db/schema";
import { ArrowLeft } from "lucide-react";
import type { Profile } from "@/lib/profile";

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

  return <ProfileDetail profile={profile} />;
}

async function loadProfile(id: string): Promise<Profile | null> {
  // Temporary assertion until the duplicated Drizzle package types are unified.
  const [row] = (await db
    .select()
    .from(profiles)
    .where(eq(profiles.id, id))
    .limit(1)) as Array<typeof profiles.$inferSelect>;

  if (!row) return null;

  return {
    id: row.id,
    name: row.name,
    email: row.email,
    contact: row.contact,
    linksRaw: row.linksRaw,
    links: row.links,
    summary: row.synopsis,
    role: row.role,
    tags: row.tags,
  };
}
