import { z } from "zod";

export const onboardSchema = z.object({
  email: z.email("Enter a valid email address"),
  contact: z
    .string()
    .trim()
    .min(1, "Contact is required")
    .min(2, "Contact must be at least 2 characters"),
  linksRaw: z.string(),
  summary: z
    .string()
    .trim()
    .min(1, "Summary is required")
    .min(20, "Write at least a short summary (20+ characters)"),
});

export type OnboardFormValues = z.infer<typeof onboardSchema>;

export const onboardStepOneSchema = onboardSchema.pick({
  email: true,
  contact: true,
  linksRaw: true,
});

export const onboardStepOneFields = ["email", "contact", "linksRaw"] as const;

export type OnboardStepOneField = (typeof onboardStepOneFields)[number];
