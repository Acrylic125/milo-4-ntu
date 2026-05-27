import "server-only";

import { eq, inArray } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { patents, profiles } from "@/db/schema";
import { embedTechOffer } from "@/lib/embedding";
import { collectAllListingUrls } from "@/lib/scrape-ntu-listing";
import { scrapeNtuTechOffer, type ScrapedTechOffer } from "@/lib/scrape-ntu-tech";
import { createTRPCRouter, publicProcedure } from "@/trpc/init";

const SEED_EMAIL_DOMAIN = "ntu-tech-portal.seed";
const SEED_CONTACT = "Listed on NTU Tech Portal";
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
          const message = err instanceof Error ? err.message : String(err);
          console.warn(`${label} — scrape failed: ${message}`);
        }

        await sleep(FETCH_DELAY_MS);
      }

      console.log(
        `[seed] scraped ${scrapedDetails} details, ${inventorsByEmail.size} unique inventors`
      );

      // Re-use existing profiles when their seed email already exists so the
      // job is idempotent. We look up in bulk to avoid N+1 round-trips.
      const emails = Array.from(inventorsByEmail.keys());
      const existing =
        emails.length === 0
          ? []
          : await db
              .select({ id: profiles.id, email: profiles.email })
              .from(profiles)
              .where(inArray(profiles.email, emails));

      const profileIdByEmail = new Map(existing.map((row) => [row.email, row.id]));

      const toCreate = Array.from(inventorsByEmail.values()).filter(
        (bucket) => !profileIdByEmail.has(bucket.email)
      );

      let profilesCreated = 0;
      if (toCreate.length > 0) {
        const inserted = await db
          .insert(profiles)
          .values(
            toCreate.map((bucket) => ({
              name: bucket.name,
              email: bucket.email,
              contact: SEED_CONTACT,
              role: "researcher" as const,
            }))
          )
          .returning({ id: profiles.id, email: profiles.email });

        for (const row of inserted) {
          profileIdByEmail.set(row.email, row.id);
        }
        profilesCreated = inserted.length;
        console.log(`[seed] created ${profilesCreated} new inventor profiles`);
      } else {
        console.log("[seed] no new profiles to create");
      }

      // De-dupe patents per profile against what's already stored before we
      // insert. `patents.links` holds a single URL per row.
      const profileIds = Array.from(profileIdByEmail.values());
      const existingPatents =
        profileIds.length === 0
          ? []
          : await db
              .select({
                profileId: patents.profileId,
                link: patents.links,
              })
              .from(patents)
              .where(inArray(patents.profileId, profileIds));

      const existingKey = new Set(
        existingPatents.map((row) => `${row.profileId}::${row.link}`)
      );

      type PatentInsert = typeof patents.$inferInsert;
      const patentRows: PatentInsert[] = [];

      for (const bucket of inventorsByEmail.values()) {
        const profileId = profileIdByEmail.get(bucket.email);
        if (!profileId) continue;

        // Within this run, an inventor can show up on multiple listings — we
        // de-dupe by URL there too.
        const seenInRun = new Set<string>();
        for (const patent of bucket.patents) {
          const key = `${profileId}::${patent.url}`;
          if (seenInRun.has(key) || existingKey.has(key)) continue;
          seenInRun.add(key);
          patentRows.push({
            profileId,
            title: patent.title,
            links: patent.url,
            embedding: patent.embedding ?? undefined,
          });
        }
      }

      let patentsInserted = 0;
      if (patentRows.length > 0) {
        // Insert in chunks to keep the SQL payload reasonable.
        const CHUNK = 100;
        for (let i = 0; i < patentRows.length; i += CHUNK) {
          const chunk = patentRows.slice(i, i + CHUNK);
          await db.insert(patents).values(chunk);
          patentsInserted += chunk.length;
        }
        console.log(`[seed] inserted ${patentsInserted} patent rows`);
      } else {
        console.log("[seed] no new patent rows to insert");
      }

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
    }),

  /**
   * Light-weight probe used by the /seed page to show how many profiles &
   * patents currently look seed-sourced (i.e. have the seed email domain).
   */
  status: publicProcedure.query(async () => {
    const seedProfiles = await db
      .select({ id: profiles.id })
      .from(profiles)
      .where(eq(profiles.contact, SEED_CONTACT));

    const profileIds = seedProfiles.map((row) => row.id);
    const patentCount =
      profileIds.length === 0
        ? 0
        : (
            await db
              .select({ id: patents.id })
              .from(patents)
              .where(inArray(patents.profileId, profileIds))
          ).length;

    return {
      seedProfileCount: seedProfiles.length,
      seedPatentCount: patentCount,
    };
  }),
});
