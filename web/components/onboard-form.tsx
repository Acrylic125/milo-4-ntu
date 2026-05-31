"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { Button } from "./ui/button";
import { z } from "zod";
import { useForm, useWatch } from "react-hook-form";
import { FieldError, FieldGroup, FieldLabel } from "./ui/field";
import { Textarea } from "./ui/textarea";
import { ArrowLeft, ArrowRight, Check, Loader2, Trash2, X } from "lucide-react";
import { useMutation, useQueries } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import {
  ResearcherOnboardSchema,
  StudentOnboardSchema,
} from "./onboard-form-types";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { useRouter } from "next/navigation";
import { Input } from "./ui/input";

export function OnboardFormStudent() {
  const trpc = useTRPC();
  const form = useForm<z.infer<typeof StudentOnboardSchema>>({
    resolver: zodResolver(StudentOnboardSchema),
    defaultValues: {
      interestedIn: "",
    },
    mode: "onTouched",
  });
  const router = useRouter();
  const submitMutation = useMutation(
    trpc.onboard.submit.mutationOptions({
      onSuccess: () => {
        router.push("/");
      },
    })
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = form;

  function onSubmit(data: z.infer<typeof StudentOnboardSchema>) {
    submitMutation.mutate({
      role: "student",
      interestedIn: data.interestedIn,
    });
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="w-full flex flex-col gap-4 md:gap-6 lg:gap-8"
    >
      <FieldGroup>
        <FieldLabel className="text-base md:text-lg lg:text-xl font-medium">
          I am interested in
        </FieldLabel>
        <Textarea
          id="interestedIn"
          aria-invalid={!!errors.interestedIn}
          placeholder="e.g. computer vision for medical imaging, low-power edge inference, sustainable bio-manufacturing…"
          className="min-h-36 text-sm md:text-base lg:text-lg"
          {...register("interestedIn")}
        />
        <FieldError className="text-xs md:text-sm lg:text-base">
          {errors.interestedIn?.message}
        </FieldError>
      </FieldGroup>

      <div className="flex flex-col justify-start">
        {submitMutation.error ? (
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{submitMutation.error.message}</AlertDescription>
          </Alert>
        ) : null}
        <Button
          type="submit"
          className="w-fit"
          size="lg"
          disabled={submitMutation.isPending}
        >
          {submitMutation.isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Done
            </>
          ) : (
            <>
              Done <ArrowRight className="size-4" />
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

const urlValidationSchema = z.url();

export function OnboardFormResearcher() {
  const trpc = useTRPC();
  const form = useForm<z.infer<typeof ResearcherOnboardSchema>>({
    resolver: zodResolver(ResearcherOnboardSchema),
    defaultValues: {
      myWork: [""],
      problemSolving: "",
    },
    mode: "onTouched",
  });
  const router = useRouter();
  const submitMutation = useMutation(
    trpc.onboard.submit.mutationOptions({
      onSuccess: () => {
        router.push("/");
      },
    })
  );

  const {
    control,
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = form;
  const myWorkLinks = useWatch({ control, name: "myWork" }) ?? [];
  const trimmedLinks = myWorkLinks.map((link) => link.trim());
  const urlChecks = useQueries({
    queries: trimmedLinks.map((link) => {
      const isUrl = urlValidationSchema.safeParse(link).success;
      return {
        ...trpc.onboard.verifyUrl.queryOptions({ url: link }),
        enabled: link.length > 0 && isUrl,
        retry: false,
      };
    }),
  });
  const hasAnyLoadingUrls = trimmedLinks.some((link, index) => {
    if (!link) return false;
    const isUrl = urlValidationSchema.safeParse(link).success;
    if (!isUrl) return false;
    const query = urlChecks[index];
    return query?.isPending || query?.isFetching;
  });
  const hasAnyRedUrls = trimmedLinks.some((link, index) => {
    if (!link) return false;
    const isUrl = urlValidationSchema.safeParse(link).success;
    if (!isUrl) return true;
    const query = urlChecks[index];
    if (!query) return true;
    if (query.isPending || query.isFetching) return false;
    return !query.data?.exists;
  });
  const disableSubmit =
    submitMutation.isPending || hasAnyLoadingUrls || hasAnyRedUrls;

  function handleAddLink() {
    setValue("myWork", [...myWorkLinks, ""], {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  }

  function handleRemoveLink(index: number) {
    if (myWorkLinks.length <= 1) return;
    setValue(
      "myWork",
      myWorkLinks.filter((_, currentIndex) => currentIndex !== index),
      {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      }
    );
  }

  function onSubmit(data: z.infer<typeof ResearcherOnboardSchema>) {
    submitMutation.mutate({
      role: "researcher",
      myWork: data.myWork,
      problemSolving: data.problemSolving,
    });
  }

  function handleRefreshInvalidUrls() {
    for (const query of urlChecks) {
      void query.refetch();
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="w-full flex flex-col gap-4 md:gap-6 lg:gap-8"
    >
      <FieldGroup>
        <FieldLabel className="text-base md:text-lg lg:text-xl font-medium">
          My work
        </FieldLabel>
        <div className="flex flex-col gap-2">
          {myWorkLinks.map((_, index) => (
            <div key={`myWork-${index}`} className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Input
                    id={`myWork-${index}`}
                    aria-invalid={!!errors.myWork?.[index]}
                    placeholder="e.g. https://www.ntu.edu.sg/innovates/tech-portal/tech-offers/detail/foveal-machine-vision"
                    className="h-10 pr-9 text-sm md:text-base lg:text-lg"
                    {...register(`myWork.${index}`)}
                  />
                  {trimmedLinks[index] ? (
                    <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2">
                      {(() => {
                        const link = trimmedLinks[index];
                        const isUrl =
                          urlValidationSchema.safeParse(link).success;
                        const query = urlChecks[index];
                        if (!isUrl) {
                          return <X className="size-4 text-destructive" />;
                        }
                        if (query?.isPending || query?.isFetching) {
                          return (
                            <Loader2 className="size-4 animate-spin text-muted-foreground" />
                          );
                        }
                        if (query?.data?.exists) {
                          return <Check className="size-4 text-green-600" />;
                        }
                        return <X className="size-4 text-destructive" />;
                      })()}
                    </span>
                  ) : null}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => handleRemoveLink(index)}
                  disabled={myWorkLinks.length === 1}
                  aria-label={`Delete link ${index + 1}`}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
              <FieldError className="text-xs md:text-sm lg:text-base">
                {errors.myWork?.[index]?.message}
              </FieldError>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            className="w-fit"
            size="lg"
            onClick={handleAddLink}
          >
            Add Link
          </Button>
        </div>
        <FieldError className="text-xs md:text-sm lg:text-base">
          {errors.myWork?.message}
        </FieldError>
      </FieldGroup>

      <FieldGroup>
        <FieldLabel className="text-base md:text-lg lg:text-xl font-medium">
          Problem I am trying to solve
        </FieldLabel>
        <Textarea
          id="problemSolving"
          aria-invalid={!!errors.problemSolving}
          placeholder="e.g. Bringing low-power on-device inference to warehouse pick-and-place robots so they can adapt to novel SKUs without round-tripping to the cloud."
          className="min-h-36 text-sm md:text-base lg:text-lg"
          {...register("problemSolving")}
        />
        <FieldError className="text-xs md:text-sm lg:text-base">
          {errors.problemSolving?.message}
        </FieldError>
      </FieldGroup>

      <div className="flex flex-col gap-4 justify-start">
        {hasAnyRedUrls ? (
          <Alert variant="destructive">
            <AlertTitle>Some links are unreachable</AlertTitle>
            <AlertDescription className="flex flex-col gap-3">
              <span>
                Fix links marked with a red X, or refresh to retry URL checks.
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-fit"
                onClick={handleRefreshInvalidUrls}
                disabled={hasAnyLoadingUrls}
              >
                Refresh
              </Button>
            </AlertDescription>
          </Alert>
        ) : null}
        {submitMutation.error ? (
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{submitMutation.error.message}</AlertDescription>
          </Alert>
        ) : null}
        <Button
          type="submit"
          className="w-fit"
          size="lg"
          disabled={disableSubmit}
        >
          {submitMutation.isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Done
            </>
          ) : (
            <>
              Done <ArrowRight className="size-4" />
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

export function OnboardForm() {
  const [formType, setFormType] = useState<"student" | "researcher" | null>(
    null
  );

  let formContent: React.ReactNode = null;

  if (formType === null) {
    formContent = (
      <motion.div
        key="onboard-role-picker"
        initial={{ opacity: 0, y: -24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -24 }}
        className="w-full flex flex-col gap-4 md:gap-6 lg:gap-8"
      >
        <h1 className="text-xl md:text-2xl lg:text-3xl font-bold">
          Let{"'"}s Setup Your Profile!
        </h1>

        <div className="flex flex-col gap-2 md:gap-3">
          <p className="text-base lg:text-lg">I am a...</p>
          <div className="flex flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setFormType("student")}
              className="flex-1 h-fit text-base md:text-lg font-medium px-4 py-2"
            >
              Student
            </Button>
            <Button
              variant="outline"
              onClick={() => setFormType("researcher")}
              className="flex-1 h-fit text-base md:text-lg font-medium px-4 py-2"
            >
              Researcher
            </Button>
          </div>
        </div>
      </motion.div>
    );
  } else if (formType === "researcher") {
    formContent = (
      <motion.div
        key="onboard-researcher-form"
        initial={{ opacity: 0, y: -24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -24 }}
        className="w-full flex flex-col gap-4 md:gap-6 lg:gap-8"
      >
        <div className="flex flex-col">
          <Button
            variant="ghost"
            onClick={() => setFormType(null)}
            className="w-fit px-0"
          >
            <ArrowLeft className="size-4" />
            Back
          </Button>
          <h1 className="text-xl md:text-2xl lg:text-3xl font-bold">
            I am a Researcher
          </h1>
        </div>
        <OnboardFormResearcher />
      </motion.div>
    );
  } else if (formType === "student") {
    formContent = (
      <motion.div
        key="onboard-student-form"
        initial={{ opacity: 0, y: -24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -24 }}
        className="w-full flex flex-col gap-4 md:gap-6 lg:gap-8"
      >
        <div className="flex flex-col">
          <Button
            variant="ghost"
            onClick={() => setFormType(null)}
            className="w-fit px-0"
          >
            <ArrowLeft className="size-4" />
            Back
          </Button>
          <h1 className="text-xl md:text-2xl lg:text-3xl font-bold">
            I am a Student
          </h1>
        </div>
        <OnboardFormStudent />
      </motion.div>
    );
  }

  return <AnimatePresence mode="wait">{formContent}</AnimatePresence>;
}
