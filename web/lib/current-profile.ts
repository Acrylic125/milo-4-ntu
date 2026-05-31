import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/db";
import { userSearchProfile } from "@/db/schema";

type SessionUser = {
  id: string;
  email?: string | null;
};

export async function getCurrentProfileIdForUser(
  user: SessionUser | null | undefined
): Promise<string | null> {
  if (!user) {
    return null;
  }

  const [linkedProfile] = await db
    .select({ id: userSearchProfile.id })
    .from(userSearchProfile)
    .where(eq(userSearchProfile.userId, user.id))
    .limit(1);

  return linkedProfile?.id ?? null;
}
