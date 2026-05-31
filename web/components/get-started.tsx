"use client";

import { useTransition } from "react";
import { ArrowRight, LogIn } from "lucide-react";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

type GetStartedProps = {
  callbackURL?: string;
  className?: string;
  size?: React.ComponentProps<typeof Button>["size"];
  variant?: React.ComponentProps<typeof Button>["variant"];
};

export function GetStarted({
  callbackURL = "/",
  className,
  size = "sm",
  variant,
}: GetStartedProps) {
  const [isPending, startTransition] = useTransition();
  const { isPending: isSessionPending } = authClient.useSession();
  const isBusy = isPending || isSessionPending;

  function handleMicrosoftSignIn() {
    startTransition(async () => {
      await authClient.signIn.social({
        provider: "microsoft",
        callbackURL,
      });
    });
  }

  return (
    <Button
      size={size}
      variant={variant}
      className={cn(className)}
      onClick={handleMicrosoftSignIn}
      disabled={isBusy}
    >
      Get Started
    </Button>
  );
}
