"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { ArrowLeft, ArrowRight, LinkSimple } from "@phosphor-icons/react";

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
  onboardStepOneSchema,
  type OnboardFormValues,
} from "@/lib/onboard-schema";
import { onboardResolver } from "@/lib/onboard-resolver";
import { saveCurrentProfile } from "@/lib/profile-storage";

type Step = 1 | 2;

export default function OnboardPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);

  const {
    register,
    handleSubmit,
    getValues,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<OnboardFormValues>({
    resolver: onboardResolver,
    defaultValues: {
      email: "",
      contact: "",
      linksRaw: "",
      summary: "",
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

  function onSubmit(values: OnboardFormValues) {
    saveCurrentProfile({
      email: values.email,
      contact: values.contact,
      linksRaw: values.linksRaw,
      summary: values.summary,
    });
    router.replace("/");
  }

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
            Share how to reach you and where your work lives online. We will
            scrape links to auto-generate summaries in a later release.
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
                        Projects, research & personal links
                      </FieldLabel>
                      <Textarea
                        id="links"
                        aria-invalid={!!errors.linksRaw}
                        placeholder={
                          "One link per line, e.g.\nhttps://scholar.google.com/...\nhttps://github.com/you\nhttps://yourstartup.com"
                        }
                        className="min-h-32"
                        {...register("linksRaw")}
                      />
                      <FieldDescription className="flex items-center gap-1">
                        <LinkSimple className="size-3" />
                        Paste Google Scholar, lab pages, portfolios, or startup
                        sites.
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
                  <CardTitle className="font-sans">Profile summary</CardTitle>
                  <CardDescription>
                    Describe your focus, what you are building or researching,
                    and who you want to meet.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <FieldGroup>
                    <Field data-invalid={!!errors.summary}>
                      <FieldLabel htmlFor="summary">Summary</FieldLabel>
                      <Textarea
                        id="summary"
                        aria-invalid={!!errors.summary}
                        placeholder="e.g. Robotics PhD working on sim-to-real transfer. Looking for founders building warehouse automation pilots in Singapore."
                        className="min-h-36"
                        {...register("summary")}
                      />
                      <FieldDescription>
                        This powers match ranking on the discover page until
                        link scraping is available.
                      </FieldDescription>
                      <FieldError errors={[errors.summary]} />
                    </Field>
                  </FieldGroup>
                </CardContent>
                <CardFooter className="justify-between border-t-0 pt-0">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep(1)}
                  >
                    <ArrowLeft />
                    Back
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    Join network
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
