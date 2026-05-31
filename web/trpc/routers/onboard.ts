import "server-only";

import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { db } from "@/db";
import { patents, userSearchProfile } from "@/db/schema";
import { getCurrentProfileIdForUser } from "@/lib/current-profile";
import { embedTechOffer, embedText } from "@/lib/embedding";
import { scrapeNtuTechOffer } from "@/lib/scrape-ntu-tech";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { OnboardSchema } from "@/components/onboard-form-types";

export const onboardRouter = createTRPCRouter({
  verifyUrl: protectedProcedure
    .input(
      z.object({
        url: z.string().trim().url(),
      })
    )
    .query(async ({ input }) => {
      try {
        let response = await fetch(input.url, {
          method: "HEAD",
          redirect: "follow",
          cache: "no-store",
        });

        if (response.status === 405) {
          response = await fetch(input.url, {
            method: "GET",
            redirect: "follow",
            cache: "no-store",
          });
        }

        return {
          exists: response.ok,
          status: response.status,
        };
      } catch {
        return {
          exists: false,
          status: null,
        };
      }
    }),
  submit: protectedProcedure
    .input(OnboardSchema)
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

      const researcherLinks = input.role === "researcher" ? input.myWork : [];

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
