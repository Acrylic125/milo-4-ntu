import type { FieldErrors, Resolver } from "react-hook-form";

import { onboardSchema, type OnboardFormValues } from "@/lib/onboard-schema";

export const onboardResolver: Resolver<OnboardFormValues> = async (values) => {
  const parsed = onboardSchema.safeParse(values);

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
