import { z } from "zod";

export const NTU_TECH_OFFER_PREFIX =
  "https://www.ntu.edu.sg/innovates/tech-portal/tech-offers/detail";

export function parseLinksRaw(raw: string): string[] {
  return raw
    .split(/[\n,]+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export const onboardRoleSchema = z.enum(["student", "researcher"]);
export type OnboardRole = z.infer<typeof onboardRoleSchema>;

const emailField = z.email("Enter a valid email address");
const contactField = z
  .string()
  .trim()
  .min(1, "Contact is required")
  .min(2, "Contact must be at least 2 characters");

const longTextField = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .min(20, `${label} must be at least 20 characters`);

const linksField = z
  .string()
  .trim()
  .min(1, "Add at least one NTU tech-portal link")
  .refine((raw) => {
    const links = parseLinksRaw(raw);
    return (
      links.length > 0 &&
      links.every((url) => url.startsWith(NTU_TECH_OFFER_PREFIX))
    );
  }, `Every link must start with ${NTU_TECH_OFFER_PREFIX}`);

// The full form holds every possible field; per-role validation happens via
// the step schemas below. We keep the inactive role's fields permissive
// (`z.string()`) so RHF doesn't choke on the fields that don't apply to the
// currently-selected role.
//
// Field semantics:
//   - `myWork` (researcher) — newline/comma-separated NTU tech-portal links
//     that we scrape into the `patents` table.
//   - `problemSolving` (researcher) — free text describing the problem the
//     researcher is trying to solve; stored as `lookingFor`.
//   - `interestedIn` (student) — free text describing what the student is
//     interested in; stored as `lookingFor`.
export const onboardSchema = z.object({
  role: onboardRoleSchema,
  email: emailField,
  contact: contactField,
  myWork: z.string(),
  problemSolving: z.string(),
  interestedIn: z.string(),
});

export type OnboardFormValues = {
  role: OnboardRole;
  email: string;
  contact: string;
  myWork: string;
  problemSolving: string;
  interestedIn: string;
};

export const onboardStepRoleSchema = z.object({
  role: onboardRoleSchema,
});

export const onboardStepDetailsSchema = z.object({
  email: emailField,
  contact: contactField,
});

export const onboardStepContentResearcherSchema = z.object({
  myWork: linksField,
  problemSolving: longTextField("Problem I am trying to solve"),
});

export const onboardStepContentStudentSchema = z.object({
  interestedIn: longTextField("I am interested in"),
});
