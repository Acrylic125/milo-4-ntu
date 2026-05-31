import "server-only";

import { and, eq, isNull } from "drizzle-orm";

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

  if (linkedProfile) {
    return linkedProfile.id;
  }

  if (!user.email) {
    return null;
  }

  const [emailMatchedProfile] = await db
    .select({ id: userSearchProfile.id })
    .from(userSearchProfile)
    .where(
      and(
        eq(userSearchProfile.email, user.email),
        isNull(userSearchProfile.userId)
      )
    )
    .limit(1);

  if (!emailMatchedProfile) {
    return null;
  }

  const [updatedProfile] = await db
    .update(userSearchProfile)
    .set({
      userId: user.id,
      updatedAt: new Date(),
    })
    .where(eq(userSearchProfile.id, emailMatchedProfile.id))
    .returning({ id: userSearchProfile.id });

  return updatedProfile?.id ?? emailMatchedProfile.id;
}
