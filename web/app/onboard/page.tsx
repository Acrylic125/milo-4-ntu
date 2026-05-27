"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Link2 } from "lucide-react";

import { SiteHeader } from "@/components/site-header";
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
import {
  NTU_TECH_OFFER_PREFIX,
  onboardStepOneSchema,
  parseLinksRaw,
  type OnboardFormValues,
} from "@/lib/onboard-schema";
import { onboardResolver } from "@/lib/onboard-resolver";
import { saveCurrentProfile } from "@/lib/profile-storage";
import { assumeUser } from "@/lib/auth-actions";
import { useTRPC } from "@/trpc/client";

type Step = 1 | 2;

export default function OnboardPage() {
  const router = useRouter();
  const trpc = useTRPC();
  const [step, setStep] = useState<Step>(1);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const submitMutation = useMutation(trpc.onboard.submit.mutationOptions());

  const {
    register,
    handleSubmit,
    getValues,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<OnboardFormValues>({
    resolver: onboardResolver,
    defaultValues: {
      email: "",
      contact: "",
      linksRaw: "",
      workingOn: "",
    },
    mode: "onTouched",
  });

  function handleContinue() {
    clearErrors();
    const parsed = onboardStepOneSchema.safeParse(getValues());

    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (typeof field === "string") {
          setError(field as keyof OnboardFormValues, {
            message: issue.message,
          });
        }
      }
      return;
    }

    setStep(2);
  }

  async function onSubmit(values: OnboardFormValues) {
    setSubmitError(null);

    const links = parseLinksRaw(values.linksRaw);

    let result: { profileId: string; patentCount: number };
    try {
      result = await submitMutation.mutateAsync({
        email: values.email,
        contact: values.contact,
        links,
        workingOn: values.workingOn,
      });
    } catch (err) {
      setSubmitError(
        err instanceof Error
          ? err.message
          : "Something went wrong while submitting. Please try again."
      );
      return;
    }

    saveCurrentProfile({
      email: values.email,
      contact: values.contact,
      linksRaw: values.linksRaw,
      workingOn: values.workingOn,
    });

    try {
      await assumeUser(result.profileId);
    } catch {
      // Cookie failure shouldn't block redirect; user can re-assume from header.
    }

    router.replace("/");
  }

  const isSubmitting = submitMutation.isPending;

  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader />

      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-4 py-10 sm:px-6">
        <div className="mb-6 space-y-2">
          <Button variant="ghost" size="xs" asChild className="-ml-2 w-fit">
            <Link href="/">
              <ArrowLeft />
              Back to discover
            </Link>
          </Button>
          <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Onboarding · Step {step} of 2
          </p>
          <h1 className="font-sans text-2xl font-medium tracking-tight">
            Join the Milo network
          </h1>
          <p className="text-xs/relaxed text-muted-foreground">
            Share how to reach you and which NTU tech-portal listings represent
            your work. We will scrape each link and embed it for matching.
          </p>
        </div>

        <Card>
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            {step === 1 ? (
              <>
                <CardHeader>
                  <CardTitle className="font-sans">Contact & links</CardTitle>
                  <CardDescription>
                    Researchers and founders use this to follow up after a
                    match.
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
                    <Field data-invalid={!!errors.linksRaw}>
                      <FieldLabel htmlFor="links">
                        NTU tech-portal listings
                      </FieldLabel>
                      <Textarea
                        id="links"
                        aria-invalid={!!errors.linksRaw}
                        placeholder={`One link per line, e.g.\n${NTU_TECH_OFFER_PREFIX}/foveal-machine-vision`}
                        className="min-h-32"
                        {...register("linksRaw")}
                      />
                      <FieldDescription className="flex items-center gap-1">
                        <Link2 className="size-3" />
                        Only links starting with{" "}
                        <code className="rounded bg-muted px-1 py-0.5 text-[10px]">
                          {NTU_TECH_OFFER_PREFIX}
                        </code>{" "}
                        are accepted.
                      </FieldDescription>
                      <FieldError errors={[errors.linksRaw]} />
                    </Field>
                  </FieldGroup>
                </CardContent>
                <CardFooter className="justify-end border-t-0 pt-0">
                  <Button type="button" onClick={handleContinue}>
                    Continue
                    <ArrowRight />
                  </Button>
                </CardFooter>
              </>
            ) : (
              <>
                <CardHeader>
                  <CardTitle className="font-sans">
                    What are you working on right now?
                  </CardTitle>
                  <CardDescription>
                    A sentence or two about your current focus — the problem,
                    the technology, or the kind of collaborator you want to
                    meet. We embed this and match it against everyone&apos;s
                    patents.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <FieldGroup>
                    <Field data-invalid={!!errors.workingOn}>
                      <FieldLabel htmlFor="workingOn">
                        Currently working on
                      </FieldLabel>
                      <Textarea
                        id="workingOn"
                        aria-invalid={!!errors.workingOn}
                        placeholder="e.g. Prototyping a sim-to-real pipeline for warehouse robot arms. Looking for founders shipping pick-and-place pilots in SEA."
                        className="min-h-36"
                        {...register("workingOn")}
                      />
                      <FieldDescription>
                        Used as a second similarity signal on top of your
                        scraped NTU patents.
                      </FieldDescription>
                      <FieldError errors={[errors.workingOn]} />
                    </Field>
                    {submitError ? (
                      <p
                        role="alert"
                        className="text-xs text-destructive"
                      >
                        {submitError}
                      </p>
                    ) : null}
                  </FieldGroup>
                </CardContent>
                <CardFooter className="justify-between border-t-0 pt-0">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep(1)}
                    disabled={isSubmitting}
                  >
                    <ArrowLeft />
                    Back
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Joining…" : "Join network"}
                  </Button>
                </CardFooter>
              </>
            )}
          </form>
        </Card>
      </main>
    </div>
  );
}
