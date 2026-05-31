"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueries } from "@tanstack/react-query";
import { Check, Loader2, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { NTU_TECH_OFFER_PREFIX } from "@/components/onboard-form-types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useTRPC } from "@/trpc/client";

const RoleSchema = z.enum(["student", "researcher"]);
const urlValidationSchema = z.url();

const ProfileEditSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  role: RoleSchema,
  patentLinks: z.array(z.string().trim()).superRefine((links, ctx) => {
    const firstSeen = new Map<string, number>();

    links.forEach((link, index) => {
      if (!link) return;

      const isUrl = urlValidationSchema.safeParse(link).success;
      if (!isUrl) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [index],
          message: "Enter a valid URL",
        });
        return;
      }

      if (!link.startsWith(NTU_TECH_OFFER_PREFIX)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [index],
          message: `Each link must start with ${NTU_TECH_OFFER_PREFIX}`,
        });
      }

      const normalized = link.toLowerCase();
      const firstIndex = firstSeen.get(normalized);
      if (firstIndex != null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [index],
          message: `Duplicate link (same as link #${firstIndex + 1})`,
        });
      } else {
        firstSeen.set(normalized, index);
      }
    });
  }),
});

type ProfileEditValues = z.infer<typeof ProfileEditSchema>;

type ProfileEditFormProps = {
  profileId: string;
  initialName: string;
  initialRole: "student" | "researcher";
  initialPatentLinks: string[];
};

