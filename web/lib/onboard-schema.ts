import { z } from "zod";

export const NTU_TECH_OFFER_PREFIX =
  "https://www.ntu.edu.sg/innovates/tech-portal/tech-offers/detail";

export function parseLinksRaw(raw: string): string[] {
  return raw
    .split(/[\n,]+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export const onboardSchema = z.object({
  email: z.email("Enter a valid email address"),
  contact: z
    .string()
    .trim()
    .min(1, "Contact is required")
    .min(2, "Contact must be at least 2 characters"),
  linksRaw: z
    .string()
    .trim()
    .min(1, "Add at least one NTU tech-portal link")
    .refine(
      (raw) => {
        const links = parseLinksRaw(raw);
        return (
          links.length > 0 &&
          links.every((url) => url.startsWith(NTU_TECH_OFFER_PREFIX))
        );
      },
      `Every link must start with ${NTU_TECH_OFFER_PREFIX}`
    ),
  workingOn: z
    .string()
    .trim()
    .min(1, "Tell us what you're working on")
    .min(20, "Add at least a sentence (20+ characters)"),
});

export type OnboardFormValues = z.infer<typeof onboardSchema>;

export const onboardStepOneSchema = onboardSchema.pick({
  email: true,
  contact: true,
  linksRaw: true,
});

export const onboardStepOneFields = ["email", "contact", "linksRaw"] as const;

export type OnboardStepOneField = (typeof onboardStepOneFields)[number];
