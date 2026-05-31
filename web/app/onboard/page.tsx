"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  FlaskConical,
  GraduationCap,
  Link2,
  LogIn,
} from "lucide-react";


import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import {
  NTU_TECH_OFFER_PREFIX,
  onboardStepDetailsSchema,
  onboardStepRoleSchema,
  parseLinksRaw,
  type OnboardFormValues,
  type OnboardRole,
} from "@/lib/onboard-schema";
import { onboardResolver } from "@/lib/onboard-resolver";
import { useTRPC } from "@/trpc/client";

type Step = 1 | 2 | 3;

const TOTAL_STEPS: Step = 3;

const ROLE_OPTIONS: Array<{
  value: OnboardRole;
  label: string;
  description: string;
  Icon: typeof GraduationCap;
}> = [
  {
    value: "student",
    label: "Student",
    description: "Exploring topics, looking for inspiration & mentors.",
    Icon: GraduationCap,
  },
  {
    value: "researcher",
    label: "Researcher",
    description: "Publishing patents, looking for collaborators & founders.",
    Icon: FlaskConical,
  },
];

export default function OnboardPage() {
  const router = useRouter();
  const trpc = useTRPC();
  const [step, setStep] = useState<Step>(1);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { data: session, isPending: isSessionPending } = authClient.useSession();
  const currentProfileQuery = useQuery({
    ...trpc.profiles.current.queryOptions(),
    enabled: !!session,
  });

  const submitMutation = useMutation(trpc.onboard.submit.mutationOptions());

  const form = useForm<OnboardFormValues>({
    resolver: onboardResolver,
    defaultValues: {
      role: "student",
      email: "",
      contact: "",
      myWork: "",
      problemSolving: "",
      interestedIn: "",
    },
    mode: "onTouched",
  });

  const {
    register,
    handleSubmit,
    getValues,
    setValue,
    setError,
    clearErrors,
    control,
    formState: { errors },
  } = form;

  const role = useWatch({ control, name: "role" });
  const currentProfile = currentProfileQuery.data ?? null;

  useEffect(() => {
    if (!session?.user.email) {
      return;
    }

    if (getValues("email")) {
      return;
    }

    setValue("email", session.user.email, {
      shouldDirty: false,
      shouldTouch: false,
    });
  }, [getValues, session?.user.email, setValue]);

  function handleMicrosoftSignIn() {
    void authClient.signIn.social({
      provider: "microsoft",
      callbackURL: "/onboard",
    });
  }

  function applyZodIssues(
    issues: ReadonlyArray<{ path: ReadonlyArray<PropertyKey>; message: string }>
  ) {
    for (const issue of issues) {
      const field = issue.path[0];
      if (typeof field === "string") {
        setError(field as keyof OnboardFormValues, { message: issue.message });
      }
    }
  }

  function handleSelectRole(value: OnboardRole) {
    setValue("role", value, { shouldDirty: true });
    clearErrors();
    setStep(2);
  }

  function handleBack() {
    clearErrors();
    setSubmitError(null);
    if (step === 3) {
      setStep(2);
    } else if (step === 2) {
      setStep(1);
    }
  }

  function handleContinueFromDetails() {
    clearErrors();
    const parsed = onboardStepDetailsSchema.safeParse(getValues());
    if (!parsed.success) {
      applyZodIssues(parsed.error.issues);
      return;
    }
    setStep(3);
  }

  async function onSubmit(values: OnboardFormValues) {
    setSubmitError(null);

    try {
      if (!session) {
        throw new Error("Sign in with Microsoft before joining the network.");
      }

      if (values.role === "researcher") {
        await submitMutation.mutateAsync({
          role: "researcher",
          email: values.email,
          contact: values.contact,
          links: parseLinksRaw(values.myWork),
          problemSolving: values.problemSolving,
        });
      } else {
        await submitMutation.mutateAsync({
          role: "student",
          email: values.email,
          contact: values.contact,
          interestedIn: values.interestedIn,
        });
      }
    } catch (err) {
      setSubmitError(
        err instanceof Error
          ? err.message
          : "Something went wrong while submitting. Please try again."
      );
      return;
    }

    router.replace("/");
  }

  const isSubmitting = submitMutation.isPending;

  let stepContent: React.ReactNode = null;

  if (step === 1) {
    stepContent = (
      <>
        <CardHeader>
          <CardTitle className="font-sans">I am a&hellip;</CardTitle>
          <CardDescription>
            Pick the option that best describes you so we tailor the next steps.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <div className="grid gap-3 sm:grid-cols-2">
              {ROLE_OPTIONS.map((option) => {
                const selected = role === option.value;
                const Icon = option.Icon;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleSelectRole(option.value)}
                    aria-pressed={selected}
                    className={cn(
                      "flex flex-col items-start gap-2 rounded-md border p-4 text-left transition-colors",
                      "hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      selected
                        ? "border-primary bg-primary/5"
                        : "border-border"
                    )}
                  >
                    <Icon className="size-5" />
                    <span className="text-sm font-medium">{option.label}</span>
                    <span className="text-xs text-muted-foreground">
                      {option.description}
                    </span>
                  </button>
                );
              })}
            </div>
            <FieldError errors={[errors.role]} />
          </FieldGroup>
        </CardContent>
      </>
    );
  } else if (step === 2) {
    stepContent = (
      <>
        <CardHeader>
          <CardTitle className="font-sans">Personal details</CardTitle>
          <CardDescription>
            We&apos;ll use this to follow up with you after a match.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field data-invalid={!!errors.email}>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                aria-invalid={!!errors.email}
                placeholder="you@university.edu"
                {...register("email")}
              />
              <FieldError errors={[errors.email]} />
            </Field>
            <Field data-invalid={!!errors.contact}>
              <FieldLabel htmlFor="contact">Contact</FieldLabel>
              <Input
                id="contact"
                aria-invalid={!!errors.contact}
                placeholder="Telegram @handle, phone, or preferred email"
                {...register("contact")}
              />
              <FieldDescription>
                How collaborators should reach you after matching.
              </FieldDescription>
              <FieldError errors={[errors.contact]} />
            </Field>
          </FieldGroup>
        </CardContent>
        <CardFooter className="justify-between border-t-0 pt-0">
          <Button type="button" variant="outline" onClick={handleBack}>
            <ArrowLeft />
            Back
          </Button>
          <Button type="button" onClick={handleContinueFromDetails}>
            Continue
            <ArrowRight />
          </Button>
        </CardFooter>
      </>
    );
  } else if (step === 3 && role === "researcher") {
    stepContent = (
      <>
        <CardHeader>
          <CardTitle className="font-sans">Your work</CardTitle>
          <CardDescription>
            Link your NTU patents and describe the problem you&apos;re trying
            to solve.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field data-invalid={!!errors.myWork}>
              <FieldLabel htmlFor="myWork">My work</FieldLabel>
              <Textarea
                id="myWork"
                aria-invalid={!!errors.myWork}
                placeholder={`One NTU tech-portal link per line, e.g.\n${NTU_TECH_OFFER_PREFIX}/foveal-machine-vision`}
                className="min-h-32"
                {...register("myWork")}
              />
              <FieldDescription className="flex items-center gap-1">
                <Link2 className="size-3" />
                Only links starting with{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-[10px]">
                  {NTU_TECH_OFFER_PREFIX}
                </code>{" "}
                are accepted.
              </FieldDescription>
              <FieldError errors={[errors.myWork]} />
            </Field>
            <Field data-invalid={!!errors.problemSolving}>
              <FieldLabel htmlFor="problemSolving">
                Problem I am trying to solve
              </FieldLabel>
              <Textarea
                id="problemSolving"
                aria-invalid={!!errors.problemSolving}
                placeholder="e.g. Bringing low-power on-device inference to warehouse pick-and-place robots so they can adapt to novel SKUs without round-tripping to the cloud."
                className="min-h-32"
                {...register("problemSolving")}
              />
              <FieldError errors={[errors.problemSolving]} />
            </Field>
            {submitError ? (
              <p role="alert" className="text-xs text-destructive">
                {submitError}
              </p>
            ) : null}
          </FieldGroup>
        </CardContent>
        <CardFooter className="justify-between border-t-0 pt-0">
          <Button
            type="button"
            variant="outline"
            onClick={handleBack}
            disabled={isSubmitting}
          >
            <ArrowLeft />
            Back
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Linking…" : "Link to Network"}
          </Button>
        </CardFooter>
      </>
    );
  } else if (step === 3 && role === "student") {
    stepContent = (
      <>
        <CardHeader>
          <CardTitle className="font-sans">Your interests</CardTitle>
          <CardDescription>
            Help us match you with researchers working on what you care about.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field data-invalid={!!errors.interestedIn}>
              <FieldLabel htmlFor="interestedIn">I am interested in</FieldLabel>
              <Textarea
                id="interestedIn"
                aria-invalid={!!errors.interestedIn}
                placeholder="e.g. computer vision for medical imaging, low-power edge inference, sustainable bio-manufacturing…"
                className="min-h-36"
                {...register("interestedIn")}
              />
              <FieldError errors={[errors.interestedIn]} />
            </Field>
            {submitError ? (
              <p role="alert" className="text-xs text-destructive">
                {submitError}
              </p>
            ) : null}
          </FieldGroup>
        </CardContent>
        <CardFooter className="justify-between border-t-0 pt-0">
          <Button
            type="button"
            variant="outline"
            onClick={handleBack}
            disabled={isSubmitting}
          >
            <ArrowLeft />
            Back
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Linking…" : "Link to Network"}
          </Button>
        </CardFooter>
      </>
    );
  }

  // onboardStepRoleSchema participates in form validation via the resolver,
  // but we also use it here to keep the step indicator honest about what the
  // form considers a valid role selection.
  const hasValidRole = onboardStepRoleSchema.safeParse({ role }).success;
  const isCheckingProfile = !!session && currentProfileQuery.isPending;

  if (isSessionPending || isCheckingProfile) {
    return (
      <div className="flex min-h-full flex-col">
        <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-4 py-10 sm:px-6">
          <Card>
            <CardHeader>
              <CardTitle className="font-sans">Checking your account</CardTitle>
              <CardDescription>
                We&apos;re confirming your Microsoft session before onboarding.
              </CardDescription>
            </CardHeader>
          </Card>
        </main>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex min-h-full flex-col">
        <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-4 py-10 sm:px-6">
          <Card>
            <CardHeader>
              <CardTitle className="font-sans">Sign in first</CardTitle>
              <CardDescription>
                Microsoft sign-in now powers onboarding, so we can attach your
                profile to a real account instead of a temporary browser cookie.
              </CardDescription>
            </CardHeader>
            <CardFooter className="justify-between">
              <Button variant="outline" asChild>
                <Link href="/">
                  <ArrowLeft />
                  Back to discover
                </Link>
              </Button>
              <Button onClick={handleMicrosoftSignIn}>
                <LogIn />
                Continue with Microsoft
              </Button>
            </CardFooter>
          </Card>
        </main>
      </div>
    );
  }

  if (currentProfile) {
    return (
      <div className="flex min-h-full flex-col">
        <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-4 py-10 sm:px-6">
          <Card>
            <CardHeader>
              <CardTitle className="font-sans">You&apos;re already onboarded</CardTitle>
              <CardDescription>
                Your Microsoft account is already linked to a Milo profile.
              </CardDescription>
            </CardHeader>
            <CardFooter className="justify-between">
              <Button variant="outline" asChild>
                <Link href="/">
                  <ArrowLeft />
                  Back to discover
                </Link>
              </Button>
              <Button asChild>
                <Link href={`/profile/${currentProfile.id}`}>View my profile</Link>
              </Button>
            </CardFooter>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col">
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-4 py-10 sm:px-6">
        <div className="mb-6 space-y-2">
          <Button variant="ghost" size="xs" asChild className="-ml-2 w-fit">
            <Link href="/">
              <ArrowLeft />
              Back to discover
            </Link>
          </Button>
          <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Onboarding · Step {step} of {TOTAL_STEPS}
            {hasValidRole ? ` · ${role}` : ""}
          </p>
          <h1 className="font-sans text-2xl font-medium tracking-tight">
            Join the Milo network
          </h1>
          <p className="text-xs text-muted-foreground">
            Signed in as {session.user.email ?? session.user.name ?? "Microsoft user"}
          </p>
        </div>

        <Card>
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            {stepContent}
          </form>
        </Card>
      </main>
    </div>
  );
}
