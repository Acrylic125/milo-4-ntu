import "server-only";

import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { db } from "@/db";
import { patents, profiles } from "@/db/schema";
import { embedTechOffer } from "@/lib/embedding";
import { NTU_TECH_OFFER_PREFIX } from "@/lib/onboard-schema";
import { scrapeNtuTechOffer } from "@/lib/scrape-ntu-tech";
import { createTRPCRouter, publicProcedure } from "@/trpc/init";

const ntuTechLink = z
  .url("Each link must be a valid URL")
  .refine(
    (url) => url.startsWith(NTU_TECH_OFFER_PREFIX),
    `Each link must start with ${NTU_TECH_OFFER_PREFIX}`
  );

const submitInput = z.object({
  email: z.email(),
  contact: z.string().trim().min(2),
  name: z.string().trim().min(1).optional(),
  role: z.enum(["researcher", "founder"]).optional(),
  links: z.array(ntuTechLink).min(1, "Add at least one NTU tech-portal link"),
});

const submitOutput = z.object({
  profileId: z.string().uuid(),
  patentCount: z.number().int().nonnegative(),
});

function displayNameFromEmail(email: string): string {
  const local = email.split("@")[0] ?? "New member";
  const formatted = local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
  return formatted || "New member";
}

export const onboardRouter = createTRPCRouter({
  submit: publicProcedure
    .input(submitInput)
    .output(submitOutput)
    .mutation(async ({ input }) => {
      // Scrape + embed every link before touching the DB so a failure aborts
      // cleanly with no half-written profile.
      const scraped = await Promise.all(
        input.links.map(async (url) => {
          const offer = await scrapeNtuTechOffer(url);
          const embedded = await embedTechOffer({
            synopsis: offer.synopsis,
            opportunity: offer.opportunity,
            technology: offer.technology,
            applications: offer.applications,
          });
          return { offer, embedding: embedded.embedding };
        })
      );

      try {
        const [profile] = await db
          .insert(profiles)
          .values({
            name: input.name ?? displayNameFromEmail(input.email),
            email: input.email,
            contact: input.contact,
            role: input.role ?? "researcher",
          })
          .returning({ id: profiles.id });

        if (!profile) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Could not create profile",
          });
        }

        if (scraped.length > 0) {
          await db.insert(patents).values(
            scraped.map(({ offer, embedding }) => ({
              profileId: profile.id,
              title: offer.title,
              links: offer.url,
              embedding,
            }))
          );
        }

        return { profileId: profile.id, patentCount: scraped.length };
      } catch (err) {
        if (err instanceof TRPCError) throw err;
        const message =
          err instanceof Error ? err.message : "Unknown database error";
        if (/duplicate|unique/i.test(message)) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "A profile with this email already exists.",
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message,
        });
      }
    }),
});
