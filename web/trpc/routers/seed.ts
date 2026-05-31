import "server-only";

import { TRPCError } from "@trpc/server";
import { inArray, like } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { patents, userSearchProfile, users } from "@/db/schema";
import { embedTechOffer } from "@/lib/embedding";
import { collectAllListingUrls } from "@/lib/scrape-ntu-listing";
import {
  scrapeNtuTechOffer,
  type ScrapedTechOffer,
} from "@/lib/scrape-ntu-tech";
import { createTRPCRouter, publicProcedure } from "@/trpc/init";

const SEED_EMAIL_DOMAIN = "fake-ntu.edu.sg";
const FETCH_DELAY_MS = 150;

const runInput = z
  .object({
    /** Cap the number of detail URLs to scrape — handy while developing. */
    maxItems: z.number().int().positive().max(1000).optional(),
  })
  .optional();

const runOutput = z.object({
  totalListed: z.number().int().nonnegative(),
  scrapedDetails: z.number().int().nonnegative(),
  inventorsFound: z.number().int().nonnegative(),
  profilesCreated: z.number().int().nonnegative(),
  patentsInserted: z.number().int().nonnegative(),
  skipped: z.number().int().nonnegative(),
});

function slugifyName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

function inventorEmail(name: string): string {
  const slug = slugifyName(name) || "inventor";
  return `${slug}@${SEED_EMAIL_DOMAIN}`;
}

function createUserId(): string {
  return crypto.randomUUID();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type SeedPatent = {
  url: string;
  title: string;
  embedding: number[] | null;
};

type InventorBucket = {
  name: string;
  email: string;
  patents: SeedPatent[];
};

function describeError(err: unknown): string {
  if (typeof err === "object" && err !== null) {
    const cause = Reflect.get(err, "cause");
    if (cause && cause !== err) {
      const causeMessage = describeError(cause);
      if (causeMessage && causeMessage !== "[object Object]") {
        return causeMessage;
      }
    }
  }

  if (err instanceof Error) {
    return err.message;
  }

  if (typeof err === "object" && err !== null) {
    const message = Reflect.get(err, "message");
    if (typeof message === "string" && message.trim().length > 0) {
      return message;
    }

    const detail = Reflect.get(err, "detail");
    if (typeof detail === "string" && detail.trim().length > 0) {
      return detail;
    }

    const constraint = Reflect.get(err, "constraint");
    if (typeof constraint === "string" && constraint.trim().length > 0) {
      return `Constraint violation: ${constraint}`;
    }

    try {
      return JSON.stringify(err);
    } catch {
      return String(err);
    }
  }

  return String(err);
}

async function safeEmbed(offer: ScrapedTechOffer): Promise<number[] | null> {
  try {
    const result = await embedTechOffer({
      synopsis: offer.synopsis,
      opportunity: offer.opportunity,
      technology: offer.technology,
      applications: offer.applications,
    });
    return result.embedding;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`[seed]   ! embedding failed for ${offer.url}: ${message}`);
    return null;
  }
}

