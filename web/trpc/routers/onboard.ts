import "server-only";

import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { db } from "@/db";
import { patents, profiles } from "@/db/schema";
import { embedTechOffer, embedText } from "@/lib/embedding";
import { NTU_TECH_OFFER_PREFIX } from "@/lib/onboard-schema";
import { scrapeNtuTechOffer } from "@/lib/scrape-ntu-tech";
import { createTRPCRouter, publicProcedure } from "@/trpc/init";

const ntuTechLink = z
  .url("Each link must be a valid URL")
  .refine(
    (url) => url.startsWith(NTU_TECH_OFFER_PREFIX),
    `Each link must start with ${NTU_TECH_OFFER_PREFIX}`
  );

// Shared fields for every onboarding role.
const baseInput = {
  email: z.email(),
  contact: z.string().trim().min(2),
  name: z.string().trim().min(1).optional(),
};

const studentInput = z.object({
  ...baseInput,
  role: z.literal("student"),
  interestedIn: z
    .string()
    .trim()
    .min(20, "Tell us a bit more about what you're interested in"),
});

const researcherInput = z.object({
  ...baseInput,
  role: z.literal("researcher"),
  // "My work" textarea: parsed NTU tech-portal links that we scrape into
  // the `patents` table.
  links: z.array(ntuTechLink).min(1, "Add at least one NTU tech-portal link"),
  // "Problem I am trying to solve" textarea: free text, stored as lookingFor.
  problemSolving: z
    .string()
    .trim()
    .min(20, "Tell us a bit more about the problem you are trying to solve"),
});

const submitInput = z.discriminatedUnion("role", [studentInput, researcherInput]);

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
      // `lookingFor` carries the descriptive blob we embed for similarity
      // search — it's the student's "interested in" or the researcher's
      // "problem I am trying to solve" paragraph, depending on role.
      const lookingFor =
        input.role === "researcher" ? input.problemSolving : input.interestedIn;

      // Researchers also paste NTU tech-portal links (from the "My work"
      // textarea) that we scrape into patent rows. Students don't have any.
      const researcherLinks =
        input.role === "researcher" ? input.links : [];

      // Scrape + embed everything before touching the DB so a failure aborts
      // cleanly with no half-written profile.
      const [scraped, lookingForEmbedding] = await Promise.all([
        Promise.all(
          researcherLinks.map(async (url) => {
            const offer = await scrapeNtuTechOffer(url);
            const embedded = await embedTechOffer({
              synopsis: offer.synopsis,
              opportunity: offer.opportunity,
              technology: offer.technology,
              applications: offer.applications,
            });
            return { offer, embedding: embedded.embedding };
          })
        ),
        embedText(lookingFor),
      ]);

      try {
        const [profile] = await db
          .insert(profiles)
          .values({
            name: input.name ?? displayNameFromEmail(input.email),
            email: input.email,
            contact: input.contact,
            role: input.role,
            lookingFor,
            lookingForEmbedding: lookingForEmbedding ?? undefined,
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
