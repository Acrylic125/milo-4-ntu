import { z } from "zod";

export const StudentOnboardSchema = z.object({
  interestedIn: z
    .string()
    .trim()
    .min(
      20,
      "Tell us a bit more about what you're interested in (20 characters minimum)"
    ),
});

export const NTU_TECH_OFFER_PREFIX =
  "https://www.ntu.edu.sg/innovates/tech-portal/tech-offers/detail";

export const ResearcherOnboardSchema = z.object({
  myWork: z
    .array(
      z
        .url()
        .trim()
        //   .min(1, "Add at least one NTU tech-portal link")
        .refine(
          (url) => url.startsWith(NTU_TECH_OFFER_PREFIX),
          `Each link must start with ${NTU_TECH_OFFER_PREFIX}`
        )
    )
    .superRefine((links, ctx) => {
      const firstSeen = new Map<string, number>();

      links.forEach((link, index) => {
        const normalized = link.trim().toLowerCase();
        const firstIndex = firstSeen.get(normalized);

        if (firstIndex == null) {
          firstSeen.set(normalized, index);
          return;
        }

        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [index],
          message: `Duplicate link (same as link #${firstIndex + 1})`,
        });
      });
    }),
  problemSolving: z
    .string()
    .trim()
    .min(
      20,
      "Tell us a bit more about the problem you are trying to solve (20 characters minimum)"
    ),
});

export const OnboardSchema = z.discriminatedUnion("role", [
  z.object({
    role: z.literal("student"),
    ...StudentOnboardSchema.shape,
  }),
  z.object({
    role: z.literal("researcher"),
    ...ResearcherOnboardSchema.shape,
  }),
]);
