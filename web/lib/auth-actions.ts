"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  ASSUMED_USER_COOKIE,
  ASSUMED_USER_COOKIE_OPTIONS,
} from "@/lib/auth-cookie";

const profileIdSchema = z.string().uuid();

export async function assumeUser(profileId: string): Promise<void> {
  const id = profileIdSchema.parse(profileId);
  const jar = await cookies();
  jar.set(ASSUMED_USER_COOKIE, id, ASSUMED_USER_COOKIE_OPTIONS);
  revalidatePath("/", "layout");
}

export async function clearAssumedUser(): Promise<void> {
  const jar = await cookies();
  jar.delete(ASSUMED_USER_COOKIE);
  revalidatePath("/", "layout");
}