export function ProfileEditForm({
  profileId,
  initialName,
  initialRole,
  initialPatentLinks,
}: ProfileEditFormProps) {
  const trpc = useTRPC();
  const router = useRouter();
  const submitMutation = useMutation(
    trpc.profiles.updateOwn.mutationOptions({
      onSuccess: () => {
        router.refresh();
      },
    })
  );

  const form = useForm<ProfileEditValues>({
    resolver: zodResolver(ProfileEditSchema),
    defaultValues: {
      name: initialName,
      role: initialRole,
      patentLinks: initialPatentLinks,
    },
    mode: "onTouched",
  });

  const {
    control,
    register,
    setValue,
    handleSubmit,
    formState: { errors },
  } = form;

  const watchedRole = useWatch({ control, name: "role" });
  const role = watchedRole ?? initialRole;

  const watchedPatentLinks = useWatch({ control, name: "patentLinks" });
  const patentLinks = watchedPatentLinks ?? initialPatentLinks;
  const trimmedLinks = patentLinks.map((link) => link.trim());
  const hadPatentsOnLoad = initialPatentLinks.length > 0;

  const shouldDisablePatents = role === "student" && hadPatentsOnLoad;
  const showPatentSection = role === "researcher" || shouldDisablePatents;

  const linkQueries = useQueries({
    queries: trimmedLinks.map((link) => {
      const isUrl = urlValidationSchema.safeParse(link).success;
      return {
        ...trpc.onboard.verifyUrl.queryOptions({ url: link }),
        enabled:
          showPatentSection &&
          !shouldDisablePatents &&
          link.length > 0 &&
          isUrl,
        retry: false,
      };
    }),
  });

  const duplicateLinkIndexes = useMemo(() => {
    const seen = new Map<string, number>();
    const duplicates = new Set<number>();
    trimmedLinks.forEach((link, index) => {
      if (!link) return;
      const normalized = link.toLowerCase();
      const firstIndex = seen.get(normalized);
      if (firstIndex == null) {
        seen.set(normalized, index);
      } else {
        duplicates.add(firstIndex);
        duplicates.add(index);
      }
    });
    return duplicates;
  }, [trimmedLinks]);

  const hasAnyLoadingUrls = useMemo(() => {
    if (!showPatentSection || shouldDisablePatents || role !== "researcher") {
      return false;
    }
    return trimmedLinks.some((link, index) => {
      if (!link) return false;
      const query = linkQueries[index];
      const isUrl = urlValidationSchema.safeParse(link).success;
      if (!isUrl) return false;
      return query?.isPending || query?.isFetching;
    });
  }, [
    linkQueries,
    role,
    shouldDisablePatents,
    showPatentSection,
    trimmedLinks,
  ]);

  const hasAnyRedUrls = useMemo(() => {
    if (!showPatentSection || shouldDisablePatents || role !== "researcher") {
      return false;
    }
    return trimmedLinks.some((link, index) => {
      if (!link) return false;
      if (duplicateLinkIndexes.has(index)) return true;
      if (!link.startsWith(NTU_TECH_OFFER_PREFIX)) return true;
      const isUrl = urlValidationSchema.safeParse(link).success;
      if (!isUrl) return true;
      const query = linkQueries[index];
      if (!query) return true;
      if (query.isPending || query.isFetching) return false;
      return !query.data?.exists;
    });
  }, [
    linkQueries,
    role,
    shouldDisablePatents,
    showPatentSection,
    trimmedLinks,
    duplicateLinkIndexes,
  ]);

  function handleAddPatentLink() {
    setValue("patentLinks", [...patentLinks, ""], {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  }

  function handleRemovePatentLink(index: number) {
    setValue(
      "patentLinks",
      patentLinks.filter((_, currentIndex) => currentIndex !== index),
      {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      }
    );
  }

  function onSubmit(values: ProfileEditValues) {
    const cleanedPatentLinks = values.patentLinks
      .map((link) => link.trim())
      .filter((link) => link.length > 0);

    submitMutation.mutate({
      profileId,
      name: values.name.trim(),
      role: values.role,
      patentLinks:
        values.role === "researcher" && !shouldDisablePatents
          ? cleanedPatentLinks
          : undefined,
    });
  }

  const disableSubmit =
    submitMutation.isPending ||
    (role === "researcher" && hasAnyRedUrls) ||
    hasAnyLoadingUrls;

  return (
    <CardFrame>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Editing your profile
          </p>
          <h2 className="font-sans text-xl font-medium tracking-tight">
            Keep your discover profile up to date
          </h2>
        </header>

        <FieldGroup>
          <FieldLabel className="text-sm font-medium">Name</FieldLabel>
          <Input
            id="name"
            aria-invalid={!!errors.name}
            placeholder="Your name"
            className="h-9 text-sm"
            {...register("name")}
          />
          <FieldError>{errors.name?.message}</FieldError>
        </FieldGroup>

        <FieldGroup>
          <FieldLabel className="text-sm font-medium">Role</FieldLabel>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant={role === "student" ? "default" : "outline"}
              onClick={() =>
                setValue("role", "student", {
                  shouldDirty: true,
                  shouldTouch: true,
                  shouldValidate: true,
                })
              }
            >
              Student
            </Button>
            <Button
              type="button"
              variant={role === "researcher" ? "default" : "outline"}
              onClick={() =>
                setValue("role", "researcher", {
                  shouldDirty: true,
                  shouldTouch: true,
                  shouldValidate: true,
                })
              }
            >
              Researcher
            </Button>
          </div>
          {/* {role ? <RoleBadge role={role} /> : null} */}
        </FieldGroup>

        {showPatentSection ? (
          <FieldGroup
            className={shouldDisablePatents ? "opacity-50" : undefined}
          >
            <FieldLabel className="text-sm font-medium">Patents</FieldLabel>
            {shouldDisablePatents ? (
              <p className="text-xs text-muted-foreground">
                Patents are disabled while your role is set to student. Existing
                patents will remain unchanged on submit.
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Add NTU tech offer links, e.g.{" "}
                <span className="font-mono">{NTU_TECH_OFFER_PREFIX}</span>
              </p>
            )}
            <div className="space-y-2">
              {trimmedLinks.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No patents added yet.
                </p>
              ) : (
                trimmedLinks.map((link, index) => (
                  <div key={`patent-link-${index}`} className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Input
                          id={`patent-link-${index}`}
                          aria-invalid={!!errors.patentLinks?.[index]}
                          placeholder={NTU_TECH_OFFER_PREFIX}
                          className="h-9 pr-9 text-sm"
                          disabled={shouldDisablePatents}
                          {...register(`patentLinks.${index}`)}
                        />
                        {link ? (
                          <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2">
                            {(() => {
                              const isUrl =
                                urlValidationSchema.safeParse(link).success;
                              const query = linkQueries[index];
                              if (
                                duplicateLinkIndexes.has(index) ||
                                !isUrl ||
                                !link.startsWith(NTU_TECH_OFFER_PREFIX)
                              ) {
                                return (
                                  <X className="size-4 text-destructive" />
                                );
                              }
                              if (query?.isPending || query?.isFetching) {
                                return (
                                  <Loader2 className="size-4 animate-spin text-muted-foreground" />
                                );
                              }
                              if (query?.data?.exists || shouldDisablePatents) {
                                return (
                                  <Check className="size-4 text-green-600" />
                                );
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
                        onClick={() => handleRemovePatentLink(index)}
                        disabled={shouldDisablePatents}
                        aria-label={`Delete patent link ${index + 1}`}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                    <FieldError>
                      {errors.patentLinks?.[index]?.message}
                    </FieldError>
                  </div>
                ))
              )}
              <Button
                type="button"
                variant="outline"
                onClick={handleAddPatentLink}
                disabled={shouldDisablePatents}
              >
                Add Link
              </Button>
              <FieldError>{errors.patentLinks?.message}</FieldError>
            </div>
          </FieldGroup>
        ) : null}

        {submitMutation.error ? (
          <Alert variant="destructive">
            <AlertTitle>Update failed</AlertTitle>
            <AlertDescription>{submitMutation.error.message}</AlertDescription>
          </Alert>
        ) : null}
        {submitMutation.isSuccess ? (
          <Alert variant="success">
            <AlertTitle>Update successful</AlertTitle>
            <AlertDescription>Your profile has been updated.</AlertDescription>
          </Alert>
        ) : null}

        <Button
          type="submit"
          size="lg"
          className="w-fit"
          disabled={disableSubmit}
        >
          {submitMutation.isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Saving
            </>
          ) : (
            "Save changes"
          )}
        </Button>
      </form>
    </CardFrame>
  );
}

function CardFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="border border-border bg-background p-4 sm:p-5">
      {children}
    </div>
  );
}
