import "server-only";

import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { db } from "@/db";
import { patents, userSearchProfile } from "@/db/schema";
import { getCurrentProfileIdForUser } from "@/lib/current-profile";
import { embedTechOffer, embedText } from "@/lib/embedding";
import { NTU_TECH_OFFER_PREFIX } from "@/lib/onboard-schema";
import { scrapeNtuTechOffer } from "@/lib/scrape-ntu-tech";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";

const ntuTechLink = z
  .url("Each link must be a valid URL")
  .refine(
    (url) => url.startsWith(NTU_TECH_OFFER_PREFIX),
    `Each link must start with ${NTU_TECH_OFFER_PREFIX}`
  );

const baseInput = {
  email: z.email(),
  contact: z.string().trim().min(2),
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
  links: z.array(ntuTechLink).min(1, "Add at least one NTU tech-portal link"),
  problemSolving: z
    .string()
    .trim()
    .min(20, "Tell us a bit more about the problem you are trying to solve"),
});

const submitInput = z.discriminatedUnion("role", [
  studentInput,
  researcherInput,
]);

const submitOutput = z.object({
  profileId: z.string().uuid(),
  patentCount: z.number().int().nonnegative(),
});

export const onboardRouter = createTRPCRouter({
  submit: protectedProcedure
    .input(submitInput)
    .output(submitOutput)
    .mutation(async ({ ctx, input }) => {
      const existingProfileId = await getCurrentProfileIdForUser(
        ctx.session.user
      );
      if (existingProfileId) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Your account already has a profile.",
        });
      }

      const lookingFor =
        input.role === "researcher" ? input.problemSolving : input.interestedIn;

      const researcherLinks = input.role === "researcher" ? input.links : [];

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
        return await db.transaction(async (tx) => {
          const [profile] = await tx
            .insert(userSearchProfile)
            .values({
              userId: ctx.session.user.id,
              role: input.role,
              lookingFor,
              lookingForEmbedding: lookingForEmbedding ?? undefined,
            })
            .returning({ id: userSearchProfile.id });

          if (!profile) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Could not create profile",
            });
          }

          if (scraped.length > 0) {
            await tx.insert(patents).values(
              scraped.map(({ offer, embedding }) => ({
                userId: ctx.session.user.id,
                title: offer.title,
                links: offer.url,
                embedding,
              }))
            );
          }

          return { profileId: profile.id, patentCount: scraped.length };
        });
      } catch (err) {
        if (err instanceof TRPCError) throw err;
        const message =
          err instanceof Error ? err.message : "Unknown database error";
        if (/duplicate|unique/i.test(message)) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Your account already has a profile.",
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message,
        });
      }
    }),
});
