import "server-only";

import { cookies } from "next/headers";

export const ASSUMED_USER_COOKIE = "milo_assumed_user";

const THIRTY_DAYS_SECONDS = 60 * 60 * 24 * 30;

export const ASSUMED_USER_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: THIRTY_DAYS_SECONDS,
};

export async function getAssumedUserId(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(ASSUMED_USER_COOKIE)?.value ?? null;
}
