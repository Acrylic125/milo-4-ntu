import type { FieldErrors, Resolver } from "react-hook-form";
import { z } from "zod";

import {
  onboardSchema,
  onboardStepContentResearcherSchema,
  onboardStepContentStudentSchema,
  type OnboardFormValues,
} from "@/lib/onboard-schema";

// Discriminated by role so RHF only reports errors for the textareas the
// user is actually supposed to fill in.
const fullSchema = onboardSchema.superRefine((data, ctx) => {
  if (data.role === "researcher") {
    const parsed = onboardStepContentResearcherSchema.safeParse(data);
    if (!parsed.success) {
      addIssuesToCtx(parsed.error, ctx);
    }
  } else if (data.role === "student") {
    const parsed = onboardStepContentStudentSchema.safeParse(data);
    if (!parsed.success) {
      addIssuesToCtx(parsed.error, ctx);
    }
  }
});

function addIssuesToCtx(error: z.ZodError, ctx: z.RefinementCtx) {
  for (const issue of error.issues) {
    ctx.addIssue({
      code: "custom",
      message: issue.message,
      path: issue.path,
    });
  }
}

export const onboardResolver: Resolver<OnboardFormValues> = async (values) => {
  const parsed = fullSchema.safeParse(values);

  if (parsed.success) {
    return { values: parsed.data, errors: {} };
  }

  const errors: FieldErrors<OnboardFormValues> = {};
  for (const issue of parsed.error.issues) {
    const field = issue.path[0];
    if (typeof field === "string" && !(field in errors)) {
      errors[field as keyof OnboardFormValues] = {
        type: issue.code,
        message: issue.message,
      };
    }
  }

  return { values: {}, errors };
};