export const seedRouter = createTRPCRouter({
  run: publicProcedure
    .input(runInput)
    .output(runOutput)
    .mutation(async ({ input }) => {
      const startedAt = Date.now();
      console.log("[seed] starting NTU tech-portal seed run");

      try {
        const listing = await collectAllListingUrls(
          ({ page, totalPages, pageItems, totalCollected }) => {
            console.log(
              `[seed] listing page ${page}/${totalPages}: +${pageItems} new, ${totalCollected} total`
            );
          }
        );

        console.log(`[seed] consolidated ${listing.length} detail URLs`);

        const targets =
          input?.maxItems != null ? listing.slice(0, input.maxItems) : listing;
        if (targets.length !== listing.length) {
          console.log(
            `[seed] limiting to first ${targets.length} URLs (maxItems=${input?.maxItems})`
          );
        }

        const inventorsByEmail = new Map<string, InventorBucket>();
        let scrapedDetails = 0;
        let skipped = 0;

        for (let i = 0; i < targets.length; i += 1) {
          const { url } = targets[i]!;
          const label = `[seed] (${i + 1}/${targets.length}) ${url}`;
          try {
            const offer = await scrapeNtuTechOffer(url);
            scrapedDetails += 1;

            if (offer.inventors.length === 0) {
              skipped += 1;
              console.log(`${label} — no inventors, skipping`);
              await sleep(FETCH_DELAY_MS);
              continue;
            }

            const embedding = await safeEmbed(offer);
            const patent: SeedPatent = {
              url: offer.url,
              title: offer.title,
              embedding,
            };

            for (const name of offer.inventors) {
              const email = inventorEmail(name);
              const bucket = inventorsByEmail.get(email);
              if (bucket) {
                bucket.patents.push(patent);
              } else {
                inventorsByEmail.set(email, {
                  name,
                  email,
                  patents: [patent],
                });
              }
            }

            console.log(
              `${label} — inventors: ${offer.inventors.join(", ")} (${
                embedding ? "embedded" : "no embedding"
              })`
            );
          } catch (err) {
            skipped += 1;
            console.warn(`${label} — scrape failed: ${describeError(err)}`);
          }

          await sleep(FETCH_DELAY_MS);
        }

        console.log(
          `[seed] scraped ${scrapedDetails} details, ${inventorsByEmail.size} unique inventors`
        );

        const emails = Array.from(inventorsByEmail.keys());
        const { profilesCreated, patentsInserted } = await db.transaction(
          async (tx) => {
            const existingUsers =
              emails.length === 0
                ? []
                : await tx
                    .select({
                      id: users.id,
                      email: users.email,
                    })
                    .from(users)
                    .where(inArray(users.email, emails));

            const userIdByEmail = new Map(
              existingUsers.map((row) => [row.email, row.id])
            );

            const usersToCreate = Array.from(inventorsByEmail.values()).filter(
              (bucket) => !userIdByEmail.has(bucket.email)
            );

            if (usersToCreate.length > 0) {
              const insertedUsers = await tx
                .insert(users)
                .values(
                  usersToCreate.map((bucket) => ({
                    id: createUserId(),
                    name: bucket.name,
                    email: bucket.email,
                  }))
                )
                .returning({ id: users.id, email: users.email });

              for (const row of insertedUsers) {
                userIdByEmail.set(row.email, row.id);
              }
              console.log(`[seed] created ${insertedUsers.length} seed users`);
            } else {
              console.log("[seed] no new users to create");
            }

            const userIds = Array.from(userIdByEmail.values());
            const existingProfiles =
              userIds.length === 0
                ? []
                : await tx
                    .select({
                      id: userSearchProfile.id,
                      userId: userSearchProfile.userId,
                    })
                    .from(userSearchProfile)
                    .where(inArray(userSearchProfile.userId, userIds));

            const profileIdByUserId = new Map(
              existingProfiles.map((row) => [row.userId, row.id])
            );

            const profilesToCreate = Array.from(
              inventorsByEmail.values()
            ).filter((bucket) => {
              const userId = userIdByEmail.get(bucket.email);
              return userId != null && !profileIdByUserId.has(userId);
            });

            let profilesCreated = 0;
            if (profilesToCreate.length > 0) {
              const insertedProfiles = await tx
                .insert(userSearchProfile)
                .values(
                  profilesToCreate.map((bucket) => ({
                    userId: userIdByEmail.get(bucket.email)!,
                    role: "researcher" as const,
                  }))
                )
                .returning({
                  id: userSearchProfile.id,
                  userId: userSearchProfile.userId,
                });

              for (const row of insertedProfiles) {
                if (row.userId) {
                  profileIdByUserId.set(row.userId, row.id);
                }
              }
              profilesCreated = insertedProfiles.length;
              console.log(
                `[seed] created ${profilesCreated} new inventor profiles`
              );
            } else {
              console.log("[seed] no new profiles to create");
            }

            const existingPatents =
              userIds.length === 0
                ? []
                : await tx
                    .select({
                      userId: patents.userId,
                      link: patents.links,
                    })
                    .from(patents)
                    .where(inArray(patents.userId, userIds));

            const existingKey = new Set(
              existingPatents.map((row) => `${row.userId}::${row.link}`)
            );

            type PatentInsert = typeof patents.$inferInsert;
            const patentRows: PatentInsert[] = [];

            for (const bucket of inventorsByEmail.values()) {
              const userId = userIdByEmail.get(bucket.email);
              if (!userId) continue;

              const seenInRun = new Set<string>();
              for (const patent of bucket.patents) {
                const key = `${userId}::${patent.url}`;
                if (seenInRun.has(key) || existingKey.has(key)) continue;
                seenInRun.add(key);
                patentRows.push({
                  userId,
                  title: patent.title,
                  links: patent.url,
                  embedding: patent.embedding ?? undefined,
                });
              }
            }

            let patentsInserted = 0;
            if (patentRows.length > 0) {
              const CHUNK = 100;
              for (let i = 0; i < patentRows.length; i += CHUNK) {
                const chunk = patentRows.slice(i, i + CHUNK);
                await tx.insert(patents).values(chunk);
                patentsInserted += chunk.length;
              }
              console.log(`[seed] inserted ${patentsInserted} patent rows`);
            } else {
              console.log("[seed] no new patent rows to insert");
            }

            return { profilesCreated, patentsInserted };
          }
        );

        const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
        console.log(
          `[seed] done in ${elapsed}s — profiles created: ${profilesCreated}, patents inserted: ${patentsInserted}`
        );

        return {
          totalListed: listing.length,
          scrapedDetails,
          inventorsFound: inventorsByEmail.size,
          profilesCreated,
          patentsInserted,
          skipped,
        };
      } catch (err) {
        const message = describeError(err);
        console.error("[seed] run failed", err);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Seed failed: ${message}`,
          cause: err,
        });
      }
    }),

  /**
   * Light-weight probe used by the /seed page to show how many profiles &
   * patents currently look seed-sourced (i.e. have the seed email domain).
   */
  status: publicProcedure.query(async () => {
    const seedUsers = await db
      .select({ id: users.id })
      .from(users)
      .where(like(users.email, `%@${SEED_EMAIL_DOMAIN}`));

    const userIds = seedUsers.map((row) => row.id);
    const seedProfiles =
      userIds.length === 0
        ? []
        : await db
            .select({ id: userSearchProfile.id })
            .from(userSearchProfile)
            .where(inArray(userSearchProfile.userId, userIds));

    const patentCount =
      userIds.length === 0
        ? 0
        : (
            await db
              .select({ id: patents.id })
              .from(patents)
              .where(inArray(patents.userId, userIds))
          ).length;

    return {
      seedProfileCount: seedProfiles.length,
      seedPatentCount: patentCount,
    };
  }),
});
